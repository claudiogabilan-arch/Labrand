"""Pydantic models for the 'De Dentro Pra Fora' endomarketing diagnosis."""
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid


class EndomarketingQuestion(BaseModel):
    pilar: str
    pergunta: str
    resposta: int = Field(ge=0, le=4)


class EndomarketingScores(BaseModel):
    engajamento: float = 0.0
    meritocracia: float = 0.0
    alta_performance: float = 0.0
    resultados: float = 0.0
    economia: float = 0.0
    pertencimento: float = 0.0
    geral: float = 0.0
    nivel_maturidade: str = "Marca em Risco"


class EndomarketingDiagnosis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand_id: str
    user_id: str
    respostas: List[EndomarketingQuestion] = []
    scores: EndomarketingScores = Field(default_factory=EndomarketingScores)
    plano_endomarketing: Optional[dict] = None
    temporada_gamificada: Optional[dict] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class DiagnosisInput(BaseModel):
    brand_id: str
    respostas: List[EndomarketingQuestion]
