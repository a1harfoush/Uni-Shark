# /backend/models.py
from pydantic import BaseModel, EmailStr
from typing import Optional

class UserSettings(BaseModel):
    dulms_username: Optional[str] = None
    dulms_password: Optional[str] = None # Will receive plaintext, then we encrypt
    fcb_api_key: Optional[str] = None
    nopecha_api_key: Optional[str] = None
    discord_webhook: Optional[str] = None
    is_automation_active: Optional[bool] = False
    check_interval_hours: Optional[int] = 4
    deadline_reminder_hours: Optional[int] = 24
    deadline_notifications: Optional[bool] = False
    notify_via_telegram: Optional[bool] = False
    notify_via_email: Optional[bool] = False
    telegram_chat_id: Optional[str] = None

class User(BaseModel):
    clerk_user_id: str
    email: EmailStr