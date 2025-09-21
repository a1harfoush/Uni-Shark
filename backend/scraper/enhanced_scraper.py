# /backend/scraper/enhanced_scraper.py
"""
Enhanced scraper with comprehensive error tracking and user notifications
"""

import logging
import traceback
import time
from typing import Dict, Optional
from scraper.scraper_logic import (
    initialize_driver, login, navigate_to_page, scrape_quizzes, 
    scrape_assignments, scrape_absence_data, scrape_course_registration_data,
    QUIZZES_URL, ASSIGNMENTS_URL, ABSENCE_URL, COURSE_REG_URL
)
from selenium.webdriver.common.by import By
from utils.error_tracker import ErrorTracker, ErrorType, detect_error_type
from notifications.unified_notifier import UnifiedNotifier

logger = logging.getLogger(__name__)

class EnhancedScraper:
    """Enhanced scraper with error tracking and user notifications"""
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.error_tracker = ErrorTracker(user_id)
        self.notifier = UnifiedNotifier(user_id)
    
    def run_scrape_with_error_tracking(self, username: str, password: str, 
                                     fcb_api_key: str, nopecha_api_key: str) -> Dict:
        """
        Enhanced scraper with comprehensive error tracking and notifications
        """
        logger.info(f"--- Starting enhanced scrape for user {username} (ID: {self.user_id}) ---")
        
        # Check if scraping is suspended
        if self.error_tracker.is_scraping_suspended():
            logger.warning(f"Scraping is suspended for user {self.user_id}")
            return {
                "status": "suspended", 
                "error": "Scraping suspended due to consecutive failures",
                "user_id": self.user_id
            }
        
        driver = None
        scraped_data = {"quizzes": {}, "assignments": {}, "absences": {}, "course_registration": {}}
        
        try:
            # Initialize driver with enhanced error detection
            driver = self._initialize_driver_with_tracking()
            
            # Perform login with enhanced error detection
            self._login_with_tracking(driver, username, password, fcb_api_key, nopecha_api_key)
            
            # Scrape all pages
            self._scrape_all_pages_with_tracking(driver, scraped_data)
            
            # Log success and reset failure count
            self.error_tracker.log_success()
            
            logger.info(f"Enhanced scrape completed successfully for user {username}")
            return {"status": "success", "data": scraped_data, "user_id": self.user_id}
            
        except Exception as e:
            # Add safety check to prevent mass suspensions
            error_msg = str(e)
            if "unknown error" in error_msg.lower() or len(error_msg.strip()) < 10:
                logger.warning(f"Vague error detected for user {self.user_id}: '{error_msg}'. Not tracking to prevent false suspensions.")
                # Return failure without error tracking for vague errors
                return {
                    "status": "failed", 
                    "error": error_msg, 
                    "user_id": self.user_id,
                    "error_tracking_skipped": True
                }
            
            return self._handle_scraping_error(e, driver)
        
        finally:
            self._cleanup_driver(driver)
    
    def _initialize_driver_with_tracking(self):
        """Initialize driver with error tracking"""
        max_attempts = 2
        
        for attempt in range(max_attempts):
            try:
                driver = initialize_driver(headless=True)
                logger.info("Driver initialized successfully")
                return driver
                
            except Exception as e:
                error_msg = f"Driver initialization attempt {attempt + 1} failed: {e}"
                logger.error(error_msg)
                
                if attempt == max_attempts - 1:
                    # This is the final attempt, track the error
                    error_type = ErrorType.DRIVER_ERROR
                    should_suspend = self.error_tracker.log_error(
                        error_type, error_msg, {"attempt": attempt + 1}
                    )
                    
                    if should_suspend:
                        self._send_suspension_notification()
                    
                    raise Exception(f"Failed to initialize driver after {max_attempts} attempts")
                
                time.sleep(10)
    
    def _login_with_tracking(self, driver, username: str, password: str, 
                           fcb_api_key: str, nopecha_api_key: str):
        """Login with enhanced error detection and tracking"""
        try:
            login(driver, username, password, fcb_api_key, nopecha_api_key)
            
            # Validate session after login
            try:
                current_url = driver.current_url
                logger.info(f"Login successful, current URL: {current_url}")
            except Exception as e:
                raise Exception(f"Session validation failed after login: {e}")
                
        except Exception as e:
            # Analyze the error and page source for specific error types
            error_msg = str(e)
            page_source = ""
            
            try:
                page_source = driver.page_source if driver else ""
            except:
                pass
            
            # Detect specific error type
            error_type = detect_error_type(error_msg, page_source)
            
            # Add additional context based on error type
            additional_details = {
                "username": username,
                "has_fcb_key": bool(fcb_api_key),
                "has_nopecha_key": bool(nopecha_api_key),
                "page_contains_error": self._check_page_for_errors(page_source)
            }
            
            # Log the error
            should_suspend = self.error_tracker.log_error(
                error_type, error_msg, additional_details
            )
            
            # Send notifications
            self._send_error_notification(error_type, error_msg)
            
            if should_suspend:
                self._send_suspension_notification()
            
            raise  # Re-raise the original exception
    
    def _scrape_all_pages_with_tracking(self, driver, scraped_data: Dict):
        """Scrape all pages with individual error tracking"""
        page_map = {
            "quizzes": (QUIZZES_URL, (By.CSS_SELECTOR, "section.course-item"), scrape_quizzes),
            "assignments": (ASSIGNMENTS_URL, (By.CSS_SELECTOR, "section.course-item"), scrape_assignments),
            "absences": (ABSENCE_URL, (By.CSS_SELECTOR, "div.panel-group.course-grp"), scrape_absence_data),
            "course_registration": (COURSE_REG_URL, (By.ID, "courses-items"), scrape_course_registration_data)
        }
        
        for key, (url, wait_selector, scrape_func) in page_map.items():
            try:
                # Validate session before each page
                try:
                    driver.current_url  # Simple session check
                except Exception as session_error:
                    error_msg = f"Session invalid before scraping {key}: {session_error}"
                    logger.error(error_msg)
                    
                    # Log session error
                    self.error_tracker.log_error(
                        ErrorType.SESSION_EXPIRED, error_msg, {"page": key}
                    )
                    
                    raise Exception(error_msg)
                
                logger.info(f"Starting {key} scraping...")
                
                if navigate_to_page(driver, url, wait_selector):
                    scraped_data[key] = scrape_func(driver)
                    logger.info(f"Successfully scraped {key}")
                else:
                    error_msg = f"Failed to navigate to {key} page"
                    logger.warning(error_msg)
                    scraped_data[key] = {"error": error_msg}
                    
                    # Log navigation error (but don't count as critical failure)
                    self.error_tracker.log_error(
                        ErrorType.PAGE_LOAD_FAILED, error_msg, 
                        {"page": key, "url": url, "critical": False}
                    )
                    
            except Exception as e:
                error_msg = f"Error scraping {key}: {e}"
                logger.error(error_msg, exc_info=True)
                scraped_data[key] = {"error": error_msg}
                
                # Check if it's a session-related error
                if "invalid session id" in str(e).lower() or "session" in str(e).lower():
                    logger.error("Session-related error detected, aborting remaining scrapes")
                    
                    # Log session error and break
                    self.error_tracker.log_error(
                        ErrorType.SESSION_EXPIRED, error_msg, {"page": key}
                    )
                    break
    
    def _handle_scraping_error(self, error: Exception, driver) -> Dict:
        """Handle and track scraping errors"""
        error_msg = str(error)
        page_source = ""
        
        try:
            page_source = driver.page_source if driver else ""
        except:
            pass
        
        # Detect error type
        error_type = detect_error_type(error_msg, page_source)
        
        # Additional error context
        additional_details = {
            "traceback": traceback.format_exc(),
            "page_contains_error": self._check_page_for_errors(page_source)
        }
        
        # Log the error
        should_suspend = self.error_tracker.log_error(
            error_type, error_msg, additional_details
        )
        
        # Send error notification
        self._send_error_notification(error_type, error_msg)
        
        # Send suspension notification if needed
        if should_suspend:
            self._send_suspension_notification()
        
        logger.critical(f"Critical error during scraping for user {self.user_id}: {error}", exc_info=True)
        
        return {
            "status": "failed", 
            "error": error_msg, 
            "error_type": error_type.value,
            "suspended": should_suspend,
            "user_id": self.user_id,
            "trace": traceback.format_exc()
        }
    
    def _check_page_for_errors(self, page_source: str) -> Dict:
        """Check page source for specific error indicators"""
        page_lower = page_source.lower()
        
        errors_found = {}
        
        # Check for login errors
        if 'wrong captcha' in page_lower:
            errors_found['wrong_captcha'] = True
        
        if 'please enter correct username' in page_lower:
            errors_found['wrong_credentials'] = True
        
        if 'maintenance' in page_lower:
            errors_found['maintenance_mode'] = True
        
        if 'overloaded' in page_lower or 'high traffic' in page_lower:
            errors_found['server_overloaded'] = True
        
        return errors_found
    
    def _send_error_notification(self, error_type: ErrorType, error_message: str):
        """Send error notification to user"""
        try:
            # Get user-friendly error message
            friendly_message = self._get_friendly_error_message(error_type, error_message)
            
            # Send notification through unified notifier
            self.notifier.send_error_notification(error_type, friendly_message)
            
        except Exception as e:
            logger.error(f"Failed to send error notification for user {self.user_id}: {e}")
    
    def _send_suspension_notification(self):
        """Send suspension notification to user"""
        try:
            self.notifier.send_suspension_notification()
        except Exception as e:
            logger.error(f"Failed to send suspension notification for user {self.user_id}: {e}")
    
    def _get_friendly_error_message(self, error_type: ErrorType, error_message: str) -> str:
        """Convert technical error to user-friendly message"""
        friendly_messages = {
            ErrorType.WRONG_CREDENTIALS: "Your DULMS username or password appears to be incorrect. Please check your credentials in settings.",
            ErrorType.WRONG_CAPTCHA: "CAPTCHA verification failed. This might be due to CAPTCHA service issues or poor image quality.",
            ErrorType.IP_BANNED: "Your IP address appears to be temporarily banned. Please try again later or contact support.",
            ErrorType.NO_CAPTCHA_CREDIT: "Your CAPTCHA service has run out of credits. Please top up your account or check your API keys.",
            ErrorType.CAPTCHA_SERVICE_ERROR: "CAPTCHA solving service is experiencing issues. Please check your API keys or try again later.",
            ErrorType.NETWORK_TIMEOUT: "Network connection timed out. Please check your internet connection.",
            ErrorType.CONNECTION_FAILED: "Failed to connect to DULMS. The server might be down or experiencing issues.",
            ErrorType.PAGE_LOAD_FAILED: "Failed to load DULMS page. The website might be experiencing issues.",
            ErrorType.BROWSER_CRASHED: "Browser crashed during scraping. This is usually a temporary issue.",
            ErrorType.DRIVER_ERROR: "Browser driver encountered an error. Please try again later.",
            ErrorType.SESSION_EXPIRED: "Login session expired during scraping. Will retry on next scheduled run.",
            ErrorType.DULMS_MAINTENANCE: "DULMS is currently under maintenance. Scraping will resume automatically when available.",
            ErrorType.DULMS_OVERLOADED: "DULMS server is overloaded. Will retry later when traffic is lower.",
            ErrorType.UNEXPECTED_PAGE_STRUCTURE: "DULMS page structure has changed. Our team has been notified for updates.",
            ErrorType.UNKNOWN_ERROR: "An unexpected error occurred. Our team has been notified."
        }
        
        return friendly_messages.get(error_type, f"An error occurred: {error_message}")
    
    def _cleanup_driver(self, driver):
        """Enhanced driver cleanup"""
        if driver:
            try:
                # Close all windows
                for handle in driver.window_handles:
                    driver.switch_to.window(handle)
                    driver.close()
            except Exception as cleanup_error:
                logger.warning(f"Error during window cleanup: {cleanup_error}")
            
            try:
                driver.quit()
                logger.info("Driver successfully quit")
            except Exception as quit_error:
                logger.warning(f"Error during driver quit: {quit_error}")

def run_enhanced_scrape_for_user(user_id: str, username: str, password: str, 
                                fcb_api_key: str, nopecha_api_key: str) -> Dict:
    """
    Main function to run enhanced scraping with error tracking
    """
    scraper = EnhancedScraper(user_id)
    return scraper.run_scrape_with_error_tracking(username, password, fcb_api_key, nopecha_api_key)