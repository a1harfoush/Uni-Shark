from fastapi import APIRouter, Request, HTTPException
from svix.webhooks import Webhook, WebhookVerificationError
from core.config import settings
from dotenv import load_dotenv
import logging

load_dotenv()
from db.supabase_client import get_supabase_client
from models import User

router = APIRouter()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@router.get("/clerk/webhook/test")
async def test_webhook():
    """Test endpoint to verify webhook is accessible"""
    return {"status": "webhook endpoint is accessible", "timestamp": "2024-01-01"}

@router.post("/clerk/webhook/test")
async def test_webhook_post():
    """Test POST endpoint for webhook testing"""
    return {"status": "webhook POST endpoint is accessible", "timestamp": "2024-01-01"}

@router.post("/clerk/webhook")
async def clerk_webhook(request: Request):
    try:
        headers = request.headers
        payload = await request.body()
        
        logger.info(f"Received webhook with headers: {dict(headers)}")
        
        svix_id = headers.get("svix-id")
        svix_timestamp = headers.get("svix-timestamp")
        svix_signature = headers.get("svix-signature")

        if not svix_id or not svix_timestamp or not svix_signature:
            logger.error("Missing Svix headers")
            raise HTTPException(status_code=400, detail="Missing Svix headers")

        wh = Webhook(settings.CLERK_WEBHOOK_SIGNING_SECRET)
        try:
            evt = wh.verify(payload, headers)
            logger.info(f"Webhook verified successfully. Event type: {evt.get('type')}")
        except WebhookVerificationError as e:
            logger.error(f"Webhook verification failed: {e}")
            raise HTTPException(status_code=400, detail=f"Error verifying webhook: {e}")

        event_type = evt.get("type")
        data = evt.get("data")

        if event_type == "user.created":
            try:
                clerk_user_id = data.get("id")
                email_addresses = data.get("email_addresses", [])
                
                if not email_addresses:
                    logger.error("No email addresses found in user data")
                    # Use placeholder email if none provided
                    email = f"{clerk_user_id}@placeholder.unishark.site"
                else:
                    email = email_addresses[0].get("email_address")
                
                logger.info(f"Creating user with Clerk ID: {clerk_user_id}, Email: {email}")

                db = get_supabase_client()
                
                # Check if user already exists
                existing_user = db.table('users').select('*').eq('clerk_user_id', clerk_user_id).execute()
                if existing_user.data:
                    logger.info(f"User {email} already exists in database")
                    return {"status": "success", "message": "User already exists"}
                
                # Insert new user
                new_user_data = {
                    'clerk_user_id': clerk_user_id,
                    'email': email
                }
                result = db.table('users').insert(new_user_data).execute()
                logger.info(f"User {email} successfully created in database: {result.data}")
                
            except Exception as e:
                logger.error(f"Error creating user in database: {e}")
                raise HTTPException(status_code=500, detail=f"Database error: {e}")
        elif event_type == "email.created":
            # Handle email verification events - we can extract user info from these too
            logger.info(f"Email event received - this might contain user info we can use")
            # For now, just acknowledge the event
            return {"status": "success", "message": "Email event acknowledged"}
        elif event_type == "user.updated":
            # Handle user updates (like email verification)
            try:
                clerk_user_id = data.get("id")
                email_addresses = data.get("email_addresses", [])
                
                if email_addresses:
                    email = email_addresses[0].get("email_address")
                    logger.info(f"Updating user {clerk_user_id} with email: {email}")
                    
                    db = get_supabase_client()
                    # Update existing user or create if doesn't exist
                    existing_user = db.table('users').select('*').eq('clerk_user_id', clerk_user_id).execute()
                    if existing_user.data:
                        # Update existing user
                        db.table('users').update({'email': email}).eq('clerk_user_id', clerk_user_id).execute()
                        logger.info(f"Updated user {clerk_user_id} email to {email}")
                    else:
                        # Create new user
                        new_user_data = {
                            'clerk_user_id': clerk_user_id,
                            'email': email
                        }
                        result = db.table('users').insert(new_user_data).execute()
                        logger.info(f"Created user {clerk_user_id} with email {email}")
                
                return {"status": "success", "message": "User updated"}
            except Exception as e:
                logger.error(f"Error updating user: {e}")
                return {"status": "error", "message": str(e)}
        else:
            logger.info(f"Unhandled event type: {event_type}")

        return {"status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")