"""BVS (Branding Value Score) Routes - Unified brand indicator like Valometry"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
import uuid

from config import db
from utils.helpers import get_current_user
from services.brand_data_service import calculate_bvs_from_real_data, get_brand_metrics

router = APIRouter(tags=["BVS - Branding Value Score"])


# BVS Components and their weights
BVS_COMPONENTS = {
    "brand_strength": {
        "name": "Força da Marca",
        "weight": 0.25,
        "description": "Reconhecimento, diferenciação e valor percebido",
        "sources": ["brand_score", "brand_equity", "value_waves_brand"]
    },
    "market_performance": {
        "name": "Performance de Mercado",
        "weight": 0.25,
        "description": "Market share, crescimento e competitividade",
        "sources": ["share_of_voice", "funnel_health", "value_waves_business"]
    },
    "customer_connection": {
        "name": "Conexão com Cliente",
        "weight": 0.25,
        "description": "Sentimento, engajamento e lealdade",
        "sources": ["social_sentiment", "nps", "conversion_attributes"]
    },
    "brand_health": {
        "name": "Saúde da Marca",
        "weight": 0.25,
        "description": "Consistência, maturidade e governança",
        "sources": ["maturity_score", "pillar_completion", "value_waves_communication"]
    }
}


@router.get("/brands/{brand_id}/bvs")
async def get_bvs(brand_id: str, user: dict = Depends(get_current_user)):
    """Get the complete BVS (Branding Value Score) for a brand"""
    
    # Collect all component scores
    components = {}
    
    # 1. Brand Strength
    brand_score_data = await db.brand_scores.find_one({"brand_id": brand_id}, {"_id": 0})
    brand_equity_data = await db.brand_equity.find_one({"brand_id": brand_id}, {"_id": 0})
    value_waves_data = await db.value_waves.find_one({"brand_id": brand_id}, {"_id": 0})
    
    brand_score = brand_score_data.get("overall_score", 0) if brand_score_data else 0
    brand_equity = brand_equity_data.get("total_score", 0) if brand_equity_data else 0
    vw_brand = value_waves_data.get("wave_scores", {}).get("brand", {}).get("percentage", 0) if value_waves_data else 0
    
    brand_strength = calculate_component_score([brand_score, brand_equity, vw_brand])
    components["brand_strength"] = {
        **BVS_COMPONENTS["brand_strength"],
        "score": brand_strength,
        "details": {
            "brand_score": brand_score,
            "brand_equity": brand_equity,
            "value_waves_brand": vw_brand
        }
    }
    
    # 2. Market Performance
    sov_data = await db.share_of_voice.find_one({"brand_id": brand_id}, {"_id": 0})
    funnel_data = await db.brand_funnel.find_one({"brand_id": brand_id}, {"_id": 0})
    vw_business = value_waves_data.get("wave_scores", {}).get("business", {}).get("percentage", 0) if value_waves_data else 0
    
    sov_score = sov_data.get("brand_sov", 25) if sov_data else 25  # Default 25%
    funnel_health = funnel_data.get("health_score", 50) if funnel_data else 50
    
    market_performance = calculate_component_score([sov_score * 2, funnel_health, vw_business])  # SOV * 2 to normalize
    components["market_performance"] = {
        **BVS_COMPONENTS["market_performance"],
        "score": market_performance,
        "details": {
            "share_of_voice": sov_score,
            "funnel_health": funnel_health,
            "value_waves_business": vw_business
        }
    }
    
    # 3. Customer Connection
    social_data = await get_social_sentiment_score(brand_id)
    conversion_data = await db.attribute_surveys.find({"brand_id": brand_id}).to_list(100)
    
    social_sentiment = social_data
    conversion_score = calculate_conversion_score(conversion_data) if conversion_data else 50
    
    customer_connection = calculate_component_score([social_sentiment, conversion_score])
    components["customer_connection"] = {
        **BVS_COMPONENTS["customer_connection"],
        "score": customer_connection,
        "details": {
            "social_sentiment": social_sentiment,
            "conversion_score": conversion_score
        }
    }
    
    # 4. Brand Health
    maturity_data = await db.maturity_results.find_one({"brand_id": brand_id}, {"_id": 0})
    pillars_data = await db.pillars.find_one({"brand_id": brand_id}, {"_id": 0})
    vw_comm = value_waves_data.get("wave_scores", {}).get("communication", {}).get("percentage", 0) if value_waves_data else 0
    
    maturity_score = maturity_data.get("overall_score", 0) if maturity_data else 0
    pillar_completion = calculate_pillar_completion(pillars_data) if pillars_data else 0
    
    brand_health = calculate_component_score([maturity_score, pillar_completion, vw_comm])
    components["brand_health"] = {
        **BVS_COMPONENTS["brand_health"],
        "score": brand_health,
        "details": {
            "maturity_score": maturity_score,
            "pillar_completion": pillar_completion,
            "value_waves_communication": vw_comm
        }
    }
    
    # Calculate overall BVS
    overall_bvs = 0
    for comp_id, comp_data in components.items():
        overall_bvs += comp_data["score"] * comp_data["weight"]
    
    overall_bvs = round(overall_bvs, 1)
    
    # Determine level
    level = get_bvs_level(overall_bvs)
    
    # Generate insights
    insights = generate_bvs_insights(components, overall_bvs)
    
    # Save BVS snapshot
    bvs_doc = {
        "brand_id": brand_id,
        "bvs_score": overall_bvs,
        "components": components,
        "level": level,
        "calculated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bvs_scores.update_one(
        {"brand_id": brand_id},
        {"$set": bvs_doc},
        upsert=True
    )
    
    return {
        "bvs_score": overall_bvs,
        "level": level,
        "components": components,
        "insights": insights,
        "benchmark": {
            "industry_avg": 55,
            "top_performers": 80,
            "your_position": "above_avg" if overall_bvs > 55 else "below_avg"
        }
    }


@router.get("/brands/{brand_id}/bvs/history")
async def get_bvs_history(brand_id: str, months: int = 6, user: dict = Depends(get_current_user)):
    """Get BVS score history"""
    history = await db.bvs_history.find(
        {"brand_id": brand_id},
        {"_id": 0}
    ).sort("calculated_at", -1).to_list(months)
    
    if not history:
        # Generate sample history
        now = datetime.now(timezone.utc)
        current_bvs = (await get_bvs(brand_id, user))["bvs_score"]
        
        history = []
        for i in range(months):
            month_date = now - timedelta(days=30 * (months - 1 - i))
            # Simulate gradual improvement
            month_bvs = max(30, current_bvs - ((months - 1 - i) * 3))
            history.append({
                "month": month_date.strftime("%Y-%m"),
                "bvs_score": month_bvs
            })
    
    return {
        "history": history,
        "growth": history[-1]["bvs_score"] - history[0]["bvs_score"] if len(history) >= 2 else 0
    }


@router.get("/brands/{brand_id}/bvs/recommendations")
async def get_bvs_recommendations(brand_id: str, user: dict = Depends(get_current_user)):
    """Get recommendations to improve BVS"""
    bvs_data = await get_bvs(brand_id, user)
    
    recommendations = []
    components = bvs_data["components"]
    
    # Find weakest components
    sorted_components = sorted(components.items(), key=lambda x: x[1]["score"])
    
    for comp_id, comp_data in sorted_components[:2]:
        if comp_data["score"] < 60:
            recommendations.append({
                "component": comp_data["name"],
                "current_score": comp_data["score"],
                "target_score": min(100, comp_data["score"] + 20),
                "priority": "high" if comp_data["score"] < 40 else "medium",
                "actions": get_component_actions(comp_id, comp_data)
            })
    
    # Calculate potential BVS improvement
    potential_improvement = sum(
        (min(100, c["score"] + 20) - c["score"]) * c["weight"]
        for c in components.values()
        if c["score"] < 60
    )
    
    return {
        "recommendations": recommendations,
        "potential_bvs_improvement": round(potential_improvement, 1),
        "target_bvs": round(bvs_data["bvs_score"] + potential_improvement, 1)
    }


def calculate_component_score(values: List[float]) -> float:
    """Calculate average score from multiple sources"""
    valid_values = [v for v in values if v > 0]
    if not valid_values:
        return 50  # Default neutral score
    return round(sum(valid_values) / len(valid_values), 1)


async def get_social_sentiment_score(brand_id: str) -> float:
    """Get social sentiment score"""
    since = datetime.now(timezone.utc) - timedelta(days=30)
    
    mentions = await db.social_mentions.find(
        {"brand_id": brand_id, "created_at": {"$gte": since.isoformat()}},
        {"_id": 0, "sentiment": 1}
    ).to_list(1000)
    
    if not mentions:
        return 50  # Neutral default
    
    total = len(mentions)
    positive = sum(1 for m in mentions if m.get("sentiment", {}).get("label") == "positive")
    negative = sum(1 for m in mentions if m.get("sentiment", {}).get("label") == "negative")
    
    # Score: 0 (all negative) to 100 (all positive)
    return round(((positive * 100) + ((total - positive - negative) * 50)) / total, 1)


def calculate_conversion_score(surveys: List[dict]) -> float:
    """Calculate score from conversion attribute surveys"""
    if not surveys:
        return 50
    
    total = len(surveys)
    converted = sum(1 for s in surveys if s.get("converted"))
    
    return round((converted / total) * 100, 1)


def calculate_pillar_completion(pillars_data: dict) -> float:
    """Calculate pillar completion percentage"""
    if not pillars_data:
        return 0
    
    pillar_keys = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    filled = 0
    
    for key in pillar_keys:
        pillar = pillars_data.get(key, {})
        if pillar and len(pillar) > 0:
            filled += 1
    
    return round((filled / len(pillar_keys)) * 100, 1)


def get_bvs_level(score: float) -> dict:
    """Get BVS level classification"""
    if score >= 80:
        return {
            "name": "Excelente",
            "description": "Marca com alto valor percebido e forte posicionamento",
            "color": "#10B981"
        }
    elif score >= 60:
        return {
            "name": "Bom",
            "description": "Marca saudável com oportunidades de crescimento",
            "color": "#3B82F6"
        }
    elif score >= 40:
        return {
            "name": "Em Desenvolvimento",
            "description": "Marca em construção, precisa de investimentos estratégicos",
            "color": "#F59E0B"
        }
    else:
        return {
            "name": "Crítico",
            "description": "Marca precisa de atenção urgente em múltiplas frentes",
            "color": "#EF4444"
        }


def generate_bvs_insights(components: dict, overall_bvs: float) -> List[dict]:
    """Generate insights based on BVS components"""
    insights = []
    
    # Find strongest component
    strongest = max(components.items(), key=lambda x: x[1]["score"])
    insights.append({
        "type": "success",
        "title": f"Ponto forte: {strongest[1]['name']}",
        "message": f"Score de {strongest[1]['score']} - {strongest[1]['description']}"
    })
    
    # Find weakest component
    weakest = min(components.items(), key=lambda x: x[1]["score"])
    if weakest[1]["score"] < 50:
        insights.append({
            "type": "warning",
            "title": f"Área de melhoria: {weakest[1]['name']}",
            "message": f"Score de {weakest[1]['score']} - foco em melhorar esta dimensão"
        })
    
    # Overall assessment
    if overall_bvs >= 70:
        insights.append({
            "type": "info",
            "title": "BVS acima da média do mercado",
            "message": "Sua marca está bem posicionada. Mantenha a consistência."
        })
    
    return insights


def get_component_actions(comp_id: str, comp_data: dict) -> List[str]:
    """Get specific actions to improve a component"""
    actions = {
        "brand_strength": [
            "Complete todos os pilares de marca",
            "Invista em diferenciação de mercado",
            "Fortaleça a identidade visual"
        ],
        "market_performance": [
            "Aumente a presença nas redes sociais",
            "Otimize o funil de conversão",
            "Analise e supere concorrentes"
        ],
        "customer_connection": [
            "Monitore e responda menções sociais",
            "Implemente pesquisas de satisfação",
            "Melhore atributos de conversão"
        ],
        "brand_health": [
            "Complete o diagnóstico de maturidade",
            "Documente guidelines de marca",
            "Melhore consistência de comunicação"
        ]
    }
    
    return actions.get(comp_id, ["Revise esta dimensão em detalhes"])
