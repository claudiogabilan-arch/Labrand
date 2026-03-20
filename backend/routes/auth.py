"""
LaBrand - Authentication Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from datetime import datetime, timezone, timedelta
import uuid
import httpx
import os

from config import db, PLANS, TRIAL_DAYS
from models.schemas import UserCreate, UserLogin, VerifyEmailRequest, ResendCodeRequest, ForgotPasswordRequest, ResetPasswordRequest, OnboardingData
from utils.helpers import pwd_context, create_jwt_token, get_current_user, send_email

router = APIRouter(tags=["Authentication"])


@router.post("/auth/register")
async def register(user_data: UserCreate):
    """Register a new user"""
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    verification_code = f"{uuid.uuid4().hex[:6].upper()}"
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_password = pwd_context.hash(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password": hashed_password,
        "role": user_data.role,
        "user_type": user_data.user_type,
        "picture": None,
        "plan": "founder",
        "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)).isoformat(),
        "ai_requests_used": 0,
        "ai_requests_reset_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "onboarding_completed": False,
        "onboarding_data": {},
        "email_verified": False,
        "verification_code": verification_code,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Bem-vindo ao LABrand!</h2>
        <p>Olá {user_data.name},</p>
        <p>Seu código de verificação é:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">{verification_code}</span>
        </div>
        <p>Digite este código na tela de verificação para ativar sua conta.</p>
        <p style="color: #666; font-size: 14px;">Se você não criou esta conta, ignore este email.</p>
    </div>
    """
    await send_email(user_data.email, "Código de Verificação - LABrand", html)
    
    return {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "requires_verification": True,
        "message": "Código de verificação enviado para seu email"
    }


@router.post("/auth/verify-email")
async def verify_email(data: VerifyEmailRequest):
    """Verify email with code"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Email não encontrado")
    
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email já verificado")
    
    if user.get("verification_code") != data.code.upper():
        raise HTTPException(status_code=400, detail="Código inválido")
    
    await db.users.update_one(
        {"email": data.email},
        {"$set": {"email_verified": True, "verification_code": None}}
    )
    
    welcome_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h1 style="color: #1a1a1a; margin: 0 0 20px;">Bem-vindo ao LABrand! 🎉</h1>
            <p style="color: #444; font-size: 16px; line-height: 1.6;">Olá <strong>{user['name']}</strong>,</p>
            <p style="color: #444; font-size: 16px; line-height: 1.6;">Sua conta foi ativada com sucesso!</p>
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); border-radius: 8px; padding: 24px; margin: 24px 0;">
                <p style="color: white; margin: 0; font-size: 14px;">Seu plano atual</p>
                <p style="color: white; margin: 8px 0 0; font-size: 24px; font-weight: bold;">Founder + {TRIAL_DAYS} dias grátis</p>
            </div>
            <a href="{os.environ.get('FRONTEND_URL', 'https://labrand.com.br')}/dashboard" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 16px;">Acessar Plataforma</a>
        </div>
    </div>
    """
    await send_email(data.email, "Bem-vindo ao LABrand! 🚀", welcome_html)
    
    token = create_jwt_token(user["user_id"], user["email"], user.get("role", "estrategista"))
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "cliente"),
        "user_type": user.get("user_type", "estrategista"),
        "plan": user.get("plan", "founder"),
        "trial_ends_at": user.get("trial_ends_at"),
        "onboarding_completed": False,
        "token": token
    }


@router.post("/auth/resend-code")
async def resend_verification_code(data: ResendCodeRequest):
    """Resend verification code"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        return {"message": "Se o email existir, enviaremos um novo código"}
    
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email já verificado")
    
    new_code = f"{uuid.uuid4().hex[:6].upper()}"
    
    await db.users.update_one(
        {"email": data.email},
        {"$set": {"verification_code": new_code}}
    )
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Novo Código de Verificação</h2>
        <p>Olá {user['name']},</p>
        <p>Seu novo código de verificação é:</p>
        <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">{new_code}</span>
        </div>
    </div>
    """
    await send_email(data.email, "Novo Código - LABrand", html)
    
    return {"message": "Novo código enviado para seu email"}


@router.post("/auth/login")
async def login(user_data: UserLogin, response: Response):
    """Login user"""
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not user.get("email_verified", True):
        raise HTTPException(status_code=403, detail="Email não verificado. Verifique sua caixa de entrada.")
    
    stored_password = user.get("password")
    if not stored_password:
        raise HTTPException(status_code=401, detail="Esta conta usa login social (Google). Use o botao 'Entrar com Google' ou redefina sua senha.")
    
    try:
        password_valid = pwd_context.verify(user_data.password, stored_password)
    except Exception:
        raise HTTPException(status_code=401, detail="Credenciais inválidas. Por favor, redefina sua senha.")
    
    if not password_valid:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_jwt_token(user["user_id"], user["email"], user.get("role", "cliente"))
    
    plan = user.get("plan", "free")
    trial_ends_at = user.get("trial_ends_at")
    is_trial_active = False
    if trial_ends_at:
        trial_dt = datetime.fromisoformat(trial_ends_at) if isinstance(trial_ends_at, str) else trial_ends_at
        if trial_dt.tzinfo is None:
            trial_dt = trial_dt.replace(tzinfo=timezone.utc)
        is_trial_active = trial_dt > datetime.now(timezone.utc)
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "cliente"),
        "user_type": user.get("user_type", "estrategista"),
        "picture": user.get("picture"),
        "plan": plan,
        "trial_ends_at": trial_ends_at,
        "is_trial_active": is_trial_active,
        "onboarding_completed": user.get("onboarding_completed", False),
        "is_admin": user.get("is_admin", False),
        "token": token
    }


@router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Send password reset email"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        return {"message": "Se o email existir, você receberá instruções de recuperação"}
    
    reset_token = f"reset_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_resets.update_one(
        {"email": data.email},
        {"$set": {
            "email": data.email,
            "token": reset_token,
            "expires_at": expires_at.isoformat(),
            "used": False
        }},
        upsert=True
    )
    
    frontend_url = os.environ.get("FRONTEND_URL", "https://labrand.com.br")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Recuperação de Senha - LABrand</h2>
        <p>Olá {user.get('name', '')},</p>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <a href="{reset_link}" style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Redefinir Senha
        </a>
        <p style="color: #666; font-size: 14px;">Este link expira em 1 hora.</p>
    </div>
    """
    
    await send_email(data.email, "Recuperação de Senha - LABrand", html)
    
    return {"message": "Se o email existir, você receberá instruções de recuperação"}


@router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Reset password with token"""
    reset_doc = await db.password_resets.find_one({"token": data.token, "used": False}, {"_id": 0})
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    
    expires_at = datetime.fromisoformat(reset_doc["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Token expirado")
    
    hashed = pwd_context.hash(data.new_password)
    await db.users.update_one(
        {"email": reset_doc["email"]},
        {"$set": {"password": hashed}}
    )
    
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Senha alterada com sucesso"}


@router.get("/auth/google/login")
async def google_login(request: Request):
    """
    Redirect to Emergent Auth for Google OAuth
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    The redirect_url is passed by the frontend dynamically using window.location.origin
    """
    from fastapi.responses import RedirectResponse
    
    # Get redirect URL from query params (set by frontend using window.location.origin)
    redirect_url = request.query_params.get("redirect")
    
    if not redirect_url:
        # Fallback: use the referer header to construct redirect
        referer = request.headers.get("referer", "")
        if referer:
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            redirect_url = f"{parsed.scheme}://{parsed.netloc}/dashboard"
        else:
            raise HTTPException(status_code=400, detail="redirect URL is required")
    
    # Redirect to Emergent Auth
    auth_url = f"https://auth.emergentagent.com/?redirect={redirect_url}"
    return RedirectResponse(url=auth_url)


@router.post("/auth/session")
async def process_session(request: Request, response: Response):
    """Process Emergent Auth session_id and create local session"""
    data = await request.json()
    session_id = data.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id é obrigatório")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Sessão inválida")
        
        session_data = resp.json()
    
    email = session_data.get("email")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        user = {
            "user_id": user_id,
            "email": email,
            "name": session_data.get("name", ""),
            "picture": session_data.get("picture"),
            "role": "estrategista",
            "plan": "free",
            "email_verified": True,
            "onboarding_completed": False,
            "trial_ends_at": (now + timedelta(days=7)).isoformat(),
            "created_at": now.isoformat()
        }
        await db.users.insert_one(user)
        # Create initial AI credits
        await db.ai_credits.insert_one({
            "user_id": user_id, "total_credits": 50,
            "available_credits": 50, "used_credits": 0,
            "created_at": now.isoformat()
        })
    else:
        user_id = user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": session_data.get("name", user.get("name", "")),
                "picture": session_data.get("picture")
            }}
        )
    
    session_token = session_data.get("session_token", f"session_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    token = create_jwt_token(user_id, email, user.get("role", "estrategista"))
    
    return {
        "token": token,
        "user_id": user_id,
        "email": email,
        "name": session_data.get("name", ""),
        "picture": session_data.get("picture"),
        "role": user.get("role", "estrategista"),
        "onboarding_completed": user.get("onboarding_completed", False),
        "is_admin": user.get("is_admin", False)
    }


@router.get("/auth/me")
async def get_me(request: Request, user: dict = Depends(get_current_user)):
    """Get current user info"""
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "cliente"),
        "picture": user.get("picture"),
        "onboarding_completed": user.get("onboarding_completed", False),
        "email_verified": user.get("email_verified", False),
        "plan": user.get("plan", "founder"),
        "user_type": user.get("user_type", "estrategista"),
        "is_admin": user.get("is_admin", False)
    }


@router.get("/auth/debug-session")
async def debug_session(request: Request):
    """Debug endpoint to check how the server identifies the current user"""
    result = {"cookie": None, "bearer": None, "user": None}
    
    session_token = request.cookies.get("session_token")
    result["cookie"] = session_token[:20] + "..." if session_token else None
    
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        result["bearer"] = token[:20] + "..."
    
    try:
        user = await get_current_user(request)
        result["user"] = {
            "user_id": user.get("user_id"),
            "email": user.get("email"),
            "role": user.get("role"),
            "is_admin": user.get("is_admin", False)
        }
    except Exception as e:
        result["user"] = {"error": str(e)}
    
    return result



@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logout realizado com sucesso"}


# ==================== ONBOARDING ====================

@router.post("/user/onboarding")
async def complete_onboarding(data: OnboardingData, user: dict = Depends(get_current_user)):
    """Complete user onboarding"""
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "user_type": data.user_type,
            "onboarding_completed": True,
            "onboarding_data": {
                "sector": data.sector,
                "revenue_range": data.revenue_range,
                "brand_maturity": data.brand_maturity,
                "main_objective": data.main_objective,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
        }}
    )
    return {"message": "Onboarding concluído", "onboarding_completed": True}


@router.get("/user/onboarding")
async def get_onboarding_status(user: dict = Depends(get_current_user)):
    """Get onboarding status"""
    user_data = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {
        "onboarding_completed": user_data.get("onboarding_completed", False),
        "onboarding_data": user_data.get("onboarding_data", {}),
        "user_type": user_data.get("user_type", "estrategista")
    }
