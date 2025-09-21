# /backend/core/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY")
    CLERK_WEBHOOK_SIGNING_SECRET: str = os.getenv("CLERK_WEBHOOK_SIGNING_SECRET")

settings = Settings()