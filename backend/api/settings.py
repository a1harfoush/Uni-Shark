# /backend/api/settings.py
from fastapi import APIRouter, Depends, HTTPException, Header
from models import UserSettings
from db.supabase_client import get_supabase_client
from core.security import encrypt_password, decrypt_password
from supabase import Client
import requests
from jose import jwt, jwk
from jose.exceptions import JOSEError
from typing import Optional

router = APIRouter()

# --- Clerk JWT Verification ---
CLERK_JWKS_URL = "https://curious-boxer-5.clerk.accounts.dev/.well-known/jwks.json"
# Cache for the JWKS
jwks = None

async def get_current_clerk_id(authorization: Optional[str] = Header(None)) -> str:
    global jwks
    if authorization is None:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    # Check if authorization header has the correct format
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    
    try:
        parts = authorization.split(" ")
        if len(parts) != 2:
            raise HTTPException(status_code=401, detail="Invalid Authorization header format")
        token = parts[1]
        if not token:
            raise HTTPException(status_code=401, detail="Token is empty")
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
            # The issuer is your Clerk Frontend API URL
            issuer="https://curious-boxer-5.clerk.accounts.dev",
        )
        return claims["sub"]  # "sub" claim is the user_id
    except (JOSEError, IndexError, KeyError) as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


@router.get("/settings", response_model=UserSettings)
def get_user_settings(
    db: Client = Depends(get_supabase_client),
    clerk_user_id: str = Depends(get_current_clerk_id)
):
    # 1. Find our internal user ID from the clerk_user_id
    user_response = db.table('users').select('id').eq('clerk_user_id', clerk_user_id).execute()
    if not user_response.data:
        raise HTTPException(status_code=404, detail="User not found")
    user_id = user_response.data[0]['id']

    # 2. Fetch credentials using the internal user_id
    creds_response = db.table('user_credentials').select('*').eq('user_id', user_id).execute()
    if not creds_response.data:
        return UserSettings() # Return empty settings if none exist

    creds = creds_response.data[0]
    return UserSettings(
        dulms_username=creds.get('dulms_username'),
        # Decrypt password before sending back (or just send back placeholder)
        dulms_password="********" if creds.get('dulms_password_encrypted') else "",
        fcb_api_key=creds.get('fcb_api_key'),
        nopecha_api_key=creds.get('nopecha_api_key'),
        discord_webhook=creds.get('discord_webhook'),
        is_automation_active=creds.get('is_automation_active', False),
        check_interval_hours=creds.get('check_interval_hours', 4),
        deadline_reminder_hours=creds.get('deadline_reminder_hours', 24),
        deadline_notifications=creds.get('deadline_notifications', False),
        notify_via_telegram=creds.get('notify_via_telegram', False),
        notify_via_email=creds.get('notify_via_email', False),
        telegram_chat_id=creds.get('telegram_chat_id'),
    )

@router.post("/settings")
def update_user_settings(
    settings: UserSettings,
    db: Client = Depends(get_supabase_client),
    clerk_user_id: str = Depends(get_current_clerk_id)
):
    user_response = db.table('users').select('id').eq('clerk_user_id', clerk_user_id).execute()
    if not user_response.data:
        raise HTTPException(status_code=404, detail="User not found")
    user_id = user_response.data[0]['id']

    update_data = settings.dict(exclude_unset=True)
    
    # Handle password update with placeholder protection
    if 'dulms_password' in update_data and update_data['dulms_password']:
        # Do NOT update if it's just the placeholder - this prevents overwriting real passwords
        if update_data['dulms_password'] != "********":
            update_data['dulms_password_encrypted'] = encrypt_password(update_data.pop('dulms_password'))
        else:
            # Remove the placeholder from the update data
            del update_data['dulms_password']

    # Upsert ensures that if a record exists, it's updated; otherwise, it's created.
    # on_conflict='user_id' tells Supabase to use this column to identify a conflict
    # for the upsert operation, ensuring we update the existing record for that user.
    db.table('user_credentials').upsert({
        "user_id": user_id,
        **update_data
    }, on_conflict='user_id').execute()

    return {"message": "Settings updated successfully"}