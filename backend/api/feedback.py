# /backend/api/feedback.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import requests
import json
import os
from dotenv import load_dotenv
from .settings import get_current_clerk_id

# Load environment variables
load_dotenv()

class FeedbackRequest(BaseModel):
    feedback_type: str
    message: str
    page_url: str
    user_agent: str
    timestamp: str

router = APIRouter()

@router.get("/feedback/test")
async def test_discord_webhook():
    """Test endpoint to verify Discord webhook configuration"""
    discord_webhook_url = os.getenv("DISCORD_FEEDBACK_WEBHOOK_URL")
    
    # Debug: Print what we're getting
    print(f"DEBUG: Environment variable value: '{discord_webhook_url}'")
    print(f"DEBUG: All environment variables containing 'DISCORD': {[k for k in os.environ.keys() if 'DISCORD' in k]}")
    
    if not discord_webhook_url or discord_webhook_url == "YOUR_DISCORD_FEEDBACK_WEBHOOK_URL_HERE":
        return {
            "status": "error",
            "message": "Discord webhook URL not configured",
            "webhook_configured": False
        }
    
    try:
        # Send a simple test message
        test_payload = {
            "content": "🦈 **Discord Webhook Test** - DULMS Watcher feedback system is working!",
            "embeds": [{
                "title": "Test Message",
                "description": "If you see this, the webhook is configured correctly!",
                "color": 0x89DDFF,
                "timestamp": datetime.now().isoformat()
            }]
        }
        
        response = requests.post(
            discord_webhook_url,
            json=test_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 204:
            return {
                "status": "success",
                "message": "Test message sent to Discord successfully!",
                "webhook_configured": True
            }
        else:
            return {
                "status": "error",
                "message": f"Discord returned status {response.status_code}: {response.text}",
                "webhook_configured": True
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to send test message: {str(e)}",
            "webhook_configured": True
        }

@router.post("/feedback")
async def submit_feedback(
    feedback: FeedbackRequest,
    clerk_user_id: str = Depends(get_current_clerk_id)
):
    """
    Submit user feedback and send it to Discord webhook for immediate notification
    """
    # Always log the feedback for debugging
    print(f"=== FEEDBACK RECEIVED ===")
    print(f"Type: {feedback.feedback_type}")
    print(f"User: {clerk_user_id}")
    print(f"Page: {feedback.page_url}")
    print(f"Message: {feedback.message}")
    print(f"========================")
    
    try:
        # Get Discord webhook URL from environment
        discord_webhook_url = os.getenv("DISCORD_FEEDBACK_WEBHOOK_URL")
        
        print(f"Discord webhook URL configured: {'Yes' if discord_webhook_url else 'No'}")
        
        if not discord_webhook_url or discord_webhook_url == "YOUR_DISCORD_FEEDBACK_WEBHOOK_URL_HERE":
            print("⚠️  Discord webhook not configured properly")
            return {"status": "success", "message": "Feedback received (logged to console)"}
        
        # Format the Discord message
        embed_color = {
            "Bug Report": 0xFF6B6B,      # Red
            "Feature Suggestion": 0x51CF66,  # Green  
            "General Question": 0x89DDFF,    # Blue
            "Performance Issue": 0xFFD93D    # Yellow
        }.get(feedback.feedback_type, 0x89DDFF)
        
        # Create Discord embed with simpler format
        discord_payload = {
            "content": f"🦈 **New {feedback.feedback_type}** from user `{clerk_user_id}`",
            "embeds": [{
                "title": f"{feedback.feedback_type}",
                "description": feedback.message,
                "color": embed_color,
                "fields": [
                    {
                        "name": "User ID",
                        "value": clerk_user_id,
                        "inline": True
                    },
                    {
                        "name": "Page",
                        "value": feedback.page_url,
                        "inline": True
                    },
                    {
                        "name": "Browser",
                        "value": feedback.user_agent[:50] + "..." if len(feedback.user_agent) > 50 else feedback.user_agent,
                        "inline": False
                    }
                ],
                "timestamp": feedback.timestamp
            }]
        }
        
        print(f"Sending to Discord webhook...")
        
        # Send to Discord with timeout
        response = requests.post(
            discord_webhook_url,
            json=discord_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Discord response: {response.status_code}")
        
        if response.status_code == 204:
            print("✅ Successfully sent to Discord")
            return {"status": "success", "message": "Feedback submitted successfully"}
        else:
            print(f"❌ Discord webhook failed: {response.status_code}")
            print(f"Response: {response.text}")
            return {"status": "success", "message": "Feedback received (Discord failed)"}
            
    except requests.exceptions.Timeout:
        print("❌ Discord webhook timeout")
        return {"status": "success", "message": "Feedback received (timeout)"}
    except requests.exceptions.RequestException as e:
        print(f"❌ Discord webhook request error: {str(e)}")
        return {"status": "success", "message": "Feedback received (request error)"}
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return {"status": "success", "message": "Feedback received (error)"}