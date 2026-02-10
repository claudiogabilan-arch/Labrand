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
    role: str = "cliente"

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    created_at: datetime

class BrandBase(BaseModel):
    name: str
    description: Optional[str] = None
    industry: Optional[str] = None
    logo_url: Optional[str] = None

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
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id, user_data.email, user_data.role)
    
    return {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "role": user_data.role,
        "token": token
    }

@api_router.post("/auth/login")
async def login(user_data: UserLogin, response: Response):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not pwd_context.verify(user_data.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    token = create_jwt_token(user["user_id"], user["email"], user.get("role", "cliente"))
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "cliente"),
        "picture": user.get("picture"),
        "token": token
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
async def generate_insights(request: AIInsightRequest, user: dict = Depends(get_current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Chave de API não configurada")
    
    system_prompts = {
        "values": "Você é um especialista em branding e estratégia de marca. Analise os valores e necessidades fornecidos e gere insights estratégicos sobre como a marca pode conectar seus valores com as necessidades dos públicos. Responda em português do Brasil de forma clara e acionável.",
        "purpose": "Você é um especialista em propósito de marca. Com base nas habilidades, curiosidades, paixões e impactos fornecidos, gere uma declaração de propósito inspiradora e autêntica. Responda em português do Brasil.",
        "positioning": "Você é um especialista em posicionamento de marca. Com base no contexto competitivo fornecido, gere uma declaração de posicionamento clara e diferenciadora. Responda em português do Brasil.",
        "personality": "Você é um especialista em personalidade de marca e arquétipos. Com base nos atributos fornecidos, desenvolva uma narrativa de humanização da marca. Responda em português do Brasil.",
        "default": "Você é um especialista em branding e estratégia de marca. Analise o contexto fornecido e gere insights acionáveis. Responda em português do Brasil."
    }
    
    system_message = system_prompts.get(request.pillar, system_prompts["default"])
    
    chat = LlmChat(
        api_key=api_key,
        session_id=f"labrand_{uuid.uuid4().hex[:8]}",
        system_message=system_message
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"Marca: {request.brand_name or 'Não especificada'}\n\nContexto:\n{request.context}"
    
    user_message = UserMessage(text=prompt)
    response = await chat.send_message(user_message)
    
    return {"insight": response}

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

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "LaBrand - Brand OS API", "version": "1.0.0"}

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
