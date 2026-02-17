"""
LaBrand - Pydantic Models/Schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


# ==================== USER MODELS ====================

class UserBase(BaseModel):
    email: str
    name: str
    role: str = "cliente"
    picture: Optional[str] = None


class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "estrategista"
    user_type: str = "estrategista"


class UserLogin(BaseModel):
    email: str
    password: str


class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    user_type: str = "estrategista"
    created_at: datetime


class VerifyEmailRequest(BaseModel):
    email: str
    code: str


class ResendCodeRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class OnboardingData(BaseModel):
    user_type: str
    sector: str
    revenue_range: str
    brand_maturity: str
    main_objective: str


# ==================== BRAND MODELS ====================

class BrandBase(BaseModel):
    name: str
    description: Optional[str] = None
    industry: Optional[str] = None
    logo_url: Optional[str] = None
    brand_type: Optional[str] = "monolitica"
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


# ==================== PILLAR MODELS ====================

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
    cenarios: Dict[str, str] = {}
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PillarValues(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pillar_id: str = Field(default_factory=lambda: f"values_{uuid.uuid4().hex[:12]}")
    brand_id: str
    valores: List[Dict[str, Any]] = []
    necessidades: List[Dict[str, Any]] = []
    cruzamento: List[Dict[str, Any]] = []
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
    mapa_diferenciacao: List[Dict[str, Any]] = []
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


# ==================== TASK & DECISION MODELS ====================

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    task_id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:12]}")
    brand_id: str
    title: str
    description: Optional[str] = None
    status: str = "backlog"
    priority: str = "medium"
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
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Narrative(BaseModel):
    model_config = ConfigDict(extra="ignore")
    narrative_id: str = Field(default_factory=lambda: f"narrative_{uuid.uuid4().hex[:12]}")
    brand_id: str
    tipo: str
    title: str
    content: Optional[str] = None
    missao: Optional[str] = None
    visao: Optional[str] = None
    valores: List[str] = []
    marcos: List[Dict[str, Any]] = []
    anexos: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== AI MODELS ====================

class AIInsightRequest(BaseModel):
    context: str
    pillar: str
    brand_name: Optional[str] = None
