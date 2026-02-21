from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from config.database import db, AI_COSTS
from config.auth import get_current_user

router = APIRouter(prefix="/api", tags=["brand-tools"])

class PDFReportRequest(BaseModel):
    sections: List[str] = ["score", "pillars", "recommendations"]
    include_charts: bool = True

class EmailAlertConfig(BaseModel):
    alert_types: List[str] = ["consistency", "risk", "opportunities"]
    frequency: str = "weekly"
    recipients: List[str] = []

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

@router.post("/brands/{brand_id}/reports/executive-pdf")
async def generate_executive_pdf(brand_id: str, request: PDFReportRequest, user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    maturity = await db.maturity_diagnosis.find_one({"brand_id": brand_id}, {"_id": 0})
    
    report_data = {
        "report_id": f"rep_{uuid.uuid4().hex[:12]}", "brand_id": brand_id,
        "brand_name": brand.get("name", "N/A"), "generated_at": datetime.now(timezone.utc).isoformat(),
        "sections_included": request.sections,
        "executive_summary": {
            "overall_health": "Bom",
            "key_strengths": ["Posicionamento claro", "Valores bem definidos"],
            "areas_for_improvement": ["Expandir touchpoints digitais", "Aumentar consistência visual"],
            "priority_actions": ["Revisar identidade visual", "Mapear jornada do cliente"]
        },
        "pillar_summary": [{"name": p.get("pillar_type", ""), "status": "complete" if p.get("answers") else "pending"} for p in pillars],
        "maturity_level": maturity.get("level", "Em análise") if maturity else "Não avaliado",
        "download_ready": True, "message": "Relatório PDF executivo gerado! (MOCK)"
    }
    
    await db.executive_reports.insert_one({**report_data, "user_id": user["user_id"], "_created": datetime.now(timezone.utc)})
    return report_data

@router.get("/brands/{brand_id}/reports/history")
async def get_report_history(brand_id: str, user: dict = Depends(get_current_user)):
    reports = await db.executive_reports.find({"brand_id": brand_id}, {"_id": 0}).sort("generated_at", -1).to_list(50)
    return {"reports": reports, "total": len(reports)}

@router.get("/brands/{brand_id}/alerts/config")
async def get_alert_config(brand_id: str, user: dict = Depends(get_current_user)):
    config = await db.email_alerts_config.find_one({"brand_id": brand_id}, {"_id": 0})
    if not config:
        config = {"brand_id": brand_id, "enabled": False, "alert_types": ["consistency", "risk"], "frequency": "weekly", "recipients": [user.get("email", "")], "last_sent": None}
    return config

@router.post("/brands/{brand_id}/alerts/config")
async def save_alert_config(brand_id: str, config: EmailAlertConfig, user: dict = Depends(get_current_user)):
    doc = {"brand_id": brand_id, "enabled": True, "alert_types": config.alert_types, "frequency": config.frequency, "recipients": config.recipients if config.recipients else [user.get("email", "")], "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user["user_id"]}
    await db.email_alerts_config.update_one({"brand_id": brand_id}, {"$set": doc}, upsert=True)
    return {"success": True, "message": "Configuração salva!", "config": doc}

@router.post("/brands/{brand_id}/alerts/send-test")
async def send_test_alert(brand_id: str, user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    return {"success": True, "message": f"Email de teste enviado para {user.get('email', 'N/A')}! (MOCK)", "brand_name": brand.get("name") if brand else "N/A"}

@router.get("/brands/{brand_id}/social-listening/mentions")
async def get_social_mentions(brand_id: str, days: int = 30, user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    brand_name = brand.get("name", "Marca") if brand else "Marca"
    
    mock_mentions = [
        {"source": "Twitter", "text": f"Acabei de conhecer a {brand_name}, adorei!", "sentiment": "positive", "date": "2025-12-18", "reach": 1250},
        {"source": "Instagram", "text": f"@{brand_name.lower().replace(' ','')} muito bom atendimento", "sentiment": "positive", "date": "2025-12-17", "reach": 3400},
        {"source": "LinkedIn", "text": f"A {brand_name} está revolucionando", "sentiment": "positive", "date": "2025-12-16", "reach": 890},
        {"source": "Twitter", "text": f"Problema com {brand_name}, mas resolveram", "sentiment": "neutral", "date": "2025-12-15", "reach": 450},
        {"source": "Facebook", "text": f"Recomendo a {brand_name}!", "sentiment": "positive", "date": "2025-12-14", "reach": 2100},
    ]
    
    return {"brand_id": brand_id, "period_days": days, "total_mentions": len(mock_mentions), "sentiment_summary": {"positive": 4, "neutral": 1, "negative": 0}, "sentiment_score": 85, "reach_total": sum(m["reach"] for m in mock_mentions), "mentions": mock_mentions, "trending_topics": ["atendimento", "inovação", "qualidade"], "note": "MOCK"}

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
        "post_social": [f"🚀 Na {brand_name}, acreditamos que cada desafio é uma oportunidade. #Inovação"],
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
