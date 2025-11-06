# /backend/core/auth.py
from fastapi import Depends, HTTPException, Header
from db.supabase_client import get_supabase_client
from supabase import Client
import requests
from jose import jwt, jwk
from jose.exceptions import JOSEError
from typing import Optional

# --- Clerk JWT Verification ---
CLERK_JWKS_URL = "https://clerk.unishark.site/.well-known/jwks.json"
# Cache for the JWKS
jwks = None

async def get_current_clerk_id(authorization: Optional[str] = Header(None)) -> str:
    """Extract and validate Clerk user ID from JWT token"""
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
            issuer="https://clerk.unishark.site",
        )
        return claims["sub"]  # "sub" claim is the user_id
    except (JOSEError, IndexError, KeyError) as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

async def get_current_user_id(clerk_user_id: str = Depends(get_current_clerk_id)) -> str:
    """Get internal user ID from Clerk user ID"""
    db = get_supabase_client()
    
    # Find the internal user ID from the clerk_user_id
    user_response = db.table('users').select('id').eq('clerk_user_id', clerk_user_id).execute()
    if not user_response.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_response.data[0]['id']