# /backend/core/security.py
from cryptography.fernet import Fernet
from core.config import settings

# Ensure your SECRET_KEY is properly encoded for Fernet
# It must be a 32-byte URL-safe base64-encoded key
# You can generate one with: from cryptography.fernet import Fernet; Fernet.generate_key()
# For this implementation, we will derive a key from your SECRET_KEY
import base64
from hashlib import sha256

key = base64.urlsafe_b64encode(sha256(settings.SECRET_KEY.encode()).digest())
fernet = Fernet(key)

def encrypt_password(password: str) -> str:
    if not password:
        return None
    return fernet.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    if not encrypted_password:
        return None
    return fernet.decrypt(encrypted_password.encode()).decode()