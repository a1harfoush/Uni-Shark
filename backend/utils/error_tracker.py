# /backend/utils/error_tracker.py
"""
Error tracking system for DULMS scraper with detailed error categorization
and automatic scraping suspension after consecutive failures.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Optional, List
from enum import Enum
from db.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

class ErrorType(Enum):
    """Categorized error types for better tracking and user understanding"""
    
    # Authentication Errors
    WRONG_CREDENTIALS = "wrong_credentials"
    WRONG_CAPTCHA = "wrong_captcha"
    CAPTCHA_ERROR = "captcha_error"  # CAPTCHA present but no valid API keys
    CAPTCHA_SERVICE_ERROR = "captcha_service_error"
    IP_BANNED = "ip_banned"
    NO_CAPTCHA_CREDIT = "no_captcha_credit"
    
    # Network/Connection Errors
    NETWORK_TIMEOUT = "network_timeout"
    CONNECTION_FAILED = "connection_failed"
    PAGE_LOAD_FAILED = "page_load_failed"
    
    # Browser/Driver Errors
    BROWSER_CRASHED = "browser_crashed"
    DRIVER_ERROR = "driver_error"
    SESSION_EXPIRED = "session_expired"
    
    # DULMS System Errors
    DULMS_MAINTENANCE = "dulms_maintenance"
    DULMS_OVERLOADED = "dulms_overloaded"
    UNEXPECTED_PAGE_STRUCTURE = "unexpected_page_structure"
    
    # General Errors
    UNKNOWN_ERROR = "unknown_error"
    SCRAPING_FAILED = "scraping_failed"

class ErrorTracker:
    """
    Tracks scraping errors, manages failure counts, and handles automatic
    scraping suspension after consecutive failures.
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.db = get_supabase_client()
        # Temporarily increased from 6 to 10 to prevent mass suspensions
        # while we improve error detection
        self.max_consecutive_failures = 10
    
    def log_error(self, error_type: ErrorType, error_message: str, 
                  additional_details: Optional[Dict] = None) -> bool:
        """
        Log an error and update failure count.
        Returns True if scraping should be suspended.
        """
        try:
            # Get current failure count
            current_count = self._get_consecutive_failure_count()
            new_count = current_count + 1
            
            # Determine if scraping should be suspended
            should_suspend = new_count >= self.max_consecutive_failures
            
            logger.info(f"Error tracking for user {self.user_id}: failure #{new_count}/{self.max_consecutive_failures}, suspend: {should_suspend}")
            
            # Log the error to database
            error_data = {
                "user_id": self.user_id,
                "error_type": error_type.value,
                "error_message": error_message,
                "additional_details": additional_details or {},
                "consecutive_failure_count": new_count,
                "should_suspend_scraping": should_suspend,
                "occurred_at": datetime.now(timezone.utc).isoformat()
            }
            
            try:
                self.db.table('scraping_errors').insert(error_data).execute()
            except Exception as db_error:
                # Handle case where table doesn't exist yet (before migration)
                if 'does not exist' in str(db_error) or '42P01' in str(db_error):
                    logger.warning(f"Scraping errors table not yet created. Error logged locally: {error_type.value}")
                    # Log to file as fallback
                    logger.error(f"SCRAPING_ERROR[{self.user_id}]: {error_type.value} - {error_message}")
                else:
                    raise db_error
            
            # Update user's scraping status if suspension is needed
            if should_suspend:
                self._suspend_auto_scraping()
                logger.warning(f"Auto-scraping suspended for user {self.user_id} after {new_count} consecutive failures")
            
            logger.info(f"Error logged for user {self.user_id}: {error_type.value} (failure #{new_count})")
            return should_suspend
            
        except Exception as e:
            logger.error(f"Failed to log error for user {self.user_id}: {e}")
            return False
    
    def log_success(self):
        """Log a successful scrape and reset failure count"""
        try:
            # Reset consecutive failure count
            self.db.table('scraping_errors').insert({
                "user_id": self.user_id,
                "error_type": "success",
                "error_message": "Scraping completed successfully",
                "consecutive_failure_count": 0,
                "should_suspend_scraping": False,
                "occurred_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            
            # Re-enable auto scraping if it was suspended
            self._enable_auto_scraping()
            
            logger.info(f"Success logged for user {self.user_id}, failure count reset")
            
        except Exception as e:
            logger.error(f"Failed to log success for user {self.user_id}: {e}")
    
    def _get_consecutive_failure_count(self) -> int:
        """Get the current consecutive failure count for the user"""
        try:
            # Get the most recent error log entry
            response = self.db.table('scraping_errors').select(
                'consecutive_failure_count, error_type'
            ).eq('user_id', self.user_id).order(
                'occurred_at', desc=True
            ).limit(1).execute()
            
            if not response.data:
                return 0
            
            latest_entry = response.data[0]
            
            # If the latest entry is a success, count is 0
            if latest_entry['error_type'] == 'success':
                return 0
            
            return latest_entry.get('consecutive_failure_count', 0)
            
        except Exception as e:
            logger.error(f"Failed to get failure count for user {self.user_id}: {e}")
            return 0
    
    def _suspend_auto_scraping(self):
        """Suspend automatic scraping for the user"""
        try:
            # Try to update with new columns first
            self.db.table('user_credentials').update({
                'is_automation_active': False,
                'scraping_suspended': True,
                'suspension_reason': f'Suspended after {self.max_consecutive_failures} consecutive failures',
                'suspended_at': datetime.now(timezone.utc).isoformat()
            }).eq('user_id', self.user_id).execute()
            
            logger.info(f"Auto-scraping suspended for user {self.user_id}")
            
        except Exception as e:
            # Handle case where columns don't exist yet (before migration)
            if 'does not exist' in str(e) or '42703' in str(e):
                logger.warning(f"Suspension columns not yet created. Only disabling automation for user {self.user_id}")
                # Fallback: just disable automation
                try:
                    self.db.table('user_credentials').update({
                        'is_automation_active': False
                    }).eq('user_id', self.user_id).execute()
                    logger.info(f"Auto-scraping disabled for user {self.user_id} (fallback mode)")
                except Exception as fallback_e:
                    logger.error(f"Failed to disable automation for user {self.user_id}: {fallback_e}")
            else:
                logger.error(f"Failed to suspend auto-scraping for user {self.user_id}: {e}")
    
    def _enable_auto_scraping(self):
        """Re-enable automatic scraping for the user"""
        try:
            # Check if scraping was suspended
            response = self.db.table('user_credentials').select(
                'scraping_suspended'
            ).eq('user_id', self.user_id).single().execute()
            
            if response.data and response.data.get('scraping_suspended'):
                self.db.table('user_credentials').update({
                    'is_automation_active': True,
                    'scraping_suspended': False,
                    'suspension_reason': None,
                    'suspended_at': None
                }).eq('user_id', self.user_id).execute()
                
                logger.info(f"Auto-scraping re-enabled for user {self.user_id}")
            
        except Exception as e:
            # Handle case where columns don't exist yet (before migration)
            if 'does not exist' in str(e) or '42703' in str(e):
                logger.warning(f"Suspension columns not yet created. Only enabling automation for user {self.user_id}")
                # Fallback: just enable automation
                try:
                    self.db.table('user_credentials').update({
                        'is_automation_active': True
                    }).eq('user_id', self.user_id).execute()
                    logger.info(f"Auto-scraping enabled for user {self.user_id} (fallback mode)")
                except Exception as fallback_e:
                    logger.error(f"Failed to enable automation for user {self.user_id}: {fallback_e}")
            else:
                logger.error(f"Failed to re-enable auto-scraping for user {self.user_id}: {e}")
    
    def get_error_history(self, limit: int = 50) -> List[Dict]:
        """Get error history for the user"""
        try:
            response = self.db.table('scraping_errors').select(
                '*'
            ).eq('user_id', self.user_id).order(
                'occurred_at', desc=True
            ).limit(limit).execute()
            
            return response.data or []
            
        except Exception as e:
            logger.error(f"Failed to get error history for user {self.user_id}: {e}")
            return []
    
    def is_scraping_suspended(self) -> bool:
        """Check if scraping is currently suspended for the user"""
        try:
            response = self.db.table('user_credentials').select(
                'scraping_suspended'
            ).eq('user_id', self.user_id).single().execute()
            
            return response.data and response.data.get('scraping_suspended', False)
            
        except Exception as e:
            # Handle case where columns don't exist yet (before migration)
            if 'does not exist' in str(e) or '42703' in str(e):
                logger.warning(f"Scraping suspension columns not yet created for user {self.user_id}. Run the database migration.")
                return False
            logger.error(f"Failed to check suspension status for user {self.user_id}: {e}")
            return False

def detect_error_type(error_message: str, page_source: str = "") -> ErrorType:
    """
    Analyze error message and page source to determine specific error type
    """
    error_lower = error_message.lower()
    page_lower = page_source.lower()
    
    # Authentication errors (most specific first)
    if "wrong captcha" in page_lower or ("errorlbl" in page_lower and "wrong captcha" in page_lower):
        return ErrorType.WRONG_CAPTCHA
    
    if "please enter correct username" in page_lower or ("invalid" in page_lower and "credentials" in error_lower):
        return ErrorType.WRONG_CREDENTIALS
    
    if "ip ban" in error_lower or "banned" in error_lower:
        return ErrorType.IP_BANNED
    
    if "no credit" in error_lower or "insufficient credit" in error_lower:
        return ErrorType.NO_CAPTCHA_CREDIT
    
    # CAPTCHA service errors (specific patterns)
    if ("nopecha" in error_lower and "failed" in error_lower) or ("freecaptchabypass" in error_lower and "failed" in error_lower):
        return ErrorType.CAPTCHA_SERVICE_ERROR
    
    if "captcha" in error_lower and ("failed" in error_lower or "error" in error_lower or "timeout" in error_lower):
        return ErrorType.CAPTCHA_SERVICE_ERROR
    
    # Network/Connection errors (specific patterns)
    if "timeout" in error_lower or "timed out" in error_lower:
        return ErrorType.NETWORK_TIMEOUT
    
    if "connection" in error_lower and ("failed" in error_lower or "refused" in error_lower or "reset" in error_lower):
        return ErrorType.CONNECTION_FAILED
    
    if ("page" in error_lower and ("load" in error_lower or "not found" in error_lower)) or "404" in error_lower:
        return ErrorType.PAGE_LOAD_FAILED
    
    # Browser/Driver errors (specific patterns)
    if "no such window" in error_lower or "target window already closed" in error_lower:
        return ErrorType.BROWSER_CRASHED
    
    if ("webdriver" in error_lower or "driver" in error_lower) and ("error" in error_lower or "failed" in error_lower):
        return ErrorType.DRIVER_ERROR
    
    if "session" in error_lower and ("invalid" in error_lower or "expired" in error_lower):
        return ErrorType.SESSION_EXPIRED
    
    # DULMS system errors (specific patterns)
    if "maintenance" in page_lower or "under maintenance" in page_lower:
        return ErrorType.DULMS_MAINTENANCE
    
    if "overloaded" in page_lower or "high traffic" in page_lower or "server busy" in page_lower:
        return ErrorType.DULMS_OVERLOADED
    
    if ("element not found" in error_lower and "selenium" in error_lower) or ("unexpected" in error_lower and "page" in error_lower):
        return ErrorType.UNEXPECTED_PAGE_STRUCTURE
    
    # More specific error patterns to avoid unknown errors
    if "login" in error_lower and ("failed" in error_lower or "error" in error_lower):
        return ErrorType.WRONG_CREDENTIALS
    
    if "scraping" in error_lower and "failed" in error_lower:
        return ErrorType.SCRAPING_FAILED
    
    # Only return UNKNOWN_ERROR for truly unrecognizable errors
    # Log the error for analysis
    logger.warning(f"Unrecognized error pattern - Error: '{error_message[:100]}', Page: '{page_source[:100] if page_source else 'N/A'}'")
    
    # For now, classify unrecognized errors as SCRAPING_FAILED instead of UNKNOWN_ERROR
    # This prevents mass suspensions while we improve error detection
    return ErrorType.SCRAPING_FAILED