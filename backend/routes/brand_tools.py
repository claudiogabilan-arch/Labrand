"""Brand Tools - Score, Competitor Analysis, Content Generator"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["brand-tools"])

class CompetitorAnalysisRequest(BaseModel):
    competitors: List[str]
    analysis_depth: str = "basic"

class ContentGeneratorRequest(BaseModel):
    content_type: str
    tone: str = "professional"
    length: str = "medium"
    context: Optional[str] = None

CONTENT_TYPES = {
    "tagline": {"name": "Tagline", "credits": 1, "max_length": 100},
    "post_social": {"name": "Post para Redes Sociais", "credits": 1, "max_length": 280},
    "bio": {"name": "Bio/Sobre", "credits": 1, "max_length": 500},
    "manifesto": {"name": "Manifesto de Marca", "credits": 2, "max_length": 2000},
    "elevator_pitch": {"name": "Elevator Pitch", "credits": 1, "max_length": 300}
}

# ==================== BRAND SCORE ====================

@router.get("/brands/{brand_id}/brand-score")
async def get_unified_brand_score(brand_id: str, user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    touchpoints = await db.touchpoints.find_one({"brand_id": brand_id}, {"_id": 0})
    maturity = await db.maturity_diagnosis.find_one({"brand_id": brand_id}, {"_id": 0})
    consistency = await db.consistency_alerts.find_one({"brand_id": brand_id}, {"_id": 0})
    
    pillar_count = len([p for p in pillars if p.get("answers")])
    pillar_score = min(100, pillar_count * 14)
    touchpoint_score = touchpoints.get("health_score", 60) if touchpoints else 50
    maturity_score = maturity.get("score", 50) if maturity else 50
    consistency_score = consistency.get("overall_score", 70) if consistency else 60
    
    unified_score = round((pillar_score * 0.35) + (touchpoint_score * 0.20) + (maturity_score * 0.25) + (consistency_score * 0.20))
    
    if unified_score >= 80:
        level, status = "Excelente", "success"
    elif unified_score >= 60:
        level, status = "Bom", "warning"
    elif unified_score >= 40:
        level, status = "Em Desenvolvimento", "caution"
    else:
        level, status = "Crítico", "danger"
    
    return {
        "brand_id": brand_id, "unified_score": unified_score, "level": level, "status": status,
        "dimensions": {
            "estrategia": {"score": pillar_score, "weight": 35, "label": "Estratégia de Marca"},
            "experiencia": {"score": touchpoint_score, "weight": 20, "label": "Experiência do Cliente"},
            "maturidade": {"score": maturity_score, "weight": 25, "label": "Maturidade Organizacional"},
            "consistencia": {"score": consistency_score, "weight": 20, "label": "Consistência Visual"}
        },
        "recommendations": [
            "Complete todos os 7 pilares estratégicos" if pillar_score < 100 else None,
            "Mapeie mais touchpoints da jornada" if touchpoint_score < 70 else None,
            "Execute um diagnóstico de maturidade" if maturity_score < 60 else None,
            "Revise os alertas de consistência" if consistency_score < 70 else None
        ]
    }

# ==================== COMPETITOR ANALYSIS ====================

@router.post("/brands/{brand_id}/competitors/analyze-ai")
async def analyze_competitors_ai(brand_id: str, request: CompetitorAnalysisRequest, user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    credits = await db.ai_credits.find_one({"user_id": user["user_id"]}, {"_id": 0})
    balance = credits.get("balance", 0) if credits else 0
    cost = 2 if request.analysis_depth == "basic" else 4
    
    if balance < cost:
        raise HTTPException(status_code=402, detail=f"Créditos insuficientes. Necessário: {cost}")
    
    await db.ai_credits.update_one({"user_id": user["user_id"]}, {"$inc": {"balance": -cost}})
    
    analysis_results = [{"competitor": c, "positioning": f"{c} foca em preço", "strengths": ["Preço acessível"], "weaknesses": ["Baixa diferenciação"], "opportunity_gaps": ["Experiência premium"], "threat_level": "medium"} for c in request.competitors[:5]]
    
    result = {"brand_id": brand_id, "brand_name": brand.get("name"), "analyzed_at": datetime.now(timezone.utc).isoformat(), "competitors_analyzed": len(analysis_results), "analysis": analysis_results, "strategic_recommendations": ["Diferenciar pela experiência", "Branding emocional", "Explorar nichos"], "credits_used": cost}
    
    await db.competitor_analyses.insert_one({**result, "user_id": user["user_id"], "_created": datetime.now(timezone.utc)})
    return result

@router.get("/brands/{brand_id}/competitors/analyses")
async def get_competitor_analyses(brand_id: str, user: dict = Depends(get_current_user)):
    analyses = await db.competitor_analyses.find({"brand_id": brand_id}, {"_id": 0}).sort("analyzed_at", -1).to_list(20)
    return {"analyses": analyses, "total": len(analyses)}

# ==================== CONTENT GENERATOR ====================

@router.get("/content-generator/types")
async def get_content_types():
    return {"types": [{"id": k, **v} for k, v in CONTENT_TYPES.items()]}

@router.post("/brands/{brand_id}/content-generator/generate")
async def generate_brand_content(brand_id: str, request: ContentGeneratorRequest, user: dict = Depends(get_current_user)):
    if request.content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de conteúdo inválido")
    
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    content_config = CONTENT_TYPES[request.content_type]
    cost = content_config["credits"]
    
    credits = await db.ai_credits.find_one({"user_id": user["user_id"]}, {"_id": 0})
    balance = credits.get("balance", 0) if credits else 0
    
    if balance < cost:
        raise HTTPException(status_code=402, detail=f"Créditos insuficientes. Necessário: {cost}")
    
    await db.ai_credits.update_one({"user_id": user["user_id"]}, {"$inc": {"balance": -cost}})
    
    brand_name = brand.get("name", "Marca")
    generated = {
        "tagline": [f"{brand_name}: Transformando ideias em realidade", f"Inovação com propósito. Isso é {brand_name}."],
        "post_social": [f"Na {brand_name}, acreditamos que cada desafio é uma oportunidade. #Inovação"],
        "bio": [f"{brand_name} é uma empresa dedicada a entregar soluções inovadoras."],
        "manifesto": [f"Nós somos {brand_name}.\n\nAcreditamos que o futuro pertence àqueles que ousam sonhar grande."],
        "elevator_pitch": [f"Somos a {brand_name}, especialistas em transformação. Ajudamos empresas a crescer."]
    }
    
    result = {"brand_id": brand_id, "content_type": request.content_type, "content_name": content_config["name"], "tone": request.tone, "suggestions": generated.get(request.content_type, []), "generated_at": datetime.now(timezone.utc).isoformat(), "credits_used": cost}
    
    await db.generated_content.insert_one({**result, "user_id": user["user_id"], "_created": datetime.now(timezone.utc)})
    return result

@router.get("/brands/{brand_id}/content-generator/history")
async def get_content_history(brand_id: str, user: dict = Depends(get_current_user)):
    contents = await db.generated_content.find({"brand_id": brand_id}, {"_id": 0}).sort("generated_at", -1).to_list(50)
    return {"contents": contents, "total": len(contents)}
