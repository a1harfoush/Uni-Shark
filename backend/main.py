# /backend/main.py
from fastapi import FastAPI, Request, HTTPException, Depends
from api import settings, clerk_webhooks, dashboard, history, testing, scheduler, feedback
from models import User
from db.supabase_client import get_supabase_client
import logging
import os
from dotenv import load_dotenv
from utils.logging_config import configure_cairo_logging

# Load environment variables from .env file
load_dotenv()

# Configure logging
if os.getenv('ENVIRONMENT') == 'production':
    from config.logging import setup_production_logging
    logger = setup_production_logging()
else:
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    logger = logging.getLogger(__name__)

# Configure Cairo timezone for all logging
configure_cairo_logging()

app = FastAPI(title="DULMS Watcher API")

app.include_router(settings.router, prefix="/api", tags=["Settings"])
app.include_router(clerk_webhooks.router, prefix="/api", tags=["Clerk Webhooks"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(history.router, prefix="/api", tags=["History"])
app.include_router(testing.router, prefix="/api", tags=["Testing"])
app.include_router(scheduler.router, prefix="/api", tags=["Scheduler"])
app.include_router(feedback.router, prefix="/api", tags=["Feedback"])

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
from tasks import execute_scrape_task
from api.settings import get_current_clerk_id # Reuse the dependency

@app.post("/api/scrape/run-manual")
def run_manual_scrape(clerk_user_id: str = Depends(get_current_clerk_id)):
    """Initiates a manual scrape task for the authenticated user."""
    db = get_supabase_client()
    try:
        user_response = db.table('users').select('id').eq('clerk_user_id', clerk_user_id).single().execute()
        if not user_response.data:
            logger.warning(f"Manual scrape trigger failed: Clerk user ID '{clerk_user_id}' not found.")
            raise HTTPException(status_code=404, detail="User not found")
        
        user_id = user_response.data['id']
        task = execute_scrape_task.apply_async(args=[user_id, 'manual'], queue='manual')
        
        logger.info(f"Manual scrape task '{task.id}' initiated for user_id '{user_id}' (clerk_id: {clerk_user_id}).")
        
        return {"message": "Scrape task initiated.", "task_id": task.id}
    except Exception as e:
        logger.error(f"Error initiating manual scrape for clerk_id {clerk_user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to initiate scrape task.")

@app.get("/api/scrape/task-status/{task_id}")
def get_task_status(task_id: str, clerk_user_id: str = Depends(get_current_clerk_id)):
    from celery_app import celery_app
    task = celery_app.AsyncResult(task_id)
    
    return {
        "task_id": task_id,
        "status": task.status,  # PENDING, STARTED, SUCCESS, FAILURE, RETRY, REVOKED
        "result": task.result if task.ready() else None,
        "info": task.info
    }