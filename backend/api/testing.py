# /backend/api/testing.py
from fastapi import APIRouter, Depends, HTTPException, Header
from db.supabase_client import get_supabase_client
from supabase import Client
import requests
from jose import jwt, jwk
from jose.exceptions import JOSEError
from typing import Optional
from tasks import queue_all_users_scrape, execute_scrape_task
import logging

router = APIRouter()

# --- Clerk JWT Verification (reused from settings.py) ---
CLERK_JWKS_URL = "https://curious-boxer-5.clerk.accounts.dev/.well-known/jwks.json"
jwks = None

async def get_current_clerk_id(authorization: Optional[str] = Header(None)) -> str:
    global jwks
    if authorization is None:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    try:
        token = authorization.split(" ")[1]
    except IndexError:
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")

    if jwks is None:
        jwks = requests.get(CLERK_JWKS_URL).json()

    try:
        header = jwt.get_unverified_header(token)
        key = [k for k in jwks["keys"] if k["kid"] == header["kid"]][0]
        
        claims = jwt.decode(
            token,
            key,
            algorithms=[header["alg"]],
            issuer="https://curious-boxer-5.clerk.accounts.dev",
        )
        return claims["sub"]
    except (JOSEError, IndexError, KeyError) as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

@router.post("/test-scheduler")
def test_scheduler(
    db: Client = Depends(get_supabase_client),
    clerk_user_id: str = Depends(get_current_clerk_id)
):
    """
    Test the scheduler logic by running it manually.
    This will check which users are due for scraping and queue tasks accordingly.
    """
    try:
        # Run the scheduler task synchronously for testing
        result = queue_all_users_scrape.apply()
        logging.info(f"Scheduler test completed for user {clerk_user_id}")
        
        return {
            "message": "Scheduler test completed successfully",
            "task_id": result.id,
            "status": "completed"
        }
    except Exception as e:
        logging.error(f"Scheduler test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Scheduler test failed: {str(e)}")

@router.post("/test-scrape")
def test_immediate_scrape(
    db: Client = Depends(get_supabase_client),
    clerk_user_id: str = Depends(get_current_clerk_id)
):
    """
    Queue an immediate scrape task for the current user for testing purposes.
    """
    try:
        # Find the internal user ID
        user_response = db.table('users').select('id').eq('clerk_user_id', clerk_user_id).execute()
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = user_response.data[0]['id']
        
        # Queue the scrape task (testing uses manual queue)
        task = execute_scrape_task.apply_async(args=[user_id, 'manual'], queue='manual')
        logging.info(f"Test scrape queued for user {user_id} with task ID {task.id}")
        
        return {
            "message": f"Scrape task queued successfully for user {user_id}",
            "task_id": task.id,
            "status": "queued"
        }
    except Exception as e:
        logging.error(f"Test scrape failed: {e}")
        raise HTTPException(status_code=500, detail=f"Test scrape failed: {str(e)}")

@router.get("/automation-status")
def get_automation_status(
    db: Client = Depends(get_supabase_client),
    clerk_user_id: str = Depends(get_current_clerk_id)
):
    """
    Get detailed automation status for the current user.
    """
    try:
        # Find the internal user ID
        user_response = db.table('users').select('id').eq('clerk_user_id', clerk_user_id).execute()
        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = user_response.data[0]['id']
        
        # Get user's automation settings
        creds_response = db.table('user_credentials').select('is_automation_active, check_interval_hours').eq('user_id', user_id).execute()
        if not creds_response.data:
            return {
                "user_id": user_id,
                "automation_active": False,
                "check_interval_hours": 4,
                "last_scrape": None,
                "next_scrape_due": None
            }
        
        creds = creds_response.data[0]
        
        # Get last scrape info
        last_scrape_response = db.table('scrape_history').select('scraped_at, status').eq('user_id', user_id).order('scraped_at', desc=True).limit(1).execute()
        last_scrape = last_scrape_response.data[0] if last_scrape_response.data else None
        
        # Calculate next scrape time if automation is active
        next_scrape_due = None
        if creds.get('is_automation_active') and last_scrape:
            from datetime import datetime, timedelta
            last_scraped_at = datetime.fromisoformat(last_scrape['scraped_at'])
            next_scrape_due = last_scraped_at + timedelta(hours=creds.get('check_interval_hours', 4))
            next_scrape_due = next_scrape_due.isoformat()
        
        return {
            "user_id": user_id,
            "automation_active": creds.get('is_automation_active', False),
            "check_interval_hours": creds.get('check_interval_hours', 4),
            "last_scrape": last_scrape,
            "next_scrape_due": next_scrape_due
        }
    except Exception as e:
        logging.error(f"Get automation status failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get automation status: {str(e)}")