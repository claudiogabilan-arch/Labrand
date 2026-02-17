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
import json

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
    "free": {
        "name": "Grátis",
        "max_brands": 1,
        "ai_requests_per_month": 5,
        "features": ["1 marca", "7 pilares básicos", "Dashboard"],
        "price_monthly": 0
    },
    "founder": {
        "name": "Founder",
        "max_brands": 1,
        "ai_requests_per_month": 20,
        "features": ["1 marca", "Todos os pilares", "Valuation básico", "20 requisições IA/mês"],
        "price_monthly": 59.90
    },
    "pro": {
        "name": "Pro",
        "max_brands": 3,
        "ai_requests_per_month": 50,
        "features": ["3 marcas", "Todos os pilares", "Exportação PDF", "Integração Google", "50 requisições IA/mês"],
        "price_monthly": 97
    },
    "consultor": {
        "name": "Consultor", 
        "max_brands": 5,
        "ai_requests_per_month": 100,
        "features": ["5 marcas", "Todos os pilares", "Valuation completo", "Benchmark setorial", "Exportação PDF", "100 requisições IA/mês"],
        "price_monthly": 197
    },
    "enterprise": {
        "name": "Enterprise",
        "max_brands": -1,
        "ai_requests_per_month": -1,
        "features": ["Marcas ilimitadas", "Dashboard executivo", "API access", "Suporte prioritário", "White label", "IA ilimitada"],
        "price_monthly": 497
    }
}

TRIAL_DAYS = 7

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
    
    # Gerar código de verificação
    verification_code = f"{uuid.uuid4().hex[:6].upper()}"
    
    # Salvar usuário pendente (não ativado)
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
    
    # Enviar email de verificação
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

class VerifyEmailRequest(BaseModel):
    email: str
    code: str

@api_router.post("/auth/verify-email")
async def verify_email(data: VerifyEmailRequest):
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
    
    # Enviar email de boas-vindas
    welcome_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h1 style="color: #1a1a1a; margin: 0 0 20px;">Bem-vindo ao LABrand! 🎉</h1>
            <p style="color: #444; font-size: 16px; line-height: 1.6;">Olá <strong>{user['name']}</strong>,</p>
            <p style="color: #444; font-size: 16px; line-height: 1.6;">Sua conta foi ativada com sucesso! Você agora tem acesso à plataforma de gestão estratégica de marca mais completa do mercado.</p>
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); border-radius: 8px; padding: 24px; margin: 24px 0;">
                <p style="color: white; margin: 0; font-size: 14px;">Seu plano atual</p>
                <p style="color: white; margin: 8px 0 0; font-size: 24px; font-weight: bold;">Founder + 15 dias grátis</p>
            </div>
            <p style="color: #444; font-size: 16px; line-height: 1.6;">Próximos passos:</p>
            <ul style="color: #444; font-size: 16px; line-height: 1.8;">
                <li>Complete seu onboarding</li>
                <li>Crie sua primeira marca</li>
                <li>Preencha os pilares estratégicos</li>
                <li>Descubra o valor da sua marca</li>
            </ul>
            <a href="https://labrand.com.br/dashboard" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 16px;">Acessar Plataforma</a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 24px;">LABrand - Brand OS | Transforme sua marca em ativo estratégico</p>
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

class ResendCodeRequest(BaseModel):
    email: str

@api_router.post("/auth/resend-code")
async def resend_verification_code(data: ResendCodeRequest):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        return {"message": "Se o email existir, enviaremos um novo código"}
    
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email já verificado")
    
    # Gerar novo código
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
        <p>Digite este código na tela de verificação.</p>
    </div>
    """
    await send_email(data.email, "Novo Código - LABrand", html)
    
    return {"message": "Novo código enviado para seu email"}

@api_router.post("/auth/login")
async def login(user_data: UserLogin, response: Response):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    # Verificar se email foi confirmado
    if not user.get("email_verified", True):  # True para usuários antigos
        raise HTTPException(status_code=403, detail="Email não verificado. Verifique sua caixa de entrada.")
    
    # Verificar senha com tratamento de erro para hashes inválidos
    stored_password = user.get("password")
    if not stored_password:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    try:
        password_valid = pwd_context.verify(user_data.password, stored_password)
    except Exception:
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
        "onboarding_completed": user.get("onboarding_completed", False),
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
        # Domínio labrand.com.br verificado no Resend
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

# ==================== ONBOARDING ====================

class OnboardingData(BaseModel):
    user_type: str  # estrategista, agencia, grupo_empresarial
    sector: str
    revenue_range: str  # ate_1m, 1m_10m, 10m_50m, 50m_plus
    brand_maturity: str  # inicial, estruturada, avancada
    main_objective: str  # valuation, estruturacao, captacao, governanca

@api_router.post("/user/onboarding")
async def complete_onboarding(data: OnboardingData, user: dict = Depends(get_current_user)):
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

@api_router.get("/user/onboarding")
async def get_onboarding_status(user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {
        "onboarding_completed": user_data.get("onboarding_completed", False),
        "onboarding_data": user_data.get("onboarding_data", {}),
        "user_type": user_data.get("user_type", "estrategista")
    }

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
        "picture": user.get("picture"),
        "onboarding_completed": user.get("onboarding_completed", False),
        "email_verified": user.get("email_verified", False),
        "plan": user.get("plan", "founder"),
        "user_type": user.get("user_type", "estrategista")
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

@api_router.get("/brands/{brand_id}/executive-summary")
async def get_executive_summary(brand_id: str, user: dict = Depends(get_current_user)):
    """Dashboard executivo com métricas simplificadas"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    pillars = await db.pillars.find_one({"brand_id": brand_id}, {"_id": 0})
    valuation = await db.valuations.find_one({"brand_id": brand_id}, {"_id": 0})
    
    # Calcular Brand Strength baseado nos pilares preenchidos
    pillar_keys = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    filled = sum(1 for k in pillar_keys if pillars and pillars.get(k) and len(pillars.get(k, {})) > 0)
    brand_strength = int((filled / len(pillar_keys)) * 100) if pillars else 0
    
    # Role of Brand Index (simplificado)
    rbi = valuation.get("role_of_brand", 50) if valuation else 50
    
    # Valor da marca
    brand_value = valuation.get("total_value", 0) if valuation else 0
    
    # Identificar riscos e oportunidades baseados nos pilares
    risks = []
    opportunities = []
    
    if not pillars or not pillars.get("values"):
        risks.append("Valores da marca não definidos - risco de inconsistência")
    else:
        opportunities.append("Valores bem definidos fortalecem cultura organizacional")
    
    if not pillars or not pillars.get("positioning"):
        risks.append("Posicionamento não estruturado - dificuldade de diferenciação")
    else:
        opportunities.append("Posicionamento claro permite comunicação mais efetiva")
    
    if not pillars or not pillars.get("purpose"):
        risks.append("Propósito não definido - engajamento limitado com stakeholders")
    else:
        opportunities.append("Propósito forte atrai talentos e clientes alinhados")
    
    if brand_strength < 50:
        risks.append("Brand Strength abaixo de 50% - marca vulnerável a concorrentes")
    elif brand_strength >= 80:
        opportunities.append("Brand Strength alto - potencial para expansão de mercado")
    
    # Trend baseado em histórico (simplificado)
    trend = "stable"
    if brand_strength >= 70:
        trend = "up"
    elif brand_strength < 30:
        trend = "down"
    
    return {
        "brand_strength": brand_strength,
        "role_of_brand": rbi,
        "valuation": brand_value,
        "trend": trend,
        "risks": risks[:3],
        "opportunities": opportunities[:3]
    }

@api_router.get("/brands/{brand_id}/benchmark")
async def get_benchmark(brand_id: str, user: dict = Depends(get_current_user)):
    """Benchmark setorial da marca"""
    pillars = await db.pillars.find_one({"brand_id": brand_id}, {"_id": 0})
    valuation = await db.valuations.find_one({"brand_id": brand_id}, {"_id": 0})
    
    # Determinar setor
    sector = pillars.get("start", {}).get("industry", "default") if pillars else "default"
    
    # Calcular métricas
    pillar_keys = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    filled = sum(1 for k in pillar_keys if pillars and pillars.get(k) and len(pillars.get(k, {})) > 0)
    brand_strength = int((filled / len(pillar_keys)) * 100) if pillars else 0
    rbi = valuation.get("role_of_brand", 50) if valuation else 50
    
    # Calcular percentil (simplificado - baseado no brand strength)
    percentile = min(95, max(5, brand_strength + 10))
    
    return {
        "sector": sector,
        "brand_strength": brand_strength,
        "rbi": rbi,
        "percentile": percentile
    }

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

@api_router.post("/ai/insights")
async def generate_ai_insight(data: dict, user: dict = Depends(get_current_user)):
    try:
        # Check and deduct AI credits
        success, result = await deduct_ai_credits(user["user_id"], "suggestion")
        if not success:
            raise HTTPException(status_code=402, detail=result)
        
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
        user_prompt = f"Marca: {brand_name}\n\nContexto:\n{context}\n\nGere insights estratégicos e acionáveis:"
        
        response = await call_llm(system_prompt, user_prompt)
        
        return {"insight": response, "credits_used": result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"AI insight error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/mentor")
async def generate_mentor_insights(data: dict, user: dict = Depends(get_current_user)):
    try:
        # Check and deduct AI credits
        success, result = await deduct_ai_credits(user["user_id"], "mentor_insight")
        if not success:
            raise HTTPException(status_code=402, detail=result)
        
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

        user_prompt = f"Dados da marca:\n{context}\n\nGere insights de mentor:"
        
        response = await call_llm(system_prompt, user_prompt)
        
        return {"insights": response, "credits_used": result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Mentor error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== BRAND WAY (JEITO DE SER) ====================

@api_router.get("/brands/{brand_id}/brand-way")
async def get_brand_way(brand_id: str, user: dict = Depends(get_current_user)):
    """Get brand way/identity data"""
    data = await db.brand_way.find_one({"brand_id": brand_id}, {"_id": 0})
    return data or {}

@api_router.put("/brands/{brand_id}/brand-way")
async def update_brand_way(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update brand way/identity data"""
    data["brand_id"] = brand_id
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    existing = await db.brand_way.find_one({"brand_id": brand_id})
    if existing:
        await db.brand_way.update_one({"brand_id": brand_id}, {"$set": data})
    else:
        await db.brand_way.insert_one(data)
    
    result = await db.brand_way.find_one({"brand_id": brand_id}, {"_id": 0})
    return result

@api_router.post("/ai/brand-way")
async def generate_brand_way_suggestions(data: dict, user: dict = Depends(get_current_user)):
    """Generate AI suggestions for brand way dimensions"""
    try:
        # Check and deduct AI credits
        success, result = await deduct_ai_credits(user["user_id"], "brand_way_suggestion")
        if not success:
            raise HTTPException(status_code=402, detail=result)
        
        dimension = data.get("dimension", "proposito")
        brand_name = data.get("brand_name", "Marca")
        industry = data.get("industry", "")
        current_data = data.get("current_data", {})
        
        prompts = {
            "proposito": f"""Analise a marca "{brand_name}" do setor "{industry}" e sugira:
1. Uma declaração de propósito inspiradora (por que a empresa existe além do lucro)
2. O impacto que a marca gera no mundo
3. 3 evidências de como o propósito se manifesta

Retorne em formato JSON:
{{"declaracao": "...", "impacto": "...", "evidencias": ["...", "...", "..."]}}""",

            "valores": f"""Para a marca "{brand_name}" do setor "{industry}", sugira:
5 valores de marca autênticos e diferenciadores, com descrições práticas.

Retorne em formato JSON:
{{"lista": ["Valor1", "Valor2", ...], "descricoes": {{"Valor1": "descrição...", ...}}}}""",

            "personalidade": f"""Se a marca "{brand_name}" fosse uma pessoa, como seria?
Sugira:
1. Arquétipo principal (de Jung)
2. Arquétipo secundário
3. 5 atributos de personalidade

Retorne em formato JSON:
{{"arquetipo_principal": "...", "arquetipo_secundario": "...", "atributos": ["...", ...]}}""",

            "tom_voz": f"""Defina o tom de voz para a marca "{brand_name}" do setor "{industry}":
1. Estilo de comunicação (descrição)
2. 3 exemplos do que a marca FAZ na comunicação
3. 3 exemplos do que a marca NÃO faz

Retorne em formato JSON:
{{"estilo": "...", "exemplos_fazer": ["...", ...], "exemplos_evitar": ["...", ...]}}""",

            "comportamentos": f"""Defina comportamentos para a marca "{brand_name}":
1. 3 comportamentos internos (com colaboradores)
2. 3 comportamentos externos (com clientes)
3. 2 rituais da marca

Retorne em formato JSON:
{{"internos": ["...", ...], "externos": ["...", ...], "rituais": ["...", ...]}}""",

            "promessa": f"""Defina a promessa de marca para "{brand_name}" do setor "{industry}":
1. Declaração de promessa central
2. Entrega funcional (o que o cliente recebe)
3. Entrega emocional (como se sente)
4. Entrega aspiracional (o que pode se tornar)

Retorne em formato JSON:
{{"declaracao": "...", "funcional": "...", "emocional": "...", "aspiracional": "..."}}"""
        }
        
        prompt = prompts.get(dimension, prompts["proposito"])
        system_prompt = "Você é um especialista em branding e estratégia de marca. Responda APENAS em JSON válido, sem markdown ou explicações adicionais. Use português do Brasil."
        
        response = await call_llm(system_prompt, prompt)
        
        # Parse JSON response
        import json
        try:
            # Clean response - remove markdown code blocks if present
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            suggestions = json.loads(clean_response)
        except json.JSONDecodeError:
            # If JSON parsing fails, return as text
            suggestions = {"raw": response}
        
        return {"suggestions": suggestions}
    except Exception as e:
        logging.error(f"Brand way AI error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== BRAND RISK MODULE ====================

@api_router.get("/brands/{brand_id}/risk-analysis")
async def get_risk_analysis(brand_id: str, user: dict = Depends(get_current_user)):
    """Get brand risk analysis"""
    data = await db.brand_risk.find_one({"brand_id": brand_id}, {"_id": 0})
    return data or {}

@api_router.post("/brands/{brand_id}/risk-analysis")
async def analyze_brand_risks(brand_id: str, user: dict = Depends(get_current_user)):
    """Analyze brand risks using AI"""
    try:
        # Check and deduct AI credits
        success, result = await deduct_ai_credits(user["user_id"], "risk_analysis")
        if not success:
            raise HTTPException(status_code=402, detail=result)
        
        # Get brand data
        brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
        brand_way = await db.brand_way.find_one({"brand_id": brand_id}, {"_id": 0})
        pillars = {}
        for pillar in ['start', 'values', 'purpose', 'promise', 'positioning', 'personality', 'universality']:
            data = await db[f"pillar_{pillar}"].find_one({"brand_id": brand_id}, {"_id": 0})
            if data:
                pillars[pillar] = data
        
        context = f"""
        Marca: {brand.get('name', 'N/A') if brand else 'N/A'}
        Indústria: {brand.get('industry', 'N/A') if brand else 'N/A'}
        Jeito de Ser: {json.dumps(brand_way, ensure_ascii=False) if brand_way else 'Não definido'}
        Pilares: {json.dumps(pillars, ensure_ascii=False)}
        """
        
        system_prompt = "Você é um analista de risco de marca especializado. Analise os dados e retorne APENAS JSON válido."
        
        prompt = f"""Analise os riscos da marca com base nos dados fornecidos:
        {context}
        
        Retorne um JSON com a seguinte estrutura:
        {{
            "risks": {{
                "reputacional": {{"score": 0-100, "factors": ["fator1", "fator2", "fator3"]}},
                "competitivo": {{"score": 0-100, "factors": ["fator1", "fator2", "fator3"]}},
                "operacional": {{"score": 0-100, "factors": ["fator1", "fator2", "fator3"]}},
                "legal": {{"score": 0-100, "factors": ["fator1", "fator2", "fator3"]}},
                "cultural": {{"score": 0-100, "factors": ["fator1", "fator2", "fator3"]}}
            }},
            "recommendations": ["recomendação1", "recomendação2", "recomendação3", "recomendação4", "recomendação5"]
        }}
        
        Score: 0=sem risco, 100=risco máximo. Seja realista baseado nos dados disponíveis."""
        
        response = await call_llm(system_prompt, prompt)
        
        # Parse response
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        
        risk_data = json.loads(clean_response)
        risk_data["brand_id"] = brand_id
        risk_data["analyzed_at"] = datetime.now(timezone.utc).isoformat()
        risk_data["credits_used"] = result
        
        # Save to DB
        await db.brand_risk.update_one(
            {"brand_id": brand_id},
            {"$set": risk_data},
            upsert=True
        )
        
        return risk_data
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Risk analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== COMPETITOR ANALYSIS ====================

@api_router.get("/brands/{brand_id}/competitors")
async def get_competitors(brand_id: str, user: dict = Depends(get_current_user)):
    """Get competitor analysis data"""
    data = await db.competitors.find_one({"brand_id": brand_id}, {"_id": 0})
    return data or {"competitors": [], "my_brand_scores": {}}

@api_router.put("/brands/{brand_id}/competitors")
async def update_competitors(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update competitor analysis data"""
    data["brand_id"] = brand_id
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.competitors.update_one(
        {"brand_id": brand_id},
        {"$set": data},
        upsert=True
    )
    
    result = await db.competitors.find_one({"brand_id": brand_id}, {"_id": 0})
    return result

# ==================== CONSISTENCY ALERTS ====================

@api_router.get("/brands/{brand_id}/consistency-alerts")
async def get_consistency_alerts(brand_id: str, user: dict = Depends(get_current_user)):
    """Get consistency alerts"""
    data = await db.consistency_alerts.find_one({"brand_id": brand_id}, {"_id": 0})
    return data or {}

@api_router.post("/brands/{brand_id}/consistency-alerts")
async def analyze_consistency(brand_id: str, user: dict = Depends(get_current_user)):
    """Analyze brand consistency using AI"""
    try:
        # Get all brand data
        brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
        brand_way = await db.brand_way.find_one({"brand_id": brand_id}, {"_id": 0})
        
        pillars = {}
        for pillar in ['start', 'values', 'purpose', 'promise', 'positioning', 'personality', 'universality']:
            data = await db[f"pillar_{pillar}"].find_one({"brand_id": brand_id}, {"_id": 0})
            if data:
                pillars[pillar] = data
        
        context = f"""
        Marca: {brand.get('name', 'N/A') if brand else 'N/A'}
        Jeito de Ser: {json.dumps(brand_way, ensure_ascii=False) if brand_way else 'Não definido'}
        Pilares: {json.dumps(pillars, ensure_ascii=False)}
        """
        
        system_prompt = "Você é um especialista em consistência de marca. Analise os dados e identifique inconsistências entre os pilares. Retorne APENAS JSON válido."
        
        prompt = f"""Analise a consistência entre os pilares da marca:
        {context}
        
        Identifique:
        1. Inconsistências graves (type: "error") - contradições diretas entre pilares
        2. Alertas de atenção (type: "warning") - desalinhamentos menores
        3. Pontos consistentes (type: "success") - onde a marca está alinhada
        4. Sugestões de melhoria (type: "info") - oportunidades de fortalecimento
        
        Retorne JSON:
        {{
            "alerts": [
                {{
                    "type": "error|warning|success|info",
                    "title": "Título do alerta",
                    "description": "Descrição detalhada",
                    "suggestion": "Sugestão de correção (opcional)",
                    "pillars": ["pilar1", "pilar2"] (pilares envolvidos, opcional)
                }}
            ]
        }}
        
        Seja específico e construtivo. Mínimo 5 alertas, máximo 12."""
        
        response = await call_llm(system_prompt, prompt)
        
        # Parse response
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        
        alerts_data = json.loads(clean_response)
        alerts_data["brand_id"] = brand_id
        alerts_data["analyzed_at"] = datetime.now(timezone.utc).isoformat()
        
        # Save to DB
        await db.consistency_alerts.update_one(
            {"brand_id": brand_id},
            {"$set": alerts_data},
            upsert=True
        )
        
        return alerts_data
    except Exception as e:
        logging.error(f"Consistency analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== GOOGLE INTEGRATION (REAL OAUTH) ====================

from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# Google OAuth scopes
GOOGLE_ANALYTICS_SCOPES = [
    'https://www.googleapis.com/auth/analytics.readonly'
]
GOOGLE_SEARCH_CONSOLE_SCOPES = [
    'https://www.googleapis.com/auth/webmasters.readonly'
]

def get_google_oauth_flow(scopes: list, redirect_uri: str):
    """Create Google OAuth flow"""
    client_config = {
        "web": {
            "client_id": os.environ.get("GOOGLE_CLIENT_ID"),
            "client_secret": os.environ.get("GOOGLE_CLIENT_SECRET"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }
    flow = Flow.from_client_config(client_config, scopes=scopes)
    flow.redirect_uri = redirect_uri
    return flow

@api_router.get("/brands/{brand_id}/google-integration")
async def get_google_integration(brand_id: str, user: dict = Depends(get_current_user)):
    """Get Google integration data"""
    data = await db.google_integration.find_one({"brand_id": brand_id}, {"_id": 0})
    if not data:
        return {
            "connection_status": {"analytics": False, "searchConsole": False},
            "analytics": None,
            "search_console": None,
            "property_id": "",
            "site_url": ""
        }
    # Remove sensitive token data from response
    safe_data = {k: v for k, v in data.items() if k not in ['analytics_tokens', 'search_console_tokens']}
    return safe_data

@api_router.post("/brands/{brand_id}/google-integration/init-oauth")
async def init_google_oauth(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Initialize Google OAuth flow"""
    service = data.get("service")  # 'analytics' or 'searchConsole'
    property_id = data.get("property_id", "")
    site_url = data.get("site_url", "")
    
    # Determine redirect URI based on environment
    frontend_url = os.environ.get("FRONTEND_URL", "https://labrand.com.br")
    redirect_uri = f"{frontend_url}/api/google/callback"
    
    # Select scopes based on service
    if service == "analytics":
        scopes = GOOGLE_ANALYTICS_SCOPES
    else:
        scopes = GOOGLE_SEARCH_CONSOLE_SCOPES
    
    flow = get_google_oauth_flow(scopes, redirect_uri)
    
    # Generate authorization URL
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    # Store state and pending connection info
    await db.google_oauth_state.update_one(
        {"state": state},
        {"$set": {
            "state": state,
            "brand_id": brand_id,
            "user_id": user["user_id"],
            "service": service,
            "property_id": property_id,
            "site_url": site_url,
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"auth_url": auth_url, "state": state}

@api_router.get("/google/callback")
async def google_oauth_callback(code: str = None, state: str = None, error: str = None):
    """Handle Google OAuth callback"""
    if error:
        return RedirectResponse(url=f"{FRONTEND_URL}/google-integration?error={error}")
    
    if not code or not state:
        return RedirectResponse(url=f"{FRONTEND_URL}/google-integration?error=missing_params")
    
    # Get stored state info
    state_data = await db.google_oauth_state.find_one({"state": state})
    if not state_data:
        return RedirectResponse(url=f"{FRONTEND_URL}/google-integration?error=invalid_state")
    
    brand_id = state_data["brand_id"]
    service = state_data["service"]
    property_id = state_data.get("property_id", "")
    site_url = state_data.get("site_url", "")
    
    try:
        # Determine redirect URI
        frontend_url = os.environ.get("FRONTEND_URL", "https://labrand.com.br")
        redirect_uri = f"{frontend_url}/api/google/callback"
        
        # Select scopes
        scopes = GOOGLE_ANALYTICS_SCOPES if service == "analytics" else GOOGLE_SEARCH_CONSOLE_SCOPES
        
        # Exchange code for tokens
        flow = get_google_oauth_flow(scopes, redirect_uri)
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Store tokens
        token_data = {
            "token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": list(credentials.scopes) if credentials.scopes else scopes
        }
        
        # Update integration data
        integration_data = await db.google_integration.find_one({"brand_id": brand_id}) or {}
        connection_status = integration_data.get("connection_status", {"analytics": False, "searchConsole": False})
        
        if service == "analytics":
            connection_status["analytics"] = True
            update_data = {
                "brand_id": brand_id,
                "connection_status": connection_status,
                "property_id": property_id,
                "analytics_tokens": token_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        else:
            connection_status["searchConsole"] = True
            update_data = {
                "brand_id": brand_id,
                "connection_status": connection_status,
                "site_url": site_url,
                "search_console_tokens": token_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        
        await db.google_integration.update_one(
            {"brand_id": brand_id},
            {"$set": update_data},
            upsert=True
        )
        
        # Clean up state
        await db.google_oauth_state.delete_one({"state": state})
        
        # Fetch initial data
        await fetch_google_data(brand_id, service)
        
        return RedirectResponse(url=f"{FRONTEND_URL}/google-integration?success=true&service={service}")
        
    except Exception as e:
        logging.error(f"Google OAuth callback error: {str(e)}")
        return RedirectResponse(url=f"{FRONTEND_URL}/google-integration?error=token_exchange_failed")

async def get_google_credentials(brand_id: str, service: str):
    """Get valid Google credentials for a brand"""
    integration = await db.google_integration.find_one({"brand_id": brand_id})
    if not integration:
        return None
    
    token_key = "analytics_tokens" if service == "analytics" else "search_console_tokens"
    token_data = integration.get(token_key)
    if not token_data:
        return None
    
    credentials = Credentials(
        token=token_data.get("token"),
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri"),
        client_id=token_data.get("client_id"),
        client_secret=token_data.get("client_secret"),
        scopes=token_data.get("scopes")
    )
    
    # Check if token is expired and refresh if needed
    if credentials.expired and credentials.refresh_token:
        from google.auth.transport.requests import Request
        credentials.refresh(Request())
        # Update stored tokens
        new_token_data = {
            **token_data,
            "token": credentials.token
        }
        await db.google_integration.update_one(
            {"brand_id": brand_id},
            {"$set": {token_key: new_token_data}}
        )
    
    return credentials

async def fetch_google_data(brand_id: str, service: str):
    """Fetch data from Google APIs"""
    integration = await db.google_integration.find_one({"brand_id": brand_id})
    if not integration:
        return
    
    try:
        credentials = await get_google_credentials(brand_id, service)
        if not credentials:
            return
        
        if service == "analytics":
            property_id = integration.get("property_id", "")
            if not property_id:
                return
            
            # Build Analytics Data API client
            analytics = build('analyticsdata', 'v1beta', credentials=credentials)
            
            # Fetch metrics for last 30 days
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            prev_start = start_date - timedelta(days=30)
            prev_end = start_date - timedelta(days=1)
            
            # Current period metrics
            response = analytics.properties().runReport(
                property=f"properties/{property_id}",
                body={
                    "dateRanges": [
                        {"startDate": start_date.strftime("%Y-%m-%d"), "endDate": end_date.strftime("%Y-%m-%d")},
                        {"startDate": prev_start.strftime("%Y-%m-%d"), "endDate": prev_end.strftime("%Y-%m-%d")}
                    ],
                    "metrics": [
                        {"name": "activeUsers"},
                        {"name": "screenPageViews"},
                        {"name": "bounceRate"},
                        {"name": "averageSessionDuration"}
                    ]
                }
            ).execute()
            
            # Parse response
            rows = response.get("rows", [])
            current_metrics = rows[0]["metricValues"] if rows else [{"value": "0"}] * 4
            prev_metrics = rows[1]["metricValues"] if len(rows) > 1 else [{"value": "0"}] * 4
            
            users = int(current_metrics[0]["value"])
            prev_users = int(prev_metrics[0]["value"]) or 1
            pageviews = int(current_metrics[1]["value"])
            prev_pageviews = int(prev_metrics[1]["value"]) or 1
            bounce_rate = float(current_metrics[2]["value"]) * 100
            avg_duration = float(current_metrics[3]["value"])
            
            # Fetch top pages
            pages_response = analytics.properties().runReport(
                property=f"properties/{property_id}",
                body={
                    "dateRanges": [{"startDate": start_date.strftime("%Y-%m-%d"), "endDate": end_date.strftime("%Y-%m-%d")}],
                    "dimensions": [{"name": "pagePath"}],
                    "metrics": [{"name": "screenPageViews"}],
                    "limit": 5,
                    "orderBys": [{"metric": {"metricName": "screenPageViews"}, "desc": True}]
                }
            ).execute()
            
            top_pages = []
            for row in pages_response.get("rows", []):
                top_pages.append({
                    "path": row["dimensionValues"][0]["value"],
                    "views": int(row["metricValues"][0]["value"])
                })
            
            analytics_data = {
                "users": users,
                "users_change": ((users - prev_users) / prev_users) * 100,
                "pageviews": pageviews,
                "pageviews_change": ((pageviews - prev_pageviews) / prev_pageviews) * 100,
                "bounce_rate": round(bounce_rate, 1),
                "avg_session_duration": f"{int(avg_duration // 60)}:{int(avg_duration % 60):02d}",
                "top_pages": top_pages,
                "fetched_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.google_integration.update_one(
                {"brand_id": brand_id},
                {"$set": {"analytics": analytics_data}}
            )
            
        else:  # Search Console
            site_url = integration.get("site_url", "")
            if not site_url:
                return
            
            # Build Search Console API client
            search_console = build('searchconsole', 'v1', credentials=credentials)
            
            # Fetch metrics for last 30 days
            end_date = datetime.now() - timedelta(days=3)  # SC has 3-day delay
            start_date = end_date - timedelta(days=30)
            
            response = search_console.searchanalytics().query(
                siteUrl=site_url,
                body={
                    "startDate": start_date.strftime("%Y-%m-%d"),
                    "endDate": end_date.strftime("%Y-%m-%d"),
                    "dimensions": ["query"],
                    "rowLimit": 10
                }
            ).execute()
            
            rows = response.get("rows", [])
            total_clicks = sum(row.get("clicks", 0) for row in rows)
            total_impressions = sum(row.get("impressions", 0) for row in rows)
            avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
            avg_position = sum(row.get("position", 0) for row in rows) / len(rows) if rows else 0
            
            top_queries = []
            for row in rows[:5]:
                top_queries.append({
                    "query": row["keys"][0],
                    "clicks": row.get("clicks", 0),
                    "position": round(row.get("position", 0), 1)
                })
            
            search_data = {
                "clicks": total_clicks,
                "impressions": total_impressions,
                "ctr": round(avg_ctr, 1),
                "position": round(avg_position, 1),
                "top_queries": top_queries,
                "fetched_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.google_integration.update_one(
                {"brand_id": brand_id},
                {"$set": {"search_console": search_data}}
            )
            
    except Exception as e:
        logging.error(f"Error fetching Google data: {str(e)}")

@api_router.post("/brands/{brand_id}/google-integration/connect")
async def connect_google_service(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Initiate Google OAuth connection - returns auth URL"""
    return await init_google_oauth(brand_id, data, user)

@api_router.post("/brands/{brand_id}/google-integration/disconnect")
async def disconnect_google_service(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Disconnect Google service"""
    service = data.get("service")
    
    integration_data = await db.google_integration.find_one({"brand_id": brand_id})
    if integration_data:
        connection_status = integration_data.get("connection_status", {})
        if service == "analytics":
            connection_status["analytics"] = False
            await db.google_integration.update_one(
                {"brand_id": brand_id},
                {"$set": {"connection_status": connection_status, "analytics": None, "analytics_tokens": None}}
            )
        else:
            connection_status["searchConsole"] = False
            await db.google_integration.update_one(
                {"brand_id": brand_id},
                {"$set": {"connection_status": connection_status, "search_console": None, "search_console_tokens": None}}
            )
    
    return {"message": "Disconnected successfully"}

@api_router.post("/brands/{brand_id}/google-integration/refresh")
async def refresh_google_data_endpoint(brand_id: str, user: dict = Depends(get_current_user)):
    """Refresh Google data from APIs"""
    integration = await db.google_integration.find_one({"brand_id": brand_id})
    if not integration:
        raise HTTPException(status_code=404, detail="No integration found")
    
    connection_status = integration.get("connection_status", {})
    
    if connection_status.get("analytics"):
        await fetch_google_data(brand_id, "analytics")
    
    if connection_status.get("searchConsole"):
        await fetch_google_data(brand_id, "searchConsole")
    
    result = await db.google_integration.find_one({"brand_id": brand_id}, {"_id": 0})
    safe_result = {k: v for k, v in result.items() if k not in ['analytics_tokens', 'search_console_tokens']}
    return safe_result




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

@api_router.get("/auth/google/login")
async def google_login_init(request: Request):
    """Initiate Google OAuth flow for social login"""
    from urllib.parse import urlencode
    
    # Usar FRONTEND_URL para garantir consistência com Google Console
    redirect_uri = f"{FRONTEND_URL}/api/auth/google/login/callback"
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=auth_url)

@api_router.get("/auth/google/login/callback")
async def google_login_callback(request: Request, code: str = None, error: str = None):
    """Handle Google OAuth login callback"""
    from fastapi.responses import RedirectResponse
    
    redirect_uri = f"{FRONTEND_URL}/api/auth/google/login/callback"
    
    if error or not code:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=google_auth_failed")
    
    try:
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri
                }
            )
            
            if token_resp.status_code != 200:
                logging.error(f"Google token error: {token_resp.text}")
                return RedirectResponse(url=f"{FRONTEND_URL}/login?error=token_failed")
            
            tokens = token_resp.json()
            
            # Get user info
            user_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"}
            )
            
            if user_resp.status_code != 200:
                return RedirectResponse(url=f"{FRONTEND_URL}/login?error=userinfo_failed")
            
            google_user = user_resp.json()
        
        email = google_user.get("email")
        name = google_user.get("name", email.split("@")[0])
        picture = google_user.get("picture")
        
        # Check if user exists
        user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if not user:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "password": None,  # Google users don't have password
                "role": "estrategista",
                "user_type": "estrategista",
                "picture": picture,
                "plan": "founder",
                "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)).isoformat(),
                "ai_requests_used": 0,
                "onboarding_completed": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user)
        else:
            user_id = user["user_id"]
            # Update picture if changed
            if picture and picture != user.get("picture"):
                await db.users.update_one({"user_id": user_id}, {"$set": {"picture": picture}})
        
        # Create JWT token
        token = create_jwt_token(user_id, email, user.get("role", "estrategista"))
        
        # Redirect to dashboard with token
        redirect_url = f"{FRONTEND_URL}/dashboard?token={token}"
        if not user.get("onboarding_completed"):
            redirect_url = f"{FRONTEND_URL}/onboarding?token={token}"
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        logging.error(f"Google login error: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=server_error")

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

# ==================== STRIPE PAYMENTS ====================

from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Plan definitions with Stripe Price IDs
SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Grátis",
        "price": 0,
        "currency": "brl",
        "stripe_price_id": None,
        "features": ["1 marca", "Pilares básicos", "Dashboard simplificado"],
        "trial_days": 0
    },
    "essencial": {
        "name": "Essencial",
        "price": 997.00,
        "currency": "brl",
        "stripe_price_id": "price_1T1hUG5XQ1KrllP27JJftGwi",
        "features": ["1 marca", "Todos os pilares", "Brand Strength Score", "Valuation básico", "Relatório PDF"],
        "trial_days": 7
    },
    "executivo": {
        "name": "Executivo", 
        "price": 1997.00,
        "currency": "brl",
        "stripe_price_id": "price_1T1hWU5XQ1KrllP2yLGkblqv",
        "features": ["Até 5 marcas", "Dashboard Executivo", "Benchmark Setorial", "Simulador Estratégico", "Módulo de Risco", "Suporte prioritário"],
        "trial_days": 7
    },
    "enterprise": {
        "name": "Enterprise",
        "price": None,
        "currency": "brl",
        "stripe_price_id": None,
        "features": ["Marcas ilimitadas", "API access", "White label", "Onboarding dedicado", "SLA garantido"],
        "trial_days": 0
    }
}

# Feature access by plan
FEATURE_ACCESS = {
    "free": ["dashboard", "brand_way", "start", "values", "purpose"],
    "essencial": ["dashboard", "brand_way", "start", "values", "purpose", "promise", "positioning", "personality", "universality", "valuation", "reports", "maturity"],
    "executivo": ["dashboard", "brand_way", "start", "values", "purpose", "promise", "positioning", "personality", "universality", "valuation", "reports", "maturity", "executive", "benchmark", "simulator", "risk", "consistency", "competitors", "google_integration", "ai_mentor"],
    "enterprise": ["all"]
}

PRO_FEATURES = {
    "executive": {"name": "Dashboard Executivo", "min_plan": "executivo"},
    "benchmark": {"name": "Benchmark Setorial", "min_plan": "executivo"},
    "simulator": {"name": "Simulador Estratégico", "min_plan": "executivo"},
    "risk": {"name": "Módulo de Risco", "min_plan": "executivo"},
    "consistency": {"name": "Alertas de Consistência", "min_plan": "executivo"},
    "competitors": {"name": "Comparador de Concorrentes", "min_plan": "executivo"},
    "google_integration": {"name": "Google Analytics", "min_plan": "executivo"},
    "valuation": {"name": "Valuation de Marca", "min_plan": "essencial"},
    "reports": {"name": "Relatórios PDF", "min_plan": "essencial"},
    "maturity": {"name": "Diagnóstico de Maturidade", "min_plan": "essencial"},
}

@api_router.get("/user/feature-access")
async def get_feature_access(user: dict = Depends(get_current_user)):
    """Get user's feature access based on plan"""
    user_data = await db.users.find_one({"user_id": user["user_id"]})
    plan = user_data.get("plan", "free") if user_data else "free"
    
    # Check if in trial
    trial_ends = user_data.get("trial_ends_at") if user_data else None
    in_trial = False
    if trial_ends:
        trial_end_date = datetime.fromisoformat(trial_ends.replace('Z', '+00:00'))
        in_trial = datetime.now(timezone.utc) < trial_end_date
    
    # Get accessible features
    if plan == "enterprise" or (in_trial and plan in ["essencial", "executivo"]):
        accessible = FEATURE_ACCESS.get(plan, FEATURE_ACCESS["free"])
    else:
        accessible = FEATURE_ACCESS.get(plan, FEATURE_ACCESS["free"])
    
    return {
        "plan": plan,
        "plan_name": SUBSCRIPTION_PLANS.get(plan, {}).get("name", "Grátis"),
        "in_trial": in_trial,
        "trial_ends_at": trial_ends,
        "accessible_features": accessible,
        "pro_features": PRO_FEATURES
    }

@api_router.post("/payments/create-checkout")
async def create_checkout_session(request: Request, data: dict, user: dict = Depends(get_current_user)):
    """Create Stripe checkout session for subscription"""
    plan_id = data.get("plan_id")
    origin_url = data.get("origin_url")
    
    if not plan_id or plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Plano inválido")
    
    plan = SUBSCRIPTION_PLANS[plan_id]
    
    if plan["price"] is None:
        raise HTTPException(status_code=400, detail="Entre em contato para plano Enterprise")
    
    if not origin_url:
        origin_url = os.environ.get("FRONTEND_URL", "https://labrand.com.br")
    
    try:
        # Initialize Stripe
        stripe_api_key = os.environ.get("STRIPE_API_KEY")
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        # Create checkout session
        success_url = f"{origin_url}/plans?session_id={{CHECKOUT_SESSION_ID}}&success=true"
        cancel_url = f"{origin_url}/plans?canceled=true"
        
        checkout_request = CheckoutSessionRequest(
            amount=plan["price"],
            currency=plan["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user["user_id"],
                "user_email": user["email"],
                "plan_id": plan_id,
                "plan_name": plan["name"]
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction = {
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "session_id": session.session_id,
            "user_id": user["user_id"],
            "user_email": user["email"],
            "plan_id": plan_id,
            "plan_name": plan["name"],
            "amount": plan["price"],
            "currency": plan["currency"],
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payment_transactions.insert_one(transaction)
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        logging.error(f"Stripe checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Get payment status and update user plan if successful"""
    try:
        stripe_api_key = os.environ.get("STRIPE_API_KEY")
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Get transaction from DB
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        
        if transaction and transaction.get("payment_status") != "paid":
            # Update transaction status
            new_status = "paid" if status.payment_status == "paid" else status.payment_status
            
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": new_status,
                    "stripe_status": status.status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # If payment successful, update user plan
            if status.payment_status == "paid":
                plan_id = transaction.get("plan_id")
                trial_end = datetime.now(timezone.utc) + timedelta(days=SUBSCRIPTION_PLANS[plan_id]["trial_days"])
                
                await db.users.update_one(
                    {"user_id": transaction["user_id"]},
                    {"$set": {
                        "plan": plan_id,
                        "plan_name": SUBSCRIPTION_PLANS[plan_id]["name"],
                        "subscription_status": "active",
                        "trial_ends_at": trial_end.isoformat(),
                        "plan_updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency
        }
        
    except Exception as e:
        logging.error(f"Payment status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        stripe_api_key = os.environ.get("STRIPE_API_KEY")
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logging.info(f"Stripe webhook received: {webhook_response.event_type}")
        
        # Handle checkout.session.completed event
        if webhook_response.event_type == "checkout.session.completed":
            session_id = webhook_response.session_id
            metadata = webhook_response.metadata
            
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "webhook_received_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update user plan
            if metadata:
                user_id = metadata.get("user_id")
                plan_id = metadata.get("plan_id")
                
                if user_id and plan_id and plan_id in SUBSCRIPTION_PLANS:
                    trial_end = datetime.now(timezone.utc) + timedelta(days=SUBSCRIPTION_PLANS[plan_id]["trial_days"])
                    
                    await db.users.update_one(
                        {"user_id": user_id},
                        {"$set": {
                            "plan": plan_id,
                            "plan_name": SUBSCRIPTION_PLANS[plan_id]["name"],
                            "subscription_status": "active",
                            "trial_ends_at": trial_end.isoformat(),
                            "plan_updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
        
        return {"status": "success"}
        
    except Exception as e:
        logging.error(f"Stripe webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.get("/payments/history")
async def get_payment_history(user: dict = Depends(get_current_user)):
    """Get user's payment history"""
    transactions = await db.payment_transactions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"transactions": transactions}

@api_router.get("/subscription/status")
async def get_subscription_status(user: dict = Depends(get_current_user)):
    """Get current subscription status"""
    user_data = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    return {
        "plan": user_data.get("plan", "free"),
        "plan_name": user_data.get("plan_name", "Grátis"),
        "subscription_status": user_data.get("subscription_status", "inactive"),
        "trial_ends_at": user_data.get("trial_ends_at")
    }

# ==================== MATURITY DIAGNOSIS ====================

@api_router.get("/brands/{brand_id}/maturity-diagnosis")
async def get_maturity_diagnosis(brand_id: str, user: dict = Depends(get_current_user)):
    """Get maturity diagnosis results"""
    data = await db.maturity_diagnosis.find_one({"brand_id": brand_id}, {"_id": 0})
    return data or {}

@api_router.post("/brands/{brand_id}/maturity-diagnosis")
async def save_maturity_diagnosis(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Save maturity diagnosis results"""
    diagnosis_data = {
        "brand_id": brand_id,
        "user_id": user["user_id"],
        "answers": data.get("answers", {}),
        "results": data.get("results", {}),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.maturity_diagnosis.update_one(
        {"brand_id": brand_id},
        {"$set": diagnosis_data},
        upsert=True
    )
    
    return diagnosis_data

# ==================== AI CREDITS SYSTEM ====================

AI_CREDIT_COSTS = {
    "suggestion": 1,
    "risk_analysis": 5,
    "consistency_analysis": 5,
    "mentor_insight": 3,
    "brand_way_suggestion": 2
}

CREDIT_PACKAGES = {
    "starter": {"credits": 100, "price": 49.00, "stripe_price_id": "price_1T1hYh5XQ1KrllP22NrrLqVr"},
    "pro": {"credits": 500, "price": 199.00, "stripe_price_id": "price_1T1hZo5XQ1KrllP2xuz1zoD9"},
    "enterprise": {"credits": 2000, "price": 699.00, "stripe_price_id": "price_1T1has5XQ1KrllP2yTEaGs5A"}
}

@api_router.get("/ai-credits/balance")
async def get_ai_credits_balance(user: dict = Depends(get_current_user)):
    """Get user's AI credits balance"""
    credits_data = await db.ai_credits.find_one({"user_id": user["user_id"]})
    
    if not credits_data:
        # Initialize with 50 free credits for new users
        credits_data = {
            "user_id": user["user_id"],
            "total_credits": 50,
            "used_credits": 0,
            "available_credits": 50,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.ai_credits.insert_one(credits_data)
    
    return {
        "total_credits": credits_data.get("total_credits", 0),
        "used_credits": credits_data.get("used_credits", 0),
        "available_credits": credits_data.get("available_credits", 0)
    }

@api_router.get("/ai-credits/history")
async def get_ai_credits_history(user: dict = Depends(get_current_user)):
    """Get AI credits usage history"""
    history = await db.ai_credits_history.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"history": history}

@api_router.post("/ai-credits/purchase")
async def purchase_ai_credits(request: Request, data: dict, user: dict = Depends(get_current_user)):
    """Purchase AI credits via Stripe"""
    package_id = data.get("package_id")
    origin_url = data.get("origin_url", os.environ.get("FRONTEND_URL"))
    
    if package_id not in CREDIT_PACKAGES:
        raise HTTPException(status_code=400, detail="Pacote inválido")
    
    package = CREDIT_PACKAGES[package_id]
    
    try:
        stripe_api_key = os.environ.get("STRIPE_API_KEY")
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        success_url = f"{origin_url}/ai-credits?session_id={{CHECKOUT_SESSION_ID}}&success=true"
        cancel_url = f"{origin_url}/ai-credits?canceled=true"
        
        checkout_request = CheckoutSessionRequest(
            amount=package["price"],
            currency="brl",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user["user_id"],
                "type": "ai_credits",
                "package_id": package_id,
                "credits": str(package["credits"])
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        return {"checkout_url": session.url, "session_id": session.session_id}
        
    except Exception as e:
        logging.error(f"AI credits purchase error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def deduct_ai_credits(user_id: str, action: str, amount: int = None):
    """Deduct AI credits for an action"""
    cost = amount or AI_CREDIT_COSTS.get(action, 1)
    
    credits_data = await db.ai_credits.find_one({"user_id": user_id})
    if not credits_data or credits_data.get("available_credits", 0) < cost:
        return False, "Créditos insuficientes"
    
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
