"""Brand Data Service - Consolidates data from all sources for real calculations"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from config import db


async def get_brand_metrics(brand_id: str) -> Dict:
    """Get consolidated metrics from all data sources for a brand"""
    
    # Basic brand info
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    
    # Pillar completion
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    pillar_types = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillars_data = {p.get("pillar_type"): p for p in pillars}
    completed_pillars = sum(1 for pt in pillar_types if pt in pillars_data and pillars_data[pt].get("answers"))
    pillar_completion_pct = int((completed_pillars / len(pillar_types)) * 100)
    
    # Touchpoints
    touchpoints = await db.touchpoints.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
    touchpoint_scores = [tp.get("nota", 5) for tp in touchpoints]
    avg_touchpoint = (sum(touchpoint_scores) / len(touchpoint_scores)) if touchpoint_scores else 5
    touchpoint_health = avg_touchpoint * 10
    
    # Maturity
    maturity = await db.maturity_diagnosis.find_one({"brand_id": brand_id}, {"_id": 0})
    maturity_score = maturity.get("score", 0) if maturity else 0
    
    # CRM data
    crm_contacts = await db.crm_contacts.count_documents({"brand_id": brand_id})
    crm_integrations = await db.integrations.count_documents({
        "brand_id": brand_id, 
        "category": "crm", 
        "status": "connected"
    })
    
    # Ads data
    ads_integrations = await db.integrations.count_documents({
        "brand_id": brand_id, 
        "category": "ads", 
        "status": "connected"
    })
    
    # Get ads metrics from connected integrations
    total_impressions = 0
    total_clicks = 0
    total_conversions = 0
    total_spend = 0.0
    
    for provider in ["meta", "google", "tiktok"]:
        ads_data = await db.ads_metrics.find_one(
            {"brand_id": brand_id, "provider": provider}, 
            {"_id": 0}
        )
        if ads_data and ads_data.get("metrics"):
            for metric in ads_data["metrics"][:30]:  # Last 30 days
                total_impressions += metric.get("impressions", 0)
                total_clicks += metric.get("clicks", 0)
                total_conversions += metric.get("conversions", 0)
                total_spend += metric.get("spend", 0.0)
    
    # Social mentions
    since = datetime.now(timezone.utc) - timedelta(days=30)
    social_mentions = await db.social_mentions.find(
        {"brand_id": brand_id, "created_at": {"$gte": since.isoformat()}},
        {"_id": 0}
    ).to_list(1000)
    
    total_mentions = len(social_mentions)
    positive_mentions = sum(1 for m in social_mentions if m.get("sentiment", {}).get("label") == "positive")
    negative_mentions = sum(1 for m in social_mentions if m.get("sentiment", {}).get("label") == "negative")
    total_engagement = sum(sum((m.get("engagement") or {}).values()) for m in social_mentions)
    
    # Sentiment score (0-100)
    if total_mentions > 0:
        sentiment_score = int(((positive_mentions * 100) + ((total_mentions - positive_mentions - negative_mentions) * 50) + (negative_mentions * 0)) / total_mentions)
    else:
        sentiment_score = 50  # Neutral baseline
    
    # Value Waves data
    value_waves = await db.value_waves.find_one({"brand_id": brand_id}, {"_id": 0})
    vw_scores = value_waves.get("wave_scores", {}) if value_waves else {}
    
    # Brand Funnel data
    brand_funnel = await db.brand_funnel.find_one({"brand_id": brand_id}, {"_id": 0})
    funnel_health = brand_funnel.get("health_score", 50) if brand_funnel else 50
    
    # Naming projects
    naming_projects = await db.naming_projects.count_documents({"brand_id": brand_id})
    
    # Logo
    has_logo = bool(brand.get("logo_url")) if brand else False
    
    return {
        "brand": {
            "name": brand.get("name", "N/A") if brand else "N/A",
            "industry": brand.get("industry", "Geral") if brand else "Geral",
            "has_logo": has_logo
        },
        "pillars": {
            "completed": completed_pillars,
            "total": len(pillar_types),
            "completion_pct": pillar_completion_pct,
            "data": pillars_data
        },
        "touchpoints": {
            "count": len(touchpoints),
            "avg_score": round(avg_touchpoint, 1),
            "health_score": round(touchpoint_health)
        },
        "maturity": {
            "score": maturity_score,
            "level": maturity.get("level", "N/A") if maturity else "N/A",
            "assessed": bool(maturity)
        },
        "crm": {
            "contacts": crm_contacts,
            "integrations_connected": crm_integrations,
            "has_data": crm_contacts > 0
        },
        "ads": {
            "integrations_connected": ads_integrations,
            "impressions": total_impressions,
            "clicks": total_clicks,
            "conversions": total_conversions,
            "spend": total_spend,
            "ctr": round((total_clicks / total_impressions * 100), 2) if total_impressions > 0 else 0,
            "has_data": total_impressions > 0
        },
        "social": {
            "mentions_30d": total_mentions,
            "positive": positive_mentions,
            "negative": negative_mentions,
            "engagement": total_engagement,
            "sentiment_score": sentiment_score,
            "has_data": total_mentions > 0
        },
        "value_waves": {
            "brand_score": vw_scores.get("brand", {}).get("percentage", 0),
            "business_score": vw_scores.get("business", {}).get("percentage", 0),
            "communication_score": vw_scores.get("communication", {}).get("percentage", 0),
            "assessed": bool(value_waves)
        },
        "funnel": {
            "health_score": funnel_health,
            "assessed": bool(brand_funnel)
        },
        "assets": {
            "naming_projects": naming_projects,
            "has_naming": naming_projects > 0,
            "has_logo": has_logo,
            "has_universe": "universality" in pillars_data and bool(pillars_data.get("universality", {}).get("answers"))
        }
    }


async def calculate_bvs_from_real_data(brand_id: str) -> Dict:
    """Calculate BVS score using real data from all integrations"""
    metrics = await get_brand_metrics(brand_id)
    
    # 1. Brand Strength (25%) - Brand recognition, differentiation, perceived value
    brand_strength_score = 50  # Base
    
    # Pillar completion adds to brand strength
    if metrics["pillars"]["completion_pct"] >= 100:
        brand_strength_score += 25
    elif metrics["pillars"]["completion_pct"] >= 70:
        brand_strength_score += 15
    elif metrics["pillars"]["completion_pct"] >= 40:
        brand_strength_score += 10
    
    # Value waves brand dimension
    brand_strength_score += metrics["value_waves"]["brand_score"] * 0.25
    brand_strength_score = min(100, brand_strength_score)
    
    # 2. Market Performance (25%) - Market share, growth, competitiveness
    market_performance_score = 40  # Base
    
    # Ads performance
    if metrics["ads"]["has_data"]:
        if metrics["ads"]["impressions"] > 100000:
            market_performance_score += 20
        elif metrics["ads"]["impressions"] > 50000:
            market_performance_score += 15
        elif metrics["ads"]["impressions"] > 10000:
            market_performance_score += 10
        
        if metrics["ads"]["ctr"] > 3:
            market_performance_score += 10
        elif metrics["ads"]["ctr"] > 1.5:
            market_performance_score += 5
    
    # Funnel health
    market_performance_score += metrics["funnel"]["health_score"] * 0.2
    
    # Value waves business dimension
    market_performance_score += metrics["value_waves"]["business_score"] * 0.2
    market_performance_score = min(100, market_performance_score)
    
    # 3. Customer Connection (25%) - Sentiment, engagement, loyalty
    customer_connection_score = 50  # Base
    
    # Social sentiment
    if metrics["social"]["has_data"]:
        customer_connection_score = metrics["social"]["sentiment_score"]
        
        # Engagement bonus
        if metrics["social"]["engagement"] > 1000:
            customer_connection_score += 10
        elif metrics["social"]["engagement"] > 500:
            customer_connection_score += 5
    
    # CRM contacts (loyalty indicator)
    if metrics["crm"]["contacts"] > 100:
        customer_connection_score += 15
    elif metrics["crm"]["contacts"] > 50:
        customer_connection_score += 10
    elif metrics["crm"]["contacts"] > 10:
        customer_connection_score += 5
    
    customer_connection_score = min(100, customer_connection_score)
    
    # 4. Brand Health (25%) - Consistency, maturity, governance
    brand_health_score = 40  # Base
    
    # Maturity score
    brand_health_score += metrics["maturity"]["score"] * 0.4
    
    # Touchpoint health
    brand_health_score += metrics["touchpoints"]["health_score"] * 0.3
    
    # Value waves communication dimension
    brand_health_score += metrics["value_waves"]["communication_score"] * 0.3
    brand_health_score = min(100, brand_health_score)
    
    # Calculate overall BVS
    overall_bvs = round(
        (brand_strength_score * 0.25) +
        (market_performance_score * 0.25) +
        (customer_connection_score * 0.25) +
        (brand_health_score * 0.25),
        1
    )
    
    # Determine level
    if overall_bvs >= 80:
        level = {"name": "Líder de Mercado", "description": "Marca de alta performance e reconhecimento", "color": "#22c55e"}
    elif overall_bvs >= 65:
        level = {"name": "Marca Forte", "description": "Marca bem posicionada com espaço para crescer", "color": "#3b82f6"}
    elif overall_bvs >= 50:
        level = {"name": "Em Desenvolvimento", "description": "Marca em construção, precisa de investimentos estratégicos", "color": "#F59E0B"}
    elif overall_bvs >= 35:
        level = {"name": "Emergente", "description": "Marca iniciante com potencial", "color": "#f97316"}
    else:
        level = {"name": "Inicial", "description": "Marca precisa de trabalho fundamental", "color": "#ef4444"}
    
    return {
        "bvs_score": overall_bvs,
        "level": level,
        "components": {
            "brand_strength": {
                "name": "Força da Marca",
                "score": round(brand_strength_score),
                "weight": 0.25,
                "details": {
                    "pillar_completion": metrics["pillars"]["completion_pct"],
                    "value_waves_brand": metrics["value_waves"]["brand_score"]
                }
            },
            "market_performance": {
                "name": "Performance de Mercado",
                "score": round(market_performance_score),
                "weight": 0.25,
                "details": {
                    "ads_impressions": metrics["ads"]["impressions"],
                    "funnel_health": metrics["funnel"]["health_score"],
                    "value_waves_business": metrics["value_waves"]["business_score"]
                }
            },
            "customer_connection": {
                "name": "Conexão com Cliente",
                "score": round(customer_connection_score),
                "weight": 0.25,
                "details": {
                    "sentiment_score": metrics["social"]["sentiment_score"],
                    "crm_contacts": metrics["crm"]["contacts"]
                }
            },
            "brand_health": {
                "name": "Saúde da Marca",
                "score": round(brand_health_score),
                "weight": 0.25,
                "details": {
                    "maturity_score": metrics["maturity"]["score"],
                    "touchpoint_health": metrics["touchpoints"]["health_score"],
                    "value_waves_communication": metrics["value_waves"]["communication_score"]
                }
            }
        },
        "data_sources": {
            "pillars": metrics["pillars"]["completion_pct"] > 0,
            "touchpoints": metrics["touchpoints"]["count"] > 0,
            "maturity": metrics["maturity"]["assessed"],
            "crm": metrics["crm"]["has_data"],
            "ads": metrics["ads"]["has_data"],
            "social": metrics["social"]["has_data"],
            "value_waves": metrics["value_waves"]["assessed"],
            "funnel": metrics["funnel"]["assessed"]
        },
        "metrics": metrics
    }


async def calculate_brand_health(brand_id: str) -> Dict:
    """Calculate overall brand health score from all modules"""
    metrics = await get_brand_metrics(brand_id)
    
    # Weight components
    weights = {
        "pillars": 0.20,
        "touchpoints": 0.15,
        "maturity": 0.15,
        "social": 0.15,
        "ads": 0.10,
        "crm": 0.10,
        "value_waves": 0.10,
        "funnel": 0.05
    }
    
    scores = {
        "pillars": metrics["pillars"]["completion_pct"],
        "touchpoints": metrics["touchpoints"]["health_score"],
        "maturity": metrics["maturity"]["score"],
        "social": metrics["social"]["sentiment_score"],
        "ads": min(100, (metrics["ads"]["impressions"] / 1000) if metrics["ads"]["impressions"] > 0 else 50),
        "crm": min(100, (metrics["crm"]["contacts"] * 2)) if metrics["crm"]["contacts"] > 0 else 40,
        "value_waves": (metrics["value_waves"]["brand_score"] + metrics["value_waves"]["business_score"] + metrics["value_waves"]["communication_score"]) / 3 if metrics["value_waves"]["assessed"] else 50,
        "funnel": metrics["funnel"]["health_score"]
    }
    
    # Calculate weighted score
    health_score = sum(scores[k] * weights[k] for k in weights)
    
    return {
        "health_score": round(health_score),
        "components": scores,
        "weights": weights,
        "metrics": metrics
    }
