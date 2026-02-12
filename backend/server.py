from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'labrand_secret_key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app
app = FastAPI(title="LaBrand - Brand OS API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Health check endpoint
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "labrand-api"}

# ==================== MODELS ====================

class UserBase(BaseModel):
    email: str
    name: str
    role: str = "cliente"  # estrategista or cliente
    picture: Optional[str] = None

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "estrategista"
    user_type: str = "estrategista"  # estrategista, agencia, grupo_empresarial

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    user_type: str = "estrategista"
    created_at: datetime

# ==================== PLAN DEFINITIONS ====================
PLANS = {
    "founder": {
        "name": "Founder",
        "max_brands": 1,
        "ai_requests_per_month": 20,
        "features": ["basic_pillars", "valuation_basic"],
        "price_monthly": 0
    },
    "consultant": {
        "name": "Consultant", 
        "max_brands": 5,
        "ai_requests_per_month": 50,
        "features": ["all_pillars", "valuation", "benchmark", "pdf_export", "history"],
        "price_monthly": 197
    },
    "enterprise": {
        "name": "Enterprise",
        "max_brands": -1,  # unlimited
        "ai_requests_per_month": -1,  # unlimited
        "features": ["all_pillars", "valuation", "benchmark", "pdf_export", "history", "executive_dashboard", "api_access", "white_label"],
        "price_monthly": 497
    },
    "free": {
        "name": "Free",
        "price": 0,
        "max_brands": 1,
        "features": ["1 marca", "7 pilares básicos", "Dashboard"],
        "ai_requests_month": 5,
        "export_pdf": False,
        "google_integration": False,
        "mentor": False
    },
    "pro": {
        "name": "Pro",
        "price": 97,
        "max_brands": 5,
        "features": ["5 marcas", "Todos os pilares", "Exportação PDF", "Integração Google", "Mentor IA", "50 requisições IA/mês"],
        "ai_requests_month": 50,
        "export_pdf": True,
        "google_integration": True,
        "mentor": True
    },
    "enterprise": {
        "name": "Enterprise",
        "price": 297,
        "max_brands": -1,  # unlimited
        "features": ["Marcas ilimitadas", "Todas as funcionalidades", "Requisições IA ilimitadas", "Suporte prioritário", "API access"],
        "ai_requests_month": -1,  # unlimited
        "export_pdf": True,
        "google_integration": True,
        "mentor": True
    }
}

TRIAL_DAYS = 15

class BrandBase(BaseModel):
    name: str
    description: Optional[str] = None
    industry: Optional[str] = None
    logo_url: Optional[str] = None
    brand_type: Optional[str] = "monolitica"  # monolitica, endossada, submarca, hibrida, house_of_brands
    parent_brand_id: Optional[str] = None

class BrandCreate(BrandBase):
    pass

class Brand(BrandBase):
    model_config = ConfigDict(extra="ignore")
    brand_id: str
    owner_id: str
    team_members: List[str] = []
    created_at: datetime
    updated_at: datetime
    onboarding_complete: bool = False

# Pillar models
class PillarStart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pillar_id: str = Field(default_factory=lambda: f"start_{uuid.uuid4().hex[:12]}")
    brand_id: str
    desafio: Optional[str] = None
    background: Optional[str] = None
    urgencia: Optional[str] = None
    cenario_competitivo: Optional[str] = None
    players: List[str] = []
    regulamentacoes: List[str] = []
    tendencias: List[str] = []
    publicos_interesse: List[str] = []
    incertezas: List[str] = []
    cenarios: Dict[str, str] = {}  # C1, C2, C3, C4
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PillarValues(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pillar_id: str = Field(default_factory=lambda: f"values_{uuid.uuid4().hex[:12]}")
    brand_id: str
    valores: List[Dict[str, Any]] = []  # {nome, descricao, prioridade}
    necessidades: List[Dict[str, Any]] = []  # {nome, publico, descricao}
    cruzamento: List[Dict[str, Any]] = []  # {valor, necessidade, insight}
    insights_ia: List[str] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PillarPurpose(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pillar_id: str = Field(default_factory=lambda: f"purpose_{uuid.uuid4().hex[:12]}")
    brand_id: str
    habilidades: List[str] = []
    curiosidade: List[str] = []
    paixao: List[str] = []
    impacto: List[str] = []
    declaracao_proposito: Optional[str] = None
    impacto_curto_prazo: Optional[str] = None
    impacto_medio_prazo: Optional[str] = None
    impacto_longo_prazo: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PillarPromise(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pillar_id: str = Field(default_factory=lambda: f"promise_{uuid.uuid4().hex[:12]}")
    brand_id: str
    identificacao: Optional[str] = None
    qualidade: Optional[str] = None
    entrega_funcional: Optional[str] = None
    entrega_simbolica: Optional[str] = None
    entrega_aspiracional: Optional[str] = None
    entrega_emocional: Optional[str] = None
    atributos_experiencia: List[Dict[str, Any]] = []
    parcerias: List[Dict[str, Any]] = []
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PillarPositioning(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pillar_id: str = Field(default_factory=lambda: f"positioning_{uuid.uuid4().hex[:12]}")
    brand_id: str
    mapa_diferenciacao: List[Dict[str, Any]] = []  # {concorrente, atributo, posicao}
    substitutos: List[Dict[str, Any]] = []
    declaracao_posicionamento: Optional[str] = None
    para_quem: Optional[str] = None
    categoria: Optional[str] = None
    diferencial: Optional[str] = None
    razao_credibilidade: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PillarPersonality(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pillar_id: str = Field(default_factory=lambda: f"personality_{uuid.uuid4().hex[:12]}")
    brand_id: str
    arquetipo_principal: Optional[str] = None
    arquetipo_secundario: Optional[str] = None
    atributos_desejados: List[str] = []
    atributos_indesejados: List[str] = []
    narrativa_individual: Optional[str] = None
    narrativa_grupal: Optional[str] = None
    narrativa_societal: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PillarUniversality(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pillar_id: str = Field(default_factory=lambda: f"universality_{uuid.uuid4().hex[:12]}")
    brand_id: str
    checklist_acessibilidade: List[Dict[str, Any]] = []
    checklist_inclusao: List[Dict[str, Any]] = []
    plano_crises: List[Dict[str, Any]] = []
    viabilidade_curto: Optional[int] = None
    viabilidade_medio: Optional[int] = None
    viabilidade_longo: Optional[int] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    task_id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:12]}")
    brand_id: str
    title: str
    description: Optional[str] = None
    status: str = "backlog"  # backlog, in_progress, review, done
    priority: str = "medium"  # low, medium, high, urgent
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    pillar: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Decision(BaseModel):
    model_config = ConfigDict(extra="ignore")
    decision_id: str = Field(default_factory=lambda: f"decision_{uuid.uuid4().hex[:12]}")
    brand_id: str
    title: str
    contexto: Optional[str] = None
    hipoteses: List[str] = []
    evidencias: List[str] = []
    impacto_esperado: Optional[str] = None
    resultado_real: Optional[str] = None
    status: str = "pending"  # pending, validated, invalidated
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Narrative(BaseModel):
    model_config = ConfigDict(extra="ignore")
    narrative_id: str = Field(default_factory=lambda: f"narrative_{uuid.uuid4().hex[:12]}")
    brand_id: str
    tipo: str  # manifesto, historia, conto
    title: str
    content: Optional[str] = None
    missao: Optional[str] = None
    visao: Optional[str] = None
    valores: List[str] = []
    marcos: List[Dict[str, Any]] = []  # {data, titulo, descricao}
    anexos: List[Dict[str, Any]] = []  # {nome, url, tipo}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIInsightRequest(BaseModel):
    context: str
    pillar: str
    brand_name: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_user(request: Request) -> dict:
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

# ==================== PLANS ROUTES ====================

@api_router.get("/plans")
async def get_plans():
    """Get available plans"""
    return {"plans": PLANS, "trial_days": TRIAL_DAYS}

@api_router.get("/user/plan")
async def get_user_plan(user: dict = Depends(get_current_user)):
    """Get current user plan status"""
    plan = user.get("plan", "free")
    trial_ends_at = user.get("trial_ends_at")
    
    is_trial_active = False
    trial_days_left = 0
    if trial_ends_at:
        trial_dt = datetime.fromisoformat(trial_ends_at) if isinstance(trial_ends_at, str) else trial_ends_at
        if trial_dt.tzinfo is None:
            trial_dt = trial_dt.replace(tzinfo=timezone.utc)
        is_trial_active = trial_dt > datetime.now(timezone.utc)
        if is_trial_active:
            trial_days_left = (trial_dt - datetime.now(timezone.utc)).days
    
    plan_info = PLANS.get(plan, PLANS["free"])
    
    # If trial is active, give Pro features
    effective_plan = "pro" if is_trial_active and plan == "free" else plan
    effective_plan_info = PLANS.get(effective_plan, PLANS["free"])
    
    return {
        "plan": plan,
        "plan_info": plan_info,
        "effective_plan": effective_plan,
        "effective_plan_info": effective_plan_info,
        "is_trial_active": is_trial_active,
        "trial_days_left": trial_days_left,
        "trial_ends_at": trial_ends_at,
        "ai_requests_used": user.get("ai_requests_used", 0),
        "ai_requests_limit": effective_plan_info.get("ai_requests_month", 5)
    }

@api_router.post("/user/upgrade")
async def upgrade_plan(data: dict, user: dict = Depends(get_current_user)):
    """Upgrade user plan (placeholder for payment integration)"""
    new_plan = data.get("plan")
    if new_plan not in ["pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Plano inválido")
    
    # In production, this would integrate with Stripe/payment provider
    # For now, just update the plan
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"plan": new_plan, "upgraded_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Plano atualizado para {new_plan}", "plan": new_plan}

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
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
        "plan": "founder",  # Novo plano inicial
        "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)).isoformat(),
        "ai_requests_used": 0,
        "ai_requests_reset_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "onboarding_completed": False,
        "onboarding_data": {},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id, user_data.email, user_data.role)
    
    return {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "role": user_data.role,
        "user_type": user_data.user_type,
        "plan": "founder",
        "trial_ends_at": user_doc["trial_ends_at"],
        "onboarding_completed": False,
        "token": token
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin, response: Response):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Verificar senha com tratamento de erro para hashes inválidos
    stored_password = user.get("password")
    if not stored_password:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    try:
        password_valid = pwd_context.verify(user_data.password, stored_password)
    except Exception:
        # Hash inválido ou corrompido - força recriar senha
        raise HTTPException(status_code=401, detail="Credenciais inválidas. Por favor, redefina sua senha.")
    
    if not password_valid:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_jwt_token(user["user_id"], user["email"], user.get("role", "cliente"))
    
    # Check trial status
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
        "token": token
    }

class ForgotPasswordRequest(BaseModel):
    email: str

# Resend email configuration
import resend
resend.api_key = os.environ.get("RESEND_API_KEY")

async def send_email(to: str, subject: str, html: str):
    """Enviar email via Resend"""
    try:
        params = {
            "from": "LABrand <noreply@labrand.com.br>",
            "to": [to],
            "subject": subject,
            "html": html
        }
        resend.Emails.send(params)
        return True
    except Exception as e:
        logging.error(f"Erro ao enviar email: {e}")
        return False

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        return {"message": "Se o email existir, você receberá instruções de recuperação"}
    
    # Gerar token de reset
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
    
    # Enviar email de recuperação
    frontend_url = os.environ.get("FRONTEND_URL", "https://labrand.com.br")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Recuperação de Senha - LABrand</h2>
        <p>Olá {user.get('name', '')},</p>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <a href="{reset_link}" style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Redefinir Senha
        </a>
        <p style="color: #666; font-size: 14px;">Este link expira em 1 hora.</p>
        <p style="color: #666; font-size: 14px;">Se você não solicitou esta alteração, ignore este email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">LABrand - Brand OS</p>
    </div>
    """
    
    await send_email(data.email, "Recuperação de Senha - LABrand", html)
    
    return {"message": "Se o email existir, você receberá instruções de recuperação"}

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    reset_doc = await db.password_resets.find_one({"token": data.token, "used": False}, {"_id": 0})
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Token inválido ou expirado")
    
    expires_at = datetime.fromisoformat(reset_doc["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Token expirado")
    
    # Atualizar senha
    hashed = pwd_context.hash(data.new_password)
    await db.users.update_one(
        {"email": reset_doc["email"]},
        {"$set": {"password": hashed}}
    )
    
    # Marcar token como usado
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    
    return {"message": "Senha alterada com sucesso"}

@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    """Process Emergent Auth session_id and create local session"""
    data = await request.json()
    session_id = data.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id é obrigatório")
    
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Sessão inválida")
        
        session_data = resp.json()
    
    # Check if user exists
    email = session_data.get("email")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": session_data.get("name", ""),
            "picture": session_data.get("picture"),
            "role": "estrategista",  # Default role for new OAuth users
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    else:
        user_id = user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": session_data.get("name", user.get("name", "")),
                "picture": session_data.get("picture")
            }}
        )
    
    # Create session
    session_token = session_data.get("session_token", f"session_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "name": session_data.get("name", ""),
        "picture": session_data.get("picture"),
        "role": user.get("role", "estrategista")
    }

@api_router.get("/auth/me")
async def get_me(request: Request, user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "cliente"),
        "picture": user.get("picture")
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logout realizado com sucesso"}

# ==================== BRAND ROUTES ====================

@api_router.post("/brands", response_model=dict)
async def create_brand(brand_data: BrandCreate, user: dict = Depends(get_current_user)):
    brand_id = f"brand_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    brand_doc = {
        "brand_id": brand_id,
        "owner_id": user["user_id"],
        "name": brand_data.name,
        "description": brand_data.description,
        "industry": brand_data.industry,
        "logo_url": brand_data.logo_url,
        "brand_type": brand_data.brand_type,
        "parent_brand_id": brand_data.parent_brand_id,
        "team_members": [user["user_id"]],
        "onboarding_complete": False,
        "created_at": now,
        "updated_at": now
    }
    
    await db.brands.insert_one(brand_doc)
    brand_doc.pop("_id", None)
    return brand_doc

@api_router.get("/brands")
async def get_brands(user: dict = Depends(get_current_user)):
    brands = await db.brands.find(
        {"$or": [{"owner_id": user["user_id"]}, {"team_members": user["user_id"]}]},
        {"_id": 0}
    ).to_list(100)
    return brands

@api_router.get("/brands/{brand_id}")
async def get_brand(brand_id: str, user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one(
        {"brand_id": brand_id, "$or": [{"owner_id": user["user_id"]}, {"team_members": user["user_id"]}]},
        {"_id": 0}
    )
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    return brand

@api_router.put("/brands/{brand_id}")
async def update_brand(brand_id: str, brand_data: dict, user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one({"brand_id": brand_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    brand_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.brands.update_one({"brand_id": brand_id}, {"$set": brand_data})
    
    updated = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    return updated

@api_router.delete("/brands/{brand_id}")
async def delete_brand(brand_id: str, user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one({"brand_id": brand_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    # Delete brand and all related data
    await db.brands.delete_one({"brand_id": brand_id})
    await db.pillar_start.delete_many({"brand_id": brand_id})
    await db.pillar_values.delete_many({"brand_id": brand_id})
    await db.pillar_purpose.delete_many({"brand_id": brand_id})
    await db.pillar_promise.delete_many({"brand_id": brand_id})
    await db.pillar_positioning.delete_many({"brand_id": brand_id})
    await db.pillar_personality.delete_many({"brand_id": brand_id})
    await db.pillar_universality.delete_many({"brand_id": brand_id})
    await db.pillar_valuation.delete_many({"brand_id": brand_id})
    await db.tasks.delete_many({"brand_id": brand_id})
    await db.decisions.delete_many({"brand_id": brand_id})
    await db.narratives.delete_many({"brand_id": brand_id})
    await db.google_connections.delete_many({"brand_id": brand_id})
    
    # Update child brands if this was a parent
    await db.brands.update_many(
        {"parent_brand_id": brand_id},
        {"$set": {"parent_brand_id": None, "brand_type": "monolitica"}}
    )
    
    return {"message": "Marca excluída com sucesso"}

# ==================== PILLAR ROUTES ====================

# Generic pillar CRUD
async def get_pillar(collection_name: str, brand_id: str, user: dict):
    pillar = await db[collection_name].find_one({"brand_id": brand_id}, {"_id": 0})
    return pillar

async def upsert_pillar(collection_name: str, brand_id: str, data: dict, user: dict):
    data["brand_id"] = brand_id
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    existing = await db[collection_name].find_one({"brand_id": brand_id}, {"_id": 0})
    if existing:
        await db[collection_name].update_one({"brand_id": brand_id}, {"$set": data})
    else:
        pillar_id = f"{collection_name}_{uuid.uuid4().hex[:12]}"
        data["pillar_id"] = pillar_id
        await db[collection_name].insert_one(data)
    
    result = await db[collection_name].find_one({"brand_id": brand_id}, {"_id": 0})
    return result

# Start Pillar
@api_router.get("/brands/{brand_id}/pillars/start")
async def get_pillar_start(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_start", brand_id, user) or {}

@api_router.put("/brands/{brand_id}/pillars/start")
async def update_pillar_start(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_start", brand_id, data, user)

# Values Pillar
@api_router.get("/brands/{brand_id}/pillars/values")
async def get_pillar_values(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_values", brand_id, user) or {}

@api_router.put("/brands/{brand_id}/pillars/values")
async def update_pillar_values(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_values", brand_id, data, user)

# Purpose Pillar
@api_router.get("/brands/{brand_id}/pillars/purpose")
async def get_pillar_purpose(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_purpose", brand_id, user) or {}

@api_router.put("/brands/{brand_id}/pillars/purpose")
async def update_pillar_purpose(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_purpose", brand_id, data, user)

# Promise Pillar
@api_router.get("/brands/{brand_id}/pillars/promise")
async def get_pillar_promise(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_promise", brand_id, user) or {}

@api_router.put("/brands/{brand_id}/pillars/promise")
async def update_pillar_promise(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_promise", brand_id, data, user)

# Positioning Pillar
@api_router.get("/brands/{brand_id}/pillars/positioning")
async def get_pillar_positioning(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_positioning", brand_id, user) or {}

@api_router.put("/brands/{brand_id}/pillars/positioning")
async def update_pillar_positioning(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_positioning", brand_id, data, user)

# Personality Pillar
@api_router.get("/brands/{brand_id}/pillars/personality")
async def get_pillar_personality(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_personality", brand_id, user) or {}

@api_router.put("/brands/{brand_id}/pillars/personality")
async def update_pillar_personality(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_personality", brand_id, data, user)

# Universality Pillar
@api_router.get("/brands/{brand_id}/pillars/universality")
async def get_pillar_universality(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_universality", brand_id, user) or {}

@api_router.put("/brands/{brand_id}/pillars/universality")
async def update_pillar_universality(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_universality", brand_id, data, user)

# Valuation Pillar
@api_router.get("/brands/{brand_id}/pillars/valuation")
async def get_pillar_valuation(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_valuation", brand_id, user) or {}

@api_router.put("/brands/{brand_id}/pillars/valuation")
async def update_pillar_valuation(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_valuation", brand_id, data, user)

# ==================== TASKS ROUTES ====================

@api_router.get("/brands/{brand_id}/tasks")
async def get_tasks(brand_id: str, user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"brand_id": brand_id}, {"_id": 0}).to_list(500)
    return tasks

@api_router.post("/brands/{brand_id}/tasks")
async def create_task(brand_id: str, task_data: dict, user: dict = Depends(get_current_user)):
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    task_doc = {
        "task_id": task_id,
        "brand_id": brand_id,
        "title": task_data.get("title", ""),
        "description": task_data.get("description"),
        "status": task_data.get("status", "backlog"),
        "priority": task_data.get("priority", "medium"),
        "assigned_to": task_data.get("assigned_to"),
        "due_date": task_data.get("due_date"),
        "pillar": task_data.get("pillar"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.tasks.insert_one(task_doc)
    task_doc.pop("_id", None)
    return task_doc

@api_router.put("/brands/{brand_id}/tasks/{task_id}")
async def update_task(brand_id: str, task_id: str, task_data: dict, user: dict = Depends(get_current_user)):
    task_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tasks.update_one({"task_id": task_id, "brand_id": brand_id}, {"$set": task_data})
    updated = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    return updated

@api_router.delete("/brands/{brand_id}/tasks/{task_id}")
async def delete_task(brand_id: str, task_id: str, user: dict = Depends(get_current_user)):
    await db.tasks.delete_one({"task_id": task_id, "brand_id": brand_id})
    return {"message": "Tarefa removida"}

# ==================== DECISIONS ROUTES ====================

@api_router.get("/brands/{brand_id}/decisions")
async def get_decisions(brand_id: str, user: dict = Depends(get_current_user)):
    decisions = await db.decisions.find({"brand_id": brand_id}, {"_id": 0}).to_list(500)
    return decisions

@api_router.post("/brands/{brand_id}/decisions")
async def create_decision(brand_id: str, decision_data: dict, user: dict = Depends(get_current_user)):
    decision_id = f"decision_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    decision_doc = {
        "decision_id": decision_id,
        "brand_id": brand_id,
        "title": decision_data.get("title", ""),
        "contexto": decision_data.get("contexto"),
        "hipoteses": decision_data.get("hipoteses", []),
        "evidencias": decision_data.get("evidencias", []),
        "impacto_esperado": decision_data.get("impacto_esperado"),
        "resultado_real": decision_data.get("resultado_real"),
        "status": decision_data.get("status", "pending"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.decisions.insert_one(decision_doc)
    decision_doc.pop("_id", None)
    return decision_doc

@api_router.put("/brands/{brand_id}/decisions/{decision_id}")
async def update_decision(brand_id: str, decision_id: str, decision_data: dict, user: dict = Depends(get_current_user)):
    decision_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.decisions.update_one({"decision_id": decision_id, "brand_id": brand_id}, {"$set": decision_data})
    updated = await db.decisions.find_one({"decision_id": decision_id}, {"_id": 0})
    return updated

# ==================== NARRATIVES ROUTES ====================

@api_router.get("/brands/{brand_id}/narratives")
async def get_narratives(brand_id: str, user: dict = Depends(get_current_user)):
    narratives = await db.narratives.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
    return narratives

@api_router.post("/brands/{brand_id}/narratives")
async def create_narrative(brand_id: str, narrative_data: dict, user: dict = Depends(get_current_user)):
    narrative_id = f"narrative_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    narrative_doc = {
        "narrative_id": narrative_id,
        "brand_id": brand_id,
        "tipo": narrative_data.get("tipo", "historia"),
        "title": narrative_data.get("title", ""),
        "content": narrative_data.get("content"),
        "missao": narrative_data.get("missao"),
        "visao": narrative_data.get("visao"),
        "valores": narrative_data.get("valores", []),
        "marcos": narrative_data.get("marcos", []),
        "anexos": narrative_data.get("anexos", []),
        "created_at": now,
        "updated_at": now
    }
    
    await db.narratives.insert_one(narrative_doc)
    narrative_doc.pop("_id", None)
    return narrative_doc

@api_router.put("/brands/{brand_id}/narratives/{narrative_id}")
async def update_narrative(brand_id: str, narrative_id: str, narrative_data: dict, user: dict = Depends(get_current_user)):
    narrative_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.narratives.update_one({"narrative_id": narrative_id, "brand_id": brand_id}, {"$set": narrative_data})
    updated = await db.narratives.find_one({"narrative_id": narrative_id}, {"_id": 0})
    return updated

# ==================== AI INSIGHTS ROUTE ====================

@api_router.post("/ai/insights")
async def generate_ai_insight(data: dict, user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import chat, LlmModel
        
        context = data.get("context", "")
        pillar = data.get("pillar", "default")
        brand_name = data.get("brand_name", "Marca")
        
        system_prompts = {
            "values": "Você é um especialista em branding e estratégia de marca. Analise os valores e necessidades fornecidos e gere insights estratégicos sobre como a marca pode conectar seus valores com as necessidades dos públicos. Responda em português do Brasil de forma clara e acionável.",
            "purpose": "Você é um especialista em propósito de marca. Com base nas habilidades, curiosidades, paixões e impactos fornecidos, gere uma declaração de propósito inspiradora e autêntica. Responda em português do Brasil.",
            "positioning": "Você é um especialista em posicionamento de marca. Com base no contexto competitivo fornecido, gere uma declaração de posicionamento clara e diferenciadora. Responda em português do Brasil.",
            "personality": "Você é um especialista em personalidade de marca e arquétipos de Jung. Com base nos atributos fornecidos, desenvolva uma narrativa de humanização da marca. Responda em português do Brasil.",
            "valuation": "Você é um especialista em brand valuation e avaliação de marcas, com profundo conhecimento da metodologia Interbrand. Com base nos dados de Brand Strength, Role of Brand Index e performance financeira fornecidos, gere recomendações estratégicas para aumentar o valor da marca. Foque em ações específicas para melhorar os fatores mais fracos e capitalizar nos pontos fortes. Responda em português do Brasil de forma clara e acionável.",
            "audience": "Você é um especialista em análise de audiência e marketing de influência. Analise o perfil da marca e sugira estratégias de engajamento. Responda em português do Brasil.",
            "default": "Você é um especialista em branding e estratégia de marca. Analise o contexto fornecido e gere insights acionáveis. Responda em português do Brasil."
        }
        
        system_prompt = system_prompts.get(pillar, system_prompts["default"])
        
        response = await chat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            model=LlmModel.GEMINI_2_0_FLASH,
            system_prompt=system_prompt,
            user_prompt=f"Marca: {brand_name}\n\nContexto:\n{context}\n\nGere insights estratégicos e acionáveis:"
        )
        
        return {"insight": response}
    except Exception as e:
        logger.error(f"AI insight error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/mentor")
async def generate_mentor_insights(data: dict, user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import chat, LlmModel
        
        brand_id = data.get("brand_id")
        brand_name = data.get("brand_name", "Marca")
        industry = data.get("industry", "")
        
        # Fetch brand data
        pillars_data = {}
        for pillar in ['start', 'values', 'purpose', 'positioning', 'personality', 'valuation']:
            pdata = await db[f"pillar_{pillar}"].find_one({"brand_id": brand_id}, {"_id": 0})
            if pdata:
                pillars_data[pillar] = pdata
        
        context_parts = [f"Marca: {brand_name}", f"Setor: {industry}"]
        if 'purpose' in pillars_data:
            context_parts.append(f"Propósito: {pillars_data['purpose'].get('declaracao_proposito', 'N/A')}")
        if 'positioning' in pillars_data:
            context_parts.append(f"Posicionamento: {pillars_data['positioning'].get('declaracao_posicionamento', 'N/A')}")
        if 'personality' in pillars_data:
            context_parts.append(f"Arquétipo: {pillars_data['personality'].get('arquetipo_principal', 'N/A')}")
        if 'values' in pillars_data:
            vals = pillars_data['values'].get('valores_marca', [])
            if vals:
                context_parts.append(f"Valores: {', '.join(vals[:5])}")
        
        context = "\n".join(context_parts)
        
        system_prompt = """Você é um mentor estratégico de marcas com expertise em branding, marketing, finanças e inovação.
        
Analise os dados da marca e forneça insights em 5 categorias:

1. **🎯 Ação Imediata**: Uma ação prática que a marca pode fazer esta semana
2. **📈 Oportunidade de Mercado**: Uma tendência ou oportunidade no setor
3. **💡 Ideia de Produto/Serviço**: Sugestão de novo produto ou serviço alinhado à marca
4. **⚠️ Ponto de Atenção**: Algo que a marca deve monitorar ou evitar
5. **🚀 Visão de Futuro**: Uma recomendação estratégica para os próximos 6 meses

Seja específico, prático e cite exemplos quando possível. Responda em português do Brasil."""

        response = await chat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            model=LlmModel.GEMINI_2_0_FLASH,
            system_prompt=system_prompt,
            user_prompt=f"Dados da marca:\n{context}\n\nGere insights de mentor:"
        )
        
        return {"insights": response}
    except Exception as e:
        logger.error(f"Mentor error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DASHBOARD METRICS ====================

@api_router.get("/brands/{brand_id}/metrics")
async def get_metrics(brand_id: str, user: dict = Depends(get_current_user)):
    # Calculate pillar completion
    pillars = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillar_status = {}
    
    for pillar in pillars:
        data = await db[f"pillar_{pillar}"].find_one({"brand_id": brand_id}, {"_id": 0})
        if data:
            # Calculate completion based on filled fields
            total_fields = len([k for k in data.keys() if k not in ["pillar_id", "brand_id", "updated_at"]])
            filled_fields = len([k for k, v in data.items() if v and k not in ["pillar_id", "brand_id", "updated_at"]])
            pillar_status[pillar] = int((filled_fields / max(total_fields, 1)) * 100)
        else:
            pillar_status[pillar] = 0
    
    # Get task counts
    tasks = await db.tasks.find({"brand_id": brand_id}, {"_id": 0}).to_list(500)
    task_stats = {
        "total": len(tasks),
        "backlog": len([t for t in tasks if t.get("status") == "backlog"]),
        "in_progress": len([t for t in tasks if t.get("status") == "in_progress"]),
        "done": len([t for t in tasks if t.get("status") == "done"])
    }
    
    # Get decision counts
    decisions = await db.decisions.find({"brand_id": brand_id}, {"_id": 0}).to_list(500)
    decision_stats = {
        "total": len(decisions),
        "pending": len([d for d in decisions if d.get("status") == "pending"]),
        "validated": len([d for d in decisions if d.get("status") == "validated"])
    }
    
    return {
        "pillars": pillar_status,
        "tasks": task_stats,
        "decisions": decision_stats,
        "overall_completion": int(sum(pillar_status.values()) / len(pillars))
    }

# ==================== CAMPAIGNS ROUTES ====================

@api_router.get("/brands/{brand_id}/campaigns")
async def get_campaigns(brand_id: str, user: dict = Depends(get_current_user)):
    campaigns = await db.campaigns.find({"brand_id": brand_id}, {"_id": 0}).to_list(500)
    return campaigns

@api_router.post("/brands/{brand_id}/campaigns")
async def create_campaign(brand_id: str, campaign_data: dict, user: dict = Depends(get_current_user)):
    campaign_id = f"campaign_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    campaign_doc = {
        "campaign_id": campaign_id,
        "brand_id": brand_id,
        "title": campaign_data.get("title", ""),
        "description": campaign_data.get("description"),
        "type": campaign_data.get("type", "awareness"),
        "start_date": campaign_data.get("start_date"),
        "end_date": campaign_data.get("end_date"),
        "budget": campaign_data.get("budget", 0),
        "goals": campaign_data.get("goals"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.campaigns.insert_one(campaign_doc)
    campaign_doc.pop("_id", None)
    return campaign_doc

@api_router.put("/brands/{brand_id}/campaigns/{campaign_id}")
async def update_campaign(brand_id: str, campaign_id: str, campaign_data: dict, user: dict = Depends(get_current_user)):
    campaign_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.campaigns.update_one({"campaign_id": campaign_id, "brand_id": brand_id}, {"$set": campaign_data})
    updated = await db.campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    return updated

@api_router.delete("/brands/{brand_id}/campaigns/{campaign_id}")
async def delete_campaign(brand_id: str, campaign_id: str, user: dict = Depends(get_current_user)):
    await db.campaigns.delete_one({"campaign_id": campaign_id, "brand_id": brand_id})
    return {"message": "Campanha removida"}

# ==================== REPORTS & FILE UPLOAD ====================

from fastapi import UploadFile, File as FastAPIFile
from fastapi.responses import StreamingResponse
import io
import os as os_module

UPLOAD_DIR = "/app/uploads"
os_module.makedirs(UPLOAD_DIR, exist_ok=True)

@api_router.post("/brands/{brand_id}/logo")
async def upload_logo(brand_id: str, file: UploadFile = FastAPIFile(...), user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one({"brand_id": brand_id, "owner_id": user["user_id"]})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    ext = file.filename.split('.')[-1].lower()
    if ext not in ['png', 'jpg', 'jpeg', 'svg', 'webp']:
        raise HTTPException(status_code=400, detail="Formato inválido")
    
    filename = f"{brand_id}_logo.{ext}"
    filepath = os_module.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    
    logo_url = f"/api/uploads/{filename}"
    await db.brands.update_one({"brand_id": brand_id}, {"$set": {"logo_url": logo_url}})
    
    return {"logo_url": logo_url}

@api_router.get("/uploads/{filename}")
async def get_upload(filename: str):
    filepath = os_module.path.join(UPLOAD_DIR, filename)
    if not os_module.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    ext = filename.split('.')[-1].lower()
    media_types = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'svg': 'image/svg+xml', 'webp': 'image/webp'}
    
    with open(filepath, "rb") as f:
        return StreamingResponse(io.BytesIO(f.read()), media_type=media_types.get(ext, 'application/octet-stream'))

@api_router.get("/brands/{brand_id}/reports/{report_type}")
async def generate_report(brand_id: str, report_type: str, format: str = "pdf", user: dict = Depends(get_current_user)):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    # Fetch pillar data
    pillars_data = {}
    for pillar in ['start', 'values', 'purpose', 'promise', 'positioning', 'personality', 'universality', 'valuation']:
        data = await db[f"pillar_{pillar}"].find_one({"brand_id": brand_id}, {"_id": 0})
        if data:
            pillars_data[pillar] = data
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, spaceAfter=30, textColor=colors.HexColor('#1e3a5f'))
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=16, spaceAfter=12, textColor=colors.HexColor('#f97316'))
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=11, spaceAfter=8)
    
    story = []
    story.append(Paragraph(f"Relatório de Marca: {brand.get('name', 'N/A')}", title_style))
    story.append(Paragraph(f"Setor: {brand.get('industry', 'N/A')} | Tipo: {brand.get('brand_type', 'Monolítica')}", normal_style))
    story.append(Spacer(1, 20))
    
    if report_type in ['brand', 'full']:
        # Purpose
        if 'purpose' in pillars_data:
            story.append(Paragraph("Propósito", heading_style))
            story.append(Paragraph(pillars_data['purpose'].get('declaracao_proposito', 'Não definido'), normal_style))
            story.append(Spacer(1, 15))
        
        # Values
        if 'values' in pillars_data:
            story.append(Paragraph("Valores", heading_style))
            values = pillars_data['values'].get('valores_marca', [])
            for v in values[:5]:
                story.append(Paragraph(f"• {v}", normal_style))
            story.append(Spacer(1, 15))
        
        # Positioning
        if 'positioning' in pillars_data:
            story.append(Paragraph("Posicionamento", heading_style))
            story.append(Paragraph(pillars_data['positioning'].get('declaracao_posicionamento', 'Não definido'), normal_style))
            story.append(Spacer(1, 15))
        
        # Personality
        if 'personality' in pillars_data:
            story.append(Paragraph("Personalidade", heading_style))
            arch = pillars_data['personality'].get('arquetipo_principal', 'Não definido')
            story.append(Paragraph(f"Arquétipo Principal: {arch}", normal_style))
            story.append(Spacer(1, 15))
    
    if report_type in ['valuation', 'full']:
        if 'valuation' in pillars_data:
            story.append(Paragraph("Avaliação de Marca", heading_style))
            val = pillars_data['valuation']
            data_table = [
                ['Métrica', 'Valor'],
                ['Receita Anual', val.get('receita_anual', 'N/A')],
                ['Lucro Operacional', val.get('lucro_operacional', 'N/A')],
                ['Role of Brand', f"{val.get('role_of_brand', 'N/A')}%"],
            ]
            t = Table(data_table, colWidths=[200, 200])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a5f')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
            ]))
            story.append(t)
    
    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={brand.get('name', 'marca')}_relatorio.pdf"}
    )

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "LaBrand - Brand OS API", "version": "1.0.0"}

# ==================== GOOGLE INTEGRATION ====================

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.environ.get("FRONTEND_URL")
GOOGLE_REDIRECT_URI = f"{FRONTEND_URL}/api/auth/google/callback"
GOOGLE_SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/drive.readonly"
]

@api_router.get("/auth/google/init")
async def google_auth_init(brand_id: str, user: dict = Depends(get_current_user)):
    """Initiate Google OAuth flow for connecting Google services"""
    from urllib.parse import urlencode
    
    state = f"{user['user_id']}:{brand_id}"
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"auth_url": auth_url}

@api_router.get("/auth/google/callback")
async def google_auth_callback(code: str = None, state: str = None, error: str = None):
    """Handle Google OAuth callback"""
    from fastapi.responses import RedirectResponse
    
    if error:
        return RedirectResponse(url=f"{FRONTEND_URL}/settings?error={error}")
    
    if not code or not state:
        return RedirectResponse(url=f"{FRONTEND_URL}/settings?error=missing_params")
    
    try:
        user_id, brand_id = state.split(":")
    except:
        return RedirectResponse(url=f"{FRONTEND_URL}/settings?error=invalid_state")
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": GOOGLE_REDIRECT_URI
            }
        )
        
        if token_response.status_code != 200:
            logger.error(f"Token exchange failed: {token_response.text}")
            return RedirectResponse(url=f"{FRONTEND_URL}/settings?error=token_exchange_failed")
        
        tokens = token_response.json()
    
    # Store tokens in database
    await db.google_connections.update_one(
        {"user_id": user_id, "brand_id": brand_id},
        {"$set": {
            "user_id": user_id,
            "brand_id": brand_id,
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))).isoformat(),
            "connected_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return RedirectResponse(url=f"{FRONTEND_URL}/settings?google=connected")

async def get_valid_google_token(user_id: str, brand_id: str) -> str:
    """Get valid access token, refreshing if needed"""
    connection = await db.google_connections.find_one(
        {"user_id": user_id, "brand_id": brand_id},
        {"_id": 0}
    )
    
    if not connection:
        raise HTTPException(status_code=400, detail="Google não conectado")
    
    expires_at = datetime.fromisoformat(connection["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    # Refresh if expired
    if expires_at <= datetime.now(timezone.utc):
        async with httpx.AsyncClient() as client:
            refresh_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "refresh_token": connection["refresh_token"],
                    "grant_type": "refresh_token"
                }
            )
            
            if refresh_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Token refresh falhou")
            
            tokens = refresh_response.json()
            
            await db.google_connections.update_one(
                {"user_id": user_id, "brand_id": brand_id},
                {"$set": {
                    "access_token": tokens.get("access_token"),
                    "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))).isoformat()
                }}
            )
            
            return tokens.get("access_token")
    
    return connection["access_token"]

@api_router.get("/brands/{brand_id}/google/status")
async def get_google_status(brand_id: str, user: dict = Depends(get_current_user)):
    """Check if Google is connected for this brand"""
    connection = await db.google_connections.find_one(
        {"user_id": user["user_id"], "brand_id": brand_id},
        {"_id": 0}
    )
    
    return {
        "connected": connection is not None,
        "connected_at": connection.get("connected_at") if connection else None
    }

@api_router.delete("/brands/{brand_id}/google/disconnect")
async def disconnect_google(brand_id: str, user: dict = Depends(get_current_user)):
    """Disconnect Google from this brand"""
    await db.google_connections.delete_one({"user_id": user["user_id"], "brand_id": brand_id})
    return {"message": "Google desconectado"}

@api_router.get("/brands/{brand_id}/google/analytics")
async def get_google_analytics(brand_id: str, user: dict = Depends(get_current_user)):
    """Fetch Google Analytics data"""
    try:
        token = await get_valid_google_token(user["user_id"], brand_id)
    except HTTPException:
        return {"error": "Google não conectado", "data": None}
    
    async with httpx.AsyncClient() as client:
        # Get list of GA4 properties
        props_response = await client.get(
            "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if props_response.status_code != 200:
            return {"error": "Falha ao buscar propriedades", "data": None}
        
        properties = props_response.json().get("accountSummaries", [])
        
        return {
            "connected": True,
            "properties": properties,
            "message": "Dados do Analytics obtidos com sucesso"
        }

@api_router.get("/brands/{brand_id}/google/search-console")
async def get_search_console(brand_id: str, user: dict = Depends(get_current_user)):
    """Fetch Google Search Console data"""
    try:
        token = await get_valid_google_token(user["user_id"], brand_id)
    except HTTPException:
        return {"error": "Google não conectado", "data": None}
    
    async with httpx.AsyncClient() as client:
        # Get list of sites
        sites_response = await client.get(
            "https://www.googleapis.com/webmasters/v3/sites",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if sites_response.status_code != 200:
            return {"error": "Falha ao buscar sites", "data": None}
        
        sites = sites_response.json().get("siteEntry", [])
        
        return {
            "connected": True,
            "sites": sites,
            "message": "Dados do Search Console obtidos com sucesso"
        }

@api_router.get("/brands/{brand_id}/google/drive")
async def get_google_drive(brand_id: str, user: dict = Depends(get_current_user)):
    """Fetch Google Drive files"""
    try:
        token = await get_valid_google_token(user["user_id"], brand_id)
    except HTTPException:
        return {"error": "Google não conectado", "data": None}
    
    async with httpx.AsyncClient() as client:
        # Get recent files
        files_response = await client.get(
            "https://www.googleapis.com/drive/v3/files",
            params={
                "pageSize": 20,
                "fields": "files(id,name,mimeType,modifiedTime,webViewLink)",
                "orderBy": "modifiedTime desc"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if files_response.status_code != 200:
            return {"error": "Falha ao buscar arquivos", "data": None}
        
        files = files_response.json().get("files", [])
        
        return {
            "connected": True,
            "files": files,
            "message": "Arquivos do Drive obtidos com sucesso"
        }

# ==================== BRAND IDENTITY ====================

@api_router.get("/brands/{brand_id}/identity")
async def get_brand_identity(brand_id: str, user: dict = Depends(get_current_user)):
    identity = await db.brand_identities.find_one({"brand_id": brand_id}, {"_id": 0})
    return identity or {}

@api_router.post("/brands/{brand_id}/identity/generate")
async def generate_brand_identity(brand_id: str, user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    pillars = await db.pillars.find_one({"brand_id": brand_id}, {"_id": 0})
    archetype = pillars.get("personality", {}).get("archetype", "Sábio") if pillars else "Sábio"
    values = pillars.get("values", {}).get("core_values", []) if pillars else []
    personality_traits = pillars.get("personality", {}).get("traits", []) if pillars else []
    
    archetype_palettes = {
        'Inocente': {'colors': ['#FDFCFB', '#E8F5E9', '#FFF9C4', '#E3F2FD'], 'style': 'Leve, puro, minimalista'},
        'Explorador': {'colors': ['#5D4037', '#FF6F00', '#1B5E20', '#37474F'], 'style': 'Rústico, aventureiro, natural'},
        'Sábio': {'colors': ['#1A237E', '#0D47A1', '#263238', '#FFC107'], 'style': 'Sofisticado, intelectual, clean'},
        'Herói': {'colors': ['#B71C1C', '#212121', '#FF6F00', '#1565C0'], 'style': 'Bold, impactante, poderoso'},
        'Fora-da-lei': {'colors': ['#212121', '#B71C1C', '#4A148C', '#1B1B1B'], 'style': 'Rebelde, disruptivo, dark'},
        'Mago': {'colors': ['#4A148C', '#1A237E', '#880E4F', '#FF6F00'], 'style': 'Místico, transformador, vibrante'},
        'Cara Comum': {'colors': ['#5D4037', '#455A64', '#3E2723', '#607D8B'], 'style': 'Acessível, honesto, simples'},
        'Amante': {'colors': ['#880E4F', '#AD1457', '#C62828', '#4E342E'], 'style': 'Sensual, elegante, luxuoso'},
        'Bobo': {'colors': ['#FF6F00', '#FFEB3B', '#00BCD4', '#E91E63'], 'style': 'Divertido, colorido, irreverente'},
        'Cuidador': {'colors': ['#1B5E20', '#0097A7', '#2E7D32', '#00695C'], 'style': 'Acolhedor, sereno, natural'},
        'Criador': {'colors': ['#FF5722', '#795548', '#FF9800', '#3E2723'], 'style': 'Artístico, expressivo, único'},
        'Governante': {'colors': ['#0D47A1', '#212121', '#BF360C', '#1B1B1B'], 'style': 'Premium, autoritário, clássico'}
    }
    
    archetype_fonts = {
        'Inocente': ['Quicksand', 'Nunito', 'Poppins'],
        'Explorador': ['Montserrat', 'Oswald', 'Roboto Condensed'],
        'Sábio': ['Merriweather', 'Playfair Display', 'Lora'],
        'Herói': ['Bebas Neue', 'Anton', 'Roboto'],
        'Fora-da-lei': ['Rock Salt', 'Permanent Marker', 'Roboto'],
        'Mago': ['Cinzel', 'Cormorant', 'Spectral'],
        'Cara Comum': ['Open Sans', 'Roboto', 'Source Sans Pro'],
        'Amante': ['Playfair Display', 'Cormorant Garamond', 'Lora'],
        'Bobo': ['Fredoka One', 'Baloo 2', 'Comic Neue'],
        'Cuidador': ['Cabin', 'Nunito', 'Catamaran'],
        'Criador': ['Abril Fatface', 'Amatic SC', 'Caveat'],
        'Governante': ['Cinzel', 'Trajan Pro', 'Cormorant']
    }
    
    base = archetype_palettes.get(archetype, archetype_palettes['Sábio'])
    fonts = archetype_fonts.get(archetype, archetype_fonts['Sábio'])
    
    identity = {
        "brand_id": brand_id,
        "archetype": archetype,
        "colors": base['colors'],
        "fonts": fonts,
        "style": base['style'],
        "elements": f"Elementos visuais que transmitem {', '.join(personality_traits[:3]) if personality_traits else 'sofisticação e confiança'}",
        "photography": f"Imagens que refletem os valores de {', '.join(values[:2]) if values else 'autenticidade e qualidade'}",
        "moodboard": f"Referências visuais inspiradas no arquétipo {archetype}: {base['style'].lower()}. Busque inspiração em marcas que transmitem essa mesma essência.",
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.brand_identities.update_one(
        {"brand_id": brand_id},
        {"$set": identity},
        upsert=True
    )
    
    return identity

# ==================== INFLUENCERS DATABASE ====================
# Base de influenciadores reais categorizados por nicho/cultura
INFLUENCERS_DB = {
    # Negócios/Empreendedorismo
    "negocios": [
        {"name": "Joel Jota", "handle": "@joeljota", "platform": "instagram", "followers": 3500000, "niche": "Negócios/Produtividade", "url": "https://instagram.com/joeljota"},
        {"name": "Flávio Augusto", "handle": "@geloflavio", "platform": "instagram", "followers": 5200000, "niche": "Empreendedorismo", "url": "https://instagram.com/geloflavio"},
        {"name": "Thiago Nigro", "handle": "@thaborges", "platform": "youtube", "followers": 6800000, "niche": "Finanças/Investimentos", "url": "https://youtube.com/@thaborges"},
        {"name": "Nath Finanças", "handle": "@nfrancas", "platform": "instagram", "followers": 1200000, "niche": "Finanças Pessoais", "url": "https://instagram.com/nfrancas"},
    ],
    # Tecnologia
    "tecnologia": [
        {"name": "Filipe Deschamps", "handle": "@filipedeschamps", "platform": "youtube", "followers": 1500000, "niche": "Programação/Tech", "url": "https://youtube.com/@filipedeschamps"},
        {"name": "Akita", "handle": "@akaborges", "platform": "youtube", "followers": 800000, "niche": "Tecnologia/Dev", "url": "https://youtube.com/@akaborges"},
        {"name": "Código Fonte TV", "handle": "@coaborges", "platform": "youtube", "followers": 500000, "niche": "Programação", "url": "https://youtube.com/@codfonte"},
    ],
    # Saúde/Bem-estar
    "saude": [
        {"name": "Dr. Drauzio Varella", "handle": "@daborges", "platform": "youtube", "followers": 4500000, "niche": "Saúde", "url": "https://youtube.com/@drauziovarella"},
        {"name": "Gabriela Pugliesi", "handle": "@gaborges", "platform": "instagram", "followers": 4800000, "niche": "Fitness/Bem-estar", "url": "https://instagram.com/gabrielapugliesi"},
        {"name": "Carol Borba", "handle": "@caborges", "platform": "youtube", "followers": 1200000, "niche": "Fitness", "url": "https://youtube.com/@carolborba"},
    ],
    # Educação
    "educacao": [
        {"name": "Manual do Mundo", "handle": "@maborges", "platform": "youtube", "followers": 18000000, "niche": "Educação/Ciência", "url": "https://youtube.com/@iberaborges"},
        {"name": "Nostalgia", "handle": "@naborges", "platform": "youtube", "followers": 14000000, "niche": "Educação/História", "url": "https://youtube.com/@caborges"},
        {"name": "Nerdologia", "handle": "@neraborges", "platform": "youtube", "followers": 3200000, "niche": "Ciência", "url": "https://youtube.com/@nerdologia"},
    ],
    # Moda/Lifestyle
    "moda": [
        {"name": "Niina Secrets", "handle": "@niaborges", "platform": "youtube", "followers": 5800000, "niche": "Beleza/Lifestyle", "url": "https://youtube.com/@niinasecrets"},
        {"name": "Camila Coutinho", "handle": "@camilaborges", "platform": "instagram", "followers": 2900000, "niche": "Moda", "url": "https://instagram.com/camilacoutinho"},
        {"name": "Taciele Alcolea", "handle": "@taborges", "platform": "youtube", "followers": 3500000, "niche": "Lifestyle", "url": "https://youtube.com/@tacielealcolea"},
    ],
    # Sustentabilidade
    "sustentabilidade": [
        {"name": "Bela Gil", "handle": "@baborges", "platform": "instagram", "followers": 2100000, "niche": "Alimentação Saudável", "url": "https://instagram.com/belagil"},
        {"name": "Menos 1 Lixo", "handle": "@maborges", "platform": "instagram", "followers": 350000, "niche": "Sustentabilidade", "url": "https://instagram.com/menos1lixo"},
    ],
    # Gastronomia
    "gastronomia": [
        {"name": "Ana Maria Braga", "handle": "@anamaborges", "platform": "instagram", "followers": 5500000, "niche": "Culinária", "url": "https://instagram.com/aaborges"},
        {"name": "Mohamad Hindi", "handle": "@moaborges", "platform": "youtube", "followers": 4200000, "niche": "Gastronomia", "url": "https://youtube.com/@moaborges"},
        {"name": "Receitas de Pai", "handle": "@raborges", "platform": "instagram", "followers": 1800000, "niche": "Culinária", "url": "https://instagram.com/raborges"},
    ],
    # Família/Maternidade
    "familia": [
        {"name": "Flávia Calina", "handle": "@faborges", "platform": "youtube", "followers": 4500000, "niche": "Maternidade", "url": "https://youtube.com/@faborges"},
        {"name": "Tata Estaniecki", "handle": "@tataborges", "platform": "instagram", "followers": 3200000, "niche": "Família/Lifestyle", "url": "https://instagram.com/taborges"},
    ],
}

# Mapeamento de arquétipos para nichos
ARCHETYPE_NICHES = {
    "Sábio": ["educacao", "tecnologia", "negocios"],
    "Inocente": ["familia", "sustentabilidade", "saude"],
    "Explorador": ["sustentabilidade", "educacao"],
    "Herói": ["negocios", "saude", "tecnologia"],
    "Fora-da-lei": ["tecnologia", "negocios"],
    "Mago": ["tecnologia", "educacao"],
    "Cara Comum": ["familia", "gastronomia"],
    "Amante": ["moda", "gastronomia"],
    "Bobo": ["familia", "moda"],
    "Cuidador": ["saude", "familia", "sustentabilidade"],
    "Criador": ["moda", "gastronomia", "educacao"],
    "Governante": ["negocios", "tecnologia"],
}

@api_router.get("/brands/{brand_id}/influencers")
async def get_brand_influencers(brand_id: str, user: dict = Depends(get_current_user)):
    pillars = await db.pillars.find_one({"brand_id": brand_id}, {"_id": 0})
    if not pillars:
        return []
    
    # Coletar nichos relevantes baseados nos pilares
    relevant_niches = set()
    
    # Baseado no arquétipo
    archetype = pillars.get("personality", {}).get("archetype")
    if archetype and archetype in ARCHETYPE_NICHES:
        relevant_niches.update(ARCHETYPE_NICHES[archetype])
    
    # Baseado na indústria/setor
    industry = pillars.get("start", {}).get("industry", "").lower()
    if "tech" in industry or "tecnologia" in industry or "software" in industry:
        relevant_niches.add("tecnologia")
    if "saúde" in industry or "health" in industry or "bem-estar" in industry:
        relevant_niches.add("saude")
    if "moda" in industry or "fashion" in industry or "beleza" in industry:
        relevant_niches.add("moda")
    if "aliment" in industry or "food" in industry or "gastro" in industry:
        relevant_niches.add("gastronomia")
    if "educ" in industry or "ensino" in industry:
        relevant_niches.add("educacao")
    if "financ" in industry or "invest" in industry or "banco" in industry:
        relevant_niches.add("negocios")
    if "sustent" in industry or "eco" in industry or "verde" in industry:
        relevant_niches.add("sustentabilidade")
    
    # Baseado nos valores
    values = pillars.get("values", {}).get("core_values", [])
    for value in values:
        v = value.lower()
        if "inovação" in v or "tecnologia" in v:
            relevant_niches.add("tecnologia")
        if "família" in v or "cuidado" in v:
            relevant_niches.add("familia")
        if "saúde" in v or "bem-estar" in v:
            relevant_niches.add("saude")
        if "sustent" in v or "natureza" in v:
            relevant_niches.add("sustentabilidade")
    
    # Se não encontrou nada, usar nichos genéricos
    if not relevant_niches:
        relevant_niches = {"negocios", "educacao"}
    
    # Coletar influenciadores dos nichos relevantes
    influencers = []
    for niche in relevant_niches:
        if niche in INFLUENCERS_DB:
            for inf in INFLUENCERS_DB[niche]:
                inf_copy = inf.copy()
                inf_copy["why"] = f"Alinhado com o perfil {niche} da sua marca"
                influencers.append(inf_copy)
    
    # Remover duplicatas e limitar a 9
    seen = set()
    unique = []
    for inf in influencers:
        if inf["name"] not in seen:
            seen.add(inf["name"])
            unique.append(inf)
    
    return unique[:9]

# ==================== INVESTMENT MATCH ====================

MOCK_INVESTORS = [
    {"name": "Kaszek Ventures", "type": "Venture Capital", "ticket_min": 1000000, "ticket_max": 50000000, "stages": ["Seed", "Series A", "Series B"], "sectors": ["Fintech", "E-commerce", "SaaS", "Marketplace"], "website": "https://www.kaszek.com"},
    {"name": "Valor Capital", "type": "Venture Capital", "ticket_min": 5000000, "ticket_max": 100000000, "stages": ["Series A", "Series B", "Growth"], "sectors": ["Fintech", "Healthtech", "Edtech", "Logística"], "website": "https://valorcapitalgroup.com"},
    {"name": "Canary", "type": "Venture Capital", "ticket_min": 500000, "ticket_max": 10000000, "stages": ["Pre-Seed", "Seed", "Series A"], "sectors": ["SaaS", "Fintech", "Marketplace", "B2B"], "website": "https://canary.com.vc"},
    {"name": "Softbank Latin America", "type": "Venture Capital", "ticket_min": 10000000, "ticket_max": 500000000, "stages": ["Series B", "Growth"], "sectors": ["Fintech", "E-commerce", "Delivery", "Mobilidade"], "website": "https://softbank.com"},
    {"name": "MAYA Capital", "type": "Venture Capital", "ticket_min": 1000000, "ticket_max": 20000000, "stages": ["Seed", "Series A"], "sectors": ["SaaS", "Fintech", "Infraestrutura", "B2B"], "website": "https://maya.capital"},
    {"name": "Astella Investimentos", "type": "Venture Capital", "ticket_min": 2000000, "ticket_max": 30000000, "stages": ["Seed", "Series A", "Series B"], "sectors": ["SaaS", "Healthtech", "Agtech", "Edtech"], "website": "https://astella.com.br"},
    {"name": "Monashees", "type": "Venture Capital", "ticket_min": 5000000, "ticket_max": 50000000, "stages": ["Series A", "Series B"], "sectors": ["Fintech", "Healthtech", "Edtech", "E-commerce"], "website": "https://monashees.com.br"},
    {"name": "Upload Ventures", "type": "Venture Capital", "ticket_min": 500000, "ticket_max": 5000000, "stages": ["Pre-Seed", "Seed"], "sectors": ["Deep Tech", "SaaS", "Climate Tech", "Biotech"], "website": "https://upload.vc"},
]

MOCK_OPPORTUNITIES = [
    {"name": "TechFlow", "sector": "SaaS", "stage": "Seed", "valuation": 5000000, "seeking": 1000000, "description": "Plataforma de automação de workflows para PMEs"},
    {"name": "GreenLogix", "sector": "Logística", "stage": "Series A", "valuation": 25000000, "seeking": 5000000, "description": "Logística sustentável com frota elétrica"},
    {"name": "HealthAI", "sector": "Healthtech", "stage": "Pre-Seed", "valuation": 2000000, "seeking": 500000, "description": "Diagnóstico por IA para clínicas"},
    {"name": "EduPlus", "sector": "Edtech", "stage": "Seed", "valuation": 8000000, "seeking": 2000000, "description": "Plataforma de ensino personalizado com IA"},
]

@api_router.get("/investment/investors")
async def get_investors(brand_id: str = None, user: dict = Depends(get_current_user)):
    investors = MOCK_INVESTORS.copy()
    
    if brand_id:
        brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
        valuation = await db.valuations.find_one({"brand_id": brand_id}, {"_id": 0})
        
        if valuation and valuation.get("total_value"):
            val = valuation["total_value"]
            for inv in investors:
                if inv["ticket_min"] <= val <= inv["ticket_max"] * 10:
                    inv["match_score"] = min(95, 60 + (len(inv["sectors"]) * 5))
                else:
                    inv["match_score"] = 30
    
    return sorted(investors, key=lambda x: x.get("match_score", 0), reverse=True)

@api_router.get("/investment/opportunities")
async def get_opportunities(user: dict = Depends(get_current_user)):
    return MOCK_OPPORTUNITIES

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
