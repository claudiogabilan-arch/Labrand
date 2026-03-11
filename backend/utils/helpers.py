"""
LaBrand - Utility/Helper Functions
"""
from fastapi import HTTPException, Request
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import os
import logging
import resend

from config import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, AI_CREDIT_COSTS

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Resend configuration
resend.api_key = os.environ.get("RESEND_API_KEY")


def create_jwt_token(user_id: str, email: str, role: str) -> str:
    """Create JWT token for authentication"""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_jwt_token(token: str) -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


async def get_current_user(request: Request) -> dict:
    """Get current authenticated user from request"""
    # Check cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
    
    # Check Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        # Check if it's a session token
        session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
        # Check if it's a JWT token
        try:
            payload = verify_jwt_token(token)
            user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
            if user:
                return user
        except:
            pass
    
    raise HTTPException(status_code=401, detail="Não autenticado")


async def send_email(to: str, subject: str, html: str) -> bool:
    """Send email via Resend"""
    try:
        api_key = os.environ.get("RESEND_API_KEY")
        if not api_key:
            logging.error("RESEND_API_KEY nao configurado")
            return False
        resend.api_key = api_key
        params = {
            "from": "LABrand <noreply@labrand.com.br>",
            "to": [to],
            "subject": subject,
            "html": html
        }
        result = resend.Emails.send(params)
        logging.info(f"Email enviado para {to}: {result}")
        return True
    except Exception as e:
        logging.error(f"Erro ao enviar email para {to}: {e}")
        return False


async def call_llm(system_prompt: str, user_prompt: str) -> str:
    """Helper function to call LLM using emergentintegrations"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import uuid
    
    chat = LlmChat(
        api_key=os.environ.get("EMERGENT_LLM_KEY"),
        session_id=str(uuid.uuid4()),
        system_message=system_prompt
    )
    chat = chat.with_model('google', 'gemini/gemini-2.0-flash')
    user_msg = UserMessage(text=user_prompt)
    response = await chat.send_message(user_msg)
    return response.text if hasattr(response, 'text') else str(response)


async def deduct_ai_credits(user_id: str, action: str, amount: int = None):
    """Deduct AI credits for an action"""
    cost = amount or AI_CREDIT_COSTS.get(action, 1)
    
    # Initialize credits for new users if not exists
    credits_data = await db.ai_credits.find_one({"user_id": user_id})
    if not credits_data:
        credits_data = {
            "user_id": user_id,
            "total_credits": 50,
            "used_credits": 0,
            "available_credits": 50,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.ai_credits.insert_one(credits_data)
    
    if credits_data.get("available_credits", 0) < cost:
        return False, "Créditos insuficientes. Adquira mais créditos em Configurações > Créditos IA."
    
    # Deduct credits
    await db.ai_credits.update_one(
        {"user_id": user_id},
        {
            "$inc": {"used_credits": cost, "available_credits": -cost},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Record history
    await db.ai_credits_history.insert_one({
        "user_id": user_id,
        "action": action,
        "credits": -cost,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return True, cost


async def add_ai_credits(user_id: str, credits: int, reason: str):
    """Add AI credits to user account"""
    await db.ai_credits.update_one(
        {"user_id": user_id},
        {
            "$inc": {"total_credits": credits, "available_credits": credits},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    # Record history
    await db.ai_credits_history.insert_one({
        "user_id": user_id,
        "action": reason,
        "credits": credits,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
