# /backend/api/scheduler.py
from fastapi import APIRouter, Depends, HTTPException
from db.supabase_client import get_supabase_client
from supabase import Client
from tasks import queue_all_users_scrape, execute_scrape_task
from api.settings import get_current_clerk_id
import logging
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/test-scheduler")
def test_scheduler_endpoint(
    db: Client = Depends(get_supabase_client),
    clerk_user_id: str = Depends(get_current_clerk_id)
):
    """
    Test the scheduler logic by running it manually.
    This simulates what Celery Beat does without relying on the beat process.
    """
    try:
        logging.info(f"Manual scheduler test initiated by user {clerk_user_id}")
        
        # Run the scheduler task synchronously for testing
        # This calls the same logic that Celery Beat would call
        result = queue_all_users_scrape.apply()
        
        # Get some stats about what happened
        active_users_response = db.table('user_credentials').select('user_id, check_interval_hours').eq('is_automation_active', True).execute()
        active_users_count = len(active_users_response.data) if active_users_response.data else 0
        
        logging.info(f"Scheduler test completed for user {clerk_user_id}. Found {active_users_count} active users.")
        
        return {
            "message": "Scheduler test completed successfully",
            "task_id": result.id,
            "status": "completed",
            "active_users_found": active_users_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logging.error(f"Scheduler test failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Scheduler test failed: {str(e)}")

@router.post("/force-queue-all-users")
def force_queue_all_users(
    db: Client = Depends(get_supabase_client),
    clerk_user_id: str = Depends(get_current_clerk_id)
):
    """
    Force queue all users with active automation, regardless of their schedule.
    This is useful for testing the full automation pipeline.
    """
    try:
        logging.info(f"Force queue all users initiated by user {clerk_user_id}")
        
        # Get all users who have automation enabled
        active_users_response = db.table('user_credentials').select('user_id, check_interval_hours').eq('is_automation_active', True).execute()
        
        if not active_users_response.data:
            return {
                "message": "No users with active automation found",
                "queued_count": 0,
                "timestamp": datetime.now().isoformat()
            }
        
        queued_tasks = []
        for user_prefs in active_users_response.data:
            user_id = user_prefs['user_id']
            task = execute_scrape_task.apply_async(args=[user_id, 'background'], queue='background')
            queued_tasks.append({
                "user_id": user_id,
                "task_id": task.id
            })
            logging.info(f"Forced queue scrape task for user {user_id} with task ID {task.id}")
        
        return {
            "message": f"Successfully queued {len(queued_tasks)} scrape tasks",
            "queued_count": len(queued_tasks),
            "queued_tasks": queued_tasks,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logging.error(f"Force queue all users failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Force queue failed: {str(e)}")

@router.get("/scheduler-status")
def get_scheduler_status(
    db: Client = Depends(get_supabase_client),
    clerk_user_id: str = Depends(get_current_clerk_id)
):
    """
    Get detailed status about the scheduler and all users' automation settings.
    """
    try:
        # Get all users with automation settings
        all_users_response = db.table('user_credentials').select('user_id, is_automation_active, check_interval_hours').execute()
        
        if not all_users_response.data:
            return {
                "total_users": 0,
                "active_users": 0,
                "inactive_users": 0,
                "users_due_for_scrape": 0,
                "user_details": [],
                "timestamp": datetime.now().isoformat()
            }
        
        active_users = []
        inactive_users = []
        users_due = []
        
        for user_creds in all_users_response.data:
            user_id = user_creds['user_id']
            is_active = user_creds.get('is_automation_active', False)
            interval = user_creds.get('check_interval_hours', 4)
            
            # Get last scrape info
            last_scrape_response = db.table('scrape_history').select('scraped_at, status').eq('user_id', user_id).order('scraped_at', desc=True).limit(1).execute()
            last_scrape = last_scrape_response.data[0] if last_scrape_response.data else None
            
            user_info = {
                "user_id": user_id,
                "is_automation_active": is_active,
                "check_interval_hours": interval,
                "last_scrape": last_scrape,
                "next_scrape_due": None,
                "is_due_now": False
            }
            
            if is_active:
                active_users.append(user_info)
                
                # Calculate if user is due for scrape
                is_due = False
                if not last_scrape:
                    is_due = True
                else:
                    last_scraped_at = datetime.fromisoformat(last_scrape['scraped_at'])
                    next_due = last_scraped_at + timedelta(hours=interval)
                    user_info["next_scrape_due"] = next_due.isoformat()
                    if datetime.now(last_scraped_at.tzinfo) >= next_due:
                        is_due = True
                
                user_info["is_due_now"] = is_due
                if is_due:
                    users_due.append(user_info)
            else:
                inactive_users.append(user_info)
        
        return {
            "total_users": len(all_users_response.data),
            "active_users": len(active_users),
            "inactive_users": len(inactive_users),
            "users_due_for_scrape": len(users_due),
            "user_details": {
                "active": active_users,
                "inactive": inactive_users,
                "due_for_scrape": users_due
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logging.error(f"Get scheduler status failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get scheduler status: {str(e)}")