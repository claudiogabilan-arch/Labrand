from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["brand-tools"])

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

# ==================== BRAND EQUITY SCORE (INTELIGÊNCIA AVANÇADA) ====================

EQUITY_DIMENSIONS = {
    "awareness": {"name": "Conhecimento de Marca", "weight": 20, "description": "Reconhecimento e lembrança da marca pelo público"},
    "associations": {"name": "Associações de Marca", "weight": 25, "description": "Atributos, benefícios e valores associados à marca"},
    "perceived_quality": {"name": "Qualidade Percebida", "weight": 20, "description": "Percepção de superioridade e excelência"},
    "loyalty": {"name": "Lealdade à Marca", "weight": 20, "description": "Compromisso e preferência contínua"},
    "proprietary_assets": {"name": "Ativos Proprietários", "weight": 15, "description": "Patentes, marcas registradas, canais exclusivos"}
}

@router.get("/brands/{brand_id}/brand-equity")
async def get_brand_equity_score(brand_id: str, user: dict = Depends(get_current_user)):
    """Calcula Brand Equity Score baseado no modelo de Aaker"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    # Coletar dados de múltiplas fontes
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    touchpoints = await db.touchpoints.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
    maturity = await db.maturity_diagnosis.find_one({"brand_id": brand_id}, {"_id": 0})
    naming = await db.naming_projects.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    crm_contacts = await db.crm_contacts.count_documents({"brand_id": brand_id})
    ads_meta = await db.ads_metrics.find_one({"brand_id": brand_id, "provider": "meta"}, {"_id": 0})
    ads_google = await db.ads_metrics.find_one({"brand_id": brand_id, "provider": "google"}, {"_id": 0})
    
    # Calcular cada dimensão do Brand Equity
    
    # 1. AWARENESS (Conhecimento) - Baseado em presença digital e alcance
    awareness_score = 50  # Base
    if ads_meta and ads_meta.get("metrics"):
        total_impressions = sum(m.get("impressions", 0) for m in ads_meta["metrics"][:30])
        if total_impressions > 100000: awareness_score += 25
        elif total_impressions > 50000: awareness_score += 15
        elif total_impressions > 10000: awareness_score += 10
    if ads_google and ads_google.get("metrics"):
        total_impressions = sum(m.get("impressions", 0) for m in ads_google["metrics"][:30])
        if total_impressions > 100000: awareness_score += 25
        elif total_impressions > 50000: awareness_score += 15
        elif total_impressions > 10000: awareness_score += 10
    awareness_score = min(100, awareness_score)
    
    # 2. ASSOCIATIONS (Associações) - Baseado em pilares de marca definidos
    pillar_types = ["values", "purpose", "promise", "positioning", "personality"]
    pillars_filled = sum(1 for p in pillars if p.get("pillar_type") in pillar_types and p.get("answers"))
    associations_score = min(100, (pillars_filled / len(pillar_types)) * 100)
    
    # 3. PERCEIVED QUALITY - Baseado em touchpoints e maturidade
    touchpoint_scores = [tp.get("nota", 5) for tp in touchpoints]
    avg_touchpoint = (sum(touchpoint_scores) / len(touchpoint_scores) * 10) if touchpoint_scores else 50
    maturity_score = maturity.get("score", 50) if maturity else 50
    perceived_quality_score = min(100, (avg_touchpoint + maturity_score) / 2)
    
    # 4. LOYALTY - Baseado em CRM e engajamento
    loyalty_score = 40  # Base
    if crm_contacts > 100: loyalty_score += 30
    elif crm_contacts > 50: loyalty_score += 20
    elif crm_contacts > 10: loyalty_score += 10
    # Adicionar pontos por conversões de ads
    total_conversions = 0
    for ads_data in [ads_meta, ads_google]:
        if ads_data and ads_data.get("metrics"):
            total_conversions += sum(m.get("conversions", 0) for m in ads_data["metrics"][:30])
    if total_conversions > 100: loyalty_score += 30
    elif total_conversions > 50: loyalty_score += 20
    elif total_conversions > 10: loyalty_score += 10
    loyalty_score = min(100, loyalty_score)
    
    # 5. PROPRIETARY ASSETS - Baseado em naming, identidade visual, etc.
    proprietary_score = 30  # Base
    if naming and len(naming) > 0: proprietary_score += 20  # Tem projeto de naming
    if brand.get("logo_url"): proprietary_score += 20  # Tem logo
    if any(p.get("pillar_type") == "universality" and p.get("answers") for p in pillars): proprietary_score += 30  # Universo de marca
    proprietary_score = min(100, proprietary_score)
    
    # Calcular score final ponderado
    dimensions = {
        "awareness": {"score": round(awareness_score), "weight": 20, "name": "Conhecimento de Marca", "status": "high" if awareness_score >= 70 else "medium" if awareness_score >= 40 else "low"},
        "associations": {"score": round(associations_score), "weight": 25, "name": "Associações de Marca", "status": "high" if associations_score >= 70 else "medium" if associations_score >= 40 else "low"},
        "perceived_quality": {"score": round(perceived_quality_score), "weight": 20, "name": "Qualidade Percebida", "status": "high" if perceived_quality_score >= 70 else "medium" if perceived_quality_score >= 40 else "low"},
        "loyalty": {"score": round(loyalty_score), "weight": 20, "name": "Lealdade à Marca", "status": "high" if loyalty_score >= 70 else "medium" if loyalty_score >= 40 else "low"},
        "proprietary_assets": {"score": round(proprietary_score), "weight": 15, "name": "Ativos Proprietários", "status": "high" if proprietary_score >= 70 else "medium" if proprietary_score >= 40 else "low"}
    }
    
    total_equity = round(
        (awareness_score * 0.20) +
        (associations_score * 0.25) +
        (perceived_quality_score * 0.20) +
        (loyalty_score * 0.20) +
        (proprietary_score * 0.15)
    )
    
    # Determinar nível e recomendações
    if total_equity >= 80:
        level, status = "Premium", "excellent"
        valuation_multiplier = 3.5
    elif total_equity >= 65:
        level, status = "Forte", "good"
        valuation_multiplier = 2.5
    elif total_equity >= 50:
        level, status = "Em Desenvolvimento", "developing"
        valuation_multiplier = 1.5
    elif total_equity >= 35:
        level, status = "Emergente", "emerging"
        valuation_multiplier = 1.0
    else:
        level, status = "Inicial", "initial"
        valuation_multiplier = 0.5
    
    # Gerar recomendações baseadas nas dimensões mais fracas
    recommendations = []
    sorted_dims = sorted(dimensions.items(), key=lambda x: x[1]["score"])
    for dim_key, dim_data in sorted_dims[:3]:
        if dim_data["score"] < 70:
            recs = {
                "awareness": "Aumente a presença digital com campanhas de brand awareness",
                "associations": "Complete os pilares de marca (propósito, valores, promessa)",
                "perceived_quality": "Mapeie e otimize os touchpoints da jornada do cliente",
                "loyalty": "Implemente programas de fidelização e nurturing",
                "proprietary_assets": "Desenvolva identidade visual e naming distintivos"
            }
            recommendations.append({"dimension": dim_data["name"], "action": recs.get(dim_key, "Fortaleça esta dimensão"), "priority": "alta" if dim_data["score"] < 40 else "média"})
    
    # Histórico de equity (últimos 6 meses - simulado)
    history = []
    base_score = max(20, total_equity - 15)
    for i in range(6):
        month_score = min(100, base_score + (i * 2.5))
        history.append({
            "month": f"2025-{str(7+i).zfill(2)}",
            "score": round(month_score)
        })
    
    # Benchmark do setor (simulado)
    industry = brand.get("industry", "Geral")
    industry_benchmark = {"average": 55, "top_10": 78, "bottom_10": 32}
    
    result = {
        "brand_id": brand_id,
        "brand_name": brand.get("name"),
        "equity_score": total_equity,
        "level": level,
        "status": status,
        "valuation_multiplier": valuation_multiplier,
        "dimensions": dimensions,
        "recommendations": recommendations,
        "history": history,
        "benchmark": {
            "industry": industry,
            "your_position": "acima da média" if total_equity > industry_benchmark["average"] else "abaixo da média",
            "industry_average": industry_benchmark["average"],
            "industry_top_10": industry_benchmark["top_10"],
            "percentile": min(99, max(1, int((total_equity / 100) * 100))),
            "gap_to_average": total_equity - industry_benchmark["average"]
        },
        "calculated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Salvar histórico
    await db.brand_equity_history.update_one(
        {"brand_id": brand_id, "month": datetime.now(timezone.utc).strftime("%Y-%m")},
        {"$set": {**result, "user_id": user["user_id"]}},
        upsert=True
    )
    
    return result

@router.get("/brands/{brand_id}/brand-equity/history")
async def get_brand_equity_history(brand_id: str, months: int = 12, user: dict = Depends(get_current_user)):
    """Retorna histórico do Brand Equity Score"""
    history = await db.brand_equity_history.find(
        {"brand_id": brand_id}, {"_id": 0}
    ).sort("calculated_at", -1).to_list(months)
    return {"history": history, "total": len(history)}

@router.get("/brands/{brand_id}/brand-equity/comparison")
async def compare_brand_equity(brand_id: str, user: dict = Depends(get_current_user)):
    """Compara Brand Equity com benchmark do setor"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    # Buscar equity atual
    equity = await db.brand_equity_history.find_one(
        {"brand_id": brand_id}, {"_id": 0}
    )
    
    current_score = equity.get("equity_score", 50) if equity else 50
    industry = brand.get("industry", "Geral")
    
    # Benchmarks por indústria (simulado)
    industry_benchmarks = {
        "Tecnologia": {"average": 62, "leaders": ["Apple", "Google", "Microsoft"]},
        "Varejo": {"average": 48, "leaders": ["Amazon", "Walmart", "Alibaba"]},
        "Saúde": {"average": 55, "leaders": ["Johnson & Johnson", "Pfizer", "UnitedHealth"]},
        "Financeiro": {"average": 58, "leaders": ["Visa", "Mastercard", "JPMorgan"]},
        "Educação": {"average": 52, "leaders": ["Harvard", "MIT", "Stanford"]},
        "Geral": {"average": 50, "leaders": ["Coca-Cola", "Nike", "Disney"]}
    }
    
    benchmark = industry_benchmarks.get(industry, industry_benchmarks["Geral"])
    
    return {
        "brand_id": brand_id,
        "brand_name": brand.get("name"),
        "your_score": current_score,
        "industry": industry,
        "industry_average": benchmark["average"],
        "gap_to_average": current_score - benchmark["average"],
        "position": "Acima da média" if current_score > benchmark["average"] else "Abaixo da média",
        "industry_leaders": benchmark["leaders"],
        "improvement_potential": max(0, 100 - current_score)
    }
