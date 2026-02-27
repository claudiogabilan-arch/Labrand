"""Brand Equity Score Module - Aaker Model"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Brand Equity"])

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
    
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    touchpoints = await db.touchpoints.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
    maturity = await db.maturity_diagnosis.find_one({"brand_id": brand_id}, {"_id": 0})
    naming = await db.naming_projects.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    crm_contacts = await db.crm_contacts.count_documents({"brand_id": brand_id})
    ads_meta = await db.ads_metrics.find_one({"brand_id": brand_id, "provider": "meta"}, {"_id": 0})
    ads_google = await db.ads_metrics.find_one({"brand_id": brand_id, "provider": "google"}, {"_id": 0})
    
    # 1. AWARENESS
    awareness_score = 50
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
    
    # 2. ASSOCIATIONS
    pillar_types = ["values", "purpose", "promise", "positioning", "personality"]
    pillars_filled = sum(1 for p in pillars if p.get("pillar_type") in pillar_types and p.get("answers"))
    associations_score = min(100, (pillars_filled / len(pillar_types)) * 100)
    
    # 3. PERCEIVED QUALITY
    touchpoint_scores = [tp.get("nota", 5) for tp in touchpoints]
    avg_touchpoint = (sum(touchpoint_scores) / len(touchpoint_scores) * 10) if touchpoint_scores else 50
    maturity_score = maturity.get("score", 50) if maturity else 50
    perceived_quality_score = min(100, (avg_touchpoint + maturity_score) / 2)
    
    # 4. LOYALTY
    loyalty_score = 40
    if crm_contacts > 100: loyalty_score += 30
    elif crm_contacts > 50: loyalty_score += 20
    elif crm_contacts > 10: loyalty_score += 10
    total_conversions = 0
    for ads_data in [ads_meta, ads_google]:
        if ads_data and ads_data.get("metrics"):
            total_conversions += sum(m.get("conversions", 0) for m in ads_data["metrics"][:30])
    if total_conversions > 100: loyalty_score += 30
    elif total_conversions > 50: loyalty_score += 20
    elif total_conversions > 10: loyalty_score += 10
    loyalty_score = min(100, loyalty_score)
    
    # 5. PROPRIETARY ASSETS
    proprietary_score = 30
    if naming and len(naming) > 0: proprietary_score += 20
    if brand.get("logo_url"): proprietary_score += 20
    if any(p.get("pillar_type") == "universality" and p.get("answers") for p in pillars): proprietary_score += 30
    proprietary_score = min(100, proprietary_score)
    
    # Score final ponderado
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
    
    # Histórico real do banco
    equity_history = await db.brand_equity_history.find(
        {"brand_id": brand_id},
        {"_id": 0, "equity_score": 1, "calculated_at": 1}
    ).sort("calculated_at", -1).to_list(6)
    
    history = [{"month": h.get("calculated_at", "")[:7], "score": h.get("equity_score", 0)} for h in equity_history]
    
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
    
    equity = await db.brand_equity_history.find_one(
        {"brand_id": brand_id}, {"_id": 0}
    )
    
    current_score = equity.get("equity_score", 50) if equity else 50
    industry = brand.get("industry", "Geral")
    
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
