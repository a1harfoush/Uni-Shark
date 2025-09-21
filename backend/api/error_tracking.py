# /backend/api/error_tracking.py
"""
API endpoints for error tracking and user error history
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from db.supabase_client import get_supabase_client
from utils.error_tracker import ErrorTracker
from core.auth import get_current_user_id
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/errors", tags=["Error Tracking"])

@router.get("/history")
async def get_error_history(
    limit: int = 50,
    user_id: str = Depends(get_current_user_id)
) -> Dict:
    """Get error history for the current user"""
    try:
        error_tracker = ErrorTracker(user_id)
        error_history = error_tracker.get_error_history(limit)
        
        # Get current status
        is_suspended = error_tracker.is_scraping_suspended()
        consecutive_failures = error_tracker._get_consecutive_failure_count()
        
        return {
            "error_history": error_history,
            "is_suspended": is_suspended,
            "consecutive_failures": consecutive_failures,
            "max_failures_before_suspension": error_tracker.max_consecutive_failures,
            "total_errors": len([e for e in error_history if e['error_type'] != 'success'])
        }
        
    except Exception as e:
        logger.error(f"Error fetching error history for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch error history")

@router.get("/summary")
async def get_error_summary(
    user_id: str = Depends(get_current_user_id)
) -> Dict:
    """Get error summary and current status for the user"""
    try:
        db = get_supabase_client()
        
        # Get error summary from the database view
        summary_response = db.rpc('get_user_error_summary', {'p_user_id': user_id}).execute()
        
        if not summary_response.data:
            return {
                "total_errors": 0,
                "recent_errors": 0,
                "is_suspended": False,
                "consecutive_failures": 0,
                "last_error_at": None,
                "error_types": []
            }
        
        summary = summary_response.data[0]
        
        # Get recent errors (last 24 hours)
        recent_errors_response = db.table('scraping_errors').select('id').eq(
            'user_id', user_id
        ).gte(
            'occurred_at', (datetime.now() - timedelta(hours=24)).isoformat()
        ).neq('error_type', 'success').execute()
        
        recent_errors_count = len(recent_errors_response.data) if recent_errors_response.data else 0
        
        # Check suspension status
        error_tracker = ErrorTracker(user_id)
        is_suspended = error_tracker.is_scraping_suspended()
        consecutive_failures = error_tracker._get_consecutive_failure_count()
        
        return {
            "total_errors": summary.get('actual_errors', 0),
            "recent_errors": recent_errors_count,
            "is_suspended": is_suspended,
            "consecutive_failures": consecutive_failures,
            "max_consecutive_failures": summary.get('max_consecutive_failures', 0),
            "last_error_at": summary.get('last_error_at'),
            "error_types": summary.get('error_types', [])
        }
        
    except Exception as e:
        logger.error(f"Error fetching error summary for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch error summary")

@router.post("/reset-suspension")
async def reset_suspension(
    user_id: str = Depends(get_current_user_id)
) -> Dict:
    """Reset scraping suspension for the user (manual override)"""
    try:
        db = get_supabase_client()
        
        # Re-enable auto scraping
        db.table('user_credentials').update({
            'is_automation_active': True,
            'scraping_suspended': False,
            'suspension_reason': None,
            'suspended_at': None
        }).eq('user_id', user_id).execute()
        
        # Log the reset action
        db.table('scraping_errors').insert({
            "user_id": user_id,
            "error_type": "manual_reset",
            "error_message": "Scraping suspension manually reset by user",
            "consecutive_failure_count": 0,
            "should_suspend_scraping": False,
            "occurred_at": datetime.now().isoformat()
        }).execute()
        
        logger.info(f"Scraping suspension reset for user {user_id}")
        
        return {
            "success": True,
            "message": "Scraping suspension has been reset. Auto-scraping is now enabled."
        }
        
    except Exception as e:
        logger.error(f"Error resetting suspension for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset suspension")

@router.get("/recent-logs")
async def get_recent_error_logs(
    hours: int = 24,
    user_id: str = Depends(get_current_user_id)
) -> Dict:
    """Get recent error logs for debugging"""
    try:
        db = get_supabase_client()
        
        since_time = datetime.now() - timedelta(hours=hours)
        
        response = db.table('scraping_errors').select(
            'error_type, error_message, occurred_at, consecutive_failure_count, additional_details'
        ).eq('user_id', user_id).gte(
            'occurred_at', since_time.isoformat()
        ).order('occurred_at', desc=True).execute()
        
        logs = response.data if response.data else []
        
        # Categorize logs
        errors = [log for log in logs if log['error_type'] != 'success']
        successes = [log for log in logs if log['error_type'] == 'success']
        
        return {
            "total_logs": len(logs),
            "errors": errors,
            "successes": successes,
            "time_range_hours": hours,
            "error_count": len(errors),
            "success_count": len(successes)
        }
        
    except Exception as e:
        logger.error(f"Error fetching recent logs for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch recent logs")

@router.get("/status")
async def get_scraping_status(
    user_id: str = Depends(get_current_user_id)
) -> Dict:
    """Get current scraping status and health check"""
    try:
        db = get_supabase_client()
        error_tracker = ErrorTracker(user_id)
        
        # Get user credentials and settings
        creds_response = db.table('user_credentials').select(
            'is_automation_active, scraping_suspended, suspension_reason, suspended_at'
        ).eq('user_id', user_id).single().execute()
        
        if not creds_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        creds = creds_response.data
        
        # Get last scrape attempt
        last_scrape_response = db.table('scrape_history').select(
            'status, scraped_at, log_message'
        ).eq('user_id', user_id).order('scraped_at', desc=True).limit(1).execute()
        
        last_scrape = last_scrape_response.data[0] if last_scrape_response.data else None
        
        # Get consecutive failure count
        consecutive_failures = error_tracker._get_consecutive_failure_count()
        
        # Determine overall status
        if creds['scraping_suspended']:
            status = "suspended"
            status_message = creds['suspension_reason'] or "Scraping suspended"
        elif not creds['is_automation_active']:
            status = "disabled"
            status_message = "Auto-scraping is disabled"
        elif consecutive_failures >= 3:
            status = "warning"
            status_message = f"Multiple failures detected ({consecutive_failures}/6)"
        elif last_scrape and last_scrape['status'] == 'success':
            status = "healthy"
            status_message = "Scraping is working normally"
        else:
            status = "unknown"
            status_message = "Status unknown - no recent scrape data"
        
        return {
            "status": status,
            "status_message": status_message,
            "is_automation_active": creds['is_automation_active'],
            "is_suspended": creds['scraping_suspended'],
            "consecutive_failures": consecutive_failures,
            "max_failures_before_suspension": error_tracker.max_consecutive_failures,
            "last_scrape": last_scrape,
            "suspended_at": creds['suspended_at'],
            "suspension_reason": creds['suspension_reason']
        }
        
    except Exception as e:
        logger.error(f"Error getting scraping status for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scraping status")