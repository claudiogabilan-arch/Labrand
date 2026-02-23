"""Brand Funnel Routes - Brand preference journey visualization"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Brand Funnel"])


# Brand Funnel Stages
FUNNEL_STAGES = [
    {
        "id": "awareness",
        "name": "Conhecimento",
        "description": "Quantos conhecem sua marca",
        "icon": "eye",
        "color": "#94A3B8",
        "metrics": ["impressions", "reach", "brand_searches"]
    },
    {
        "id": "consideration",
        "name": "Consideração",
        "description": "Quantos consideram sua marca como opção",
        "icon": "search",
        "color": "#60A5FA",
        "metrics": ["website_visits", "content_engagement", "comparisons"]
    },
    {
        "id": "preference",
        "name": "Preferência",
        "description": "Quantos preferem sua marca",
        "icon": "heart",
        "color": "#A78BFA",
        "metrics": ["leads", "trials", "wishlist_adds"]
    },
    {
        "id": "purchase",
        "name": "Compra",
        "description": "Quantos compram sua marca",
        "icon": "shopping-cart",
        "color": "#34D399",
        "metrics": ["conversions", "new_customers", "revenue"]
    },
    {
        "id": "loyalty",
        "name": "Lealdade",
        "description": "Quantos são leais à sua marca",
        "icon": "award",
        "color": "#FBBF24",
        "metrics": ["repeat_purchases", "retention_rate", "referrals"]
    },
    {
        "id": "advocacy",
        "name": "Advocacia",
        "description": "Quantos recomendam ativamente",
        "icon": "megaphone",
        "color": "#F472B6",
        "metrics": ["nps_promoters", "reviews", "social_shares"]
    }
]


class FunnelStageData(BaseModel):
    stage_id: str
    value: int
    previous_value: Optional[int] = None
    notes: Optional[str] = None


class FunnelUpdate(BaseModel):
    stages: List[FunnelStageData]
    period: str = "monthly"  # monthly, quarterly


@router.get("/brand-funnel/stages")
async def get_funnel_stages():
    """Get funnel stage definitions"""
    return {"stages": FUNNEL_STAGES}


@router.get("/brands/{brand_id}/brand-funnel")
async def get_brand_funnel(brand_id: str, user: dict = Depends(get_current_user)):
    """Get current brand funnel data"""
    funnel = await db.brand_funnel.find_one(
        {"brand_id": brand_id},
        {"_id": 0}
    )
    
    if not funnel:
        # Generate initial funnel based on available data
        funnel = await generate_initial_funnel(brand_id)
    
    return {"funnel": funnel, "stages_info": FUNNEL_STAGES}


@router.post("/brands/{brand_id}/brand-funnel")
async def update_brand_funnel(brand_id: str, data: FunnelUpdate, user: dict = Depends(get_current_user)):
    """Update brand funnel data"""
    stages_data = {}
    
    for stage in data.stages:
        stages_data[stage.stage_id] = {
            "value": stage.value,
            "previous_value": stage.previous_value,
            "notes": stage.notes,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    # Calculate conversion rates
    conversion_rates = calculate_conversion_rates(data.stages)
    
    # Calculate funnel health score
    health_score = calculate_funnel_health(data.stages, conversion_rates)
    
    funnel_doc = {
        "brand_id": brand_id,
        "stages": stages_data,
        "conversion_rates": conversion_rates,
        "health_score": health_score,
        "period": data.period,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["user_id"]
    }
    
    await db.brand_funnel.update_one(
        {"brand_id": brand_id},
        {"$set": funnel_doc},
        upsert=True
    )
    
    # Save to history
    history_doc = {
        "funnel_id": f"funnel_{uuid.uuid4().hex[:12]}",
        "brand_id": brand_id,
        **funnel_doc
    }
    await db.brand_funnel_history.insert_one(history_doc)
    
    return {"success": True, "funnel": {k: v for k, v in funnel_doc.items() if k != "_id"}}


@router.get("/brands/{brand_id}/brand-funnel/analysis")
async def get_funnel_analysis(brand_id: str, user: dict = Depends(get_current_user)):
    """Get detailed funnel analysis with insights"""
    funnel = await db.brand_funnel.find_one({"brand_id": brand_id}, {"_id": 0})
    
    if not funnel:
        return {"analysis": None, "message": "Configure o funil primeiro"}
    
    stages = funnel.get("stages", {})
    conversion_rates = funnel.get("conversion_rates", {})
    
    # Identify bottlenecks
    bottlenecks = []
    for i, stage in enumerate(FUNNEL_STAGES[:-1]):
        next_stage = FUNNEL_STAGES[i + 1]
        rate_key = f"{stage['id']}_to_{next_stage['id']}"
        rate = conversion_rates.get(rate_key, 0)
        
        # Industry benchmarks (simplified)
        benchmarks = {
            "awareness_to_consideration": 30,
            "consideration_to_preference": 40,
            "preference_to_purchase": 25,
            "purchase_to_loyalty": 35,
            "loyalty_to_advocacy": 20
        }
        benchmark = benchmarks.get(rate_key, 30)
        
        if rate < benchmark * 0.7:  # 30% below benchmark
            bottlenecks.append({
                "from_stage": stage["name"],
                "to_stage": next_stage["name"],
                "current_rate": rate,
                "benchmark": benchmark,
                "gap": benchmark - rate,
                "priority": "high" if rate < benchmark * 0.5 else "medium"
            })
    
    # Generate opportunities
    opportunities = []
    
    # Check awareness stage
    awareness_val = stages.get("awareness", {}).get("value", 0)
    purchase_val = stages.get("purchase", {}).get("value", 0)
    if awareness_val > 0 and purchase_val / awareness_val < 0.01:  # Less than 1% conversion
        opportunities.append({
            "type": "conversion",
            "title": "Baixa conversão de awareness para compra",
            "description": "Apenas " + str(round(purchase_val / awareness_val * 100, 2)) + "% do público que conhece a marca está comprando",
            "action": "Revise a jornada do cliente e identifique pontos de atrito"
        })
    
    # Check loyalty
    loyalty_val = stages.get("loyalty", {}).get("value", 0)
    if purchase_val > 0 and loyalty_val / purchase_val < 0.3:
        opportunities.append({
            "type": "retention",
            "title": "Retenção abaixo do ideal",
            "description": "Menos de 30% dos clientes estão se tornando leais",
            "action": "Implemente programa de fidelidade e melhore pós-venda"
        })
    
    # Check advocacy
    advocacy_val = stages.get("advocacy", {}).get("value", 0)
    if loyalty_val > 0 and advocacy_val / loyalty_val < 0.2:
        opportunities.append({
            "type": "advocacy",
            "title": "Poucos promotores ativos",
            "description": "Menos de 20% dos clientes leais estão recomendando",
            "action": "Crie programa de indicação e facilite o compartilhamento"
        })
    
    return {
        "funnel": funnel,
        "bottlenecks": bottlenecks,
        "opportunities": opportunities,
        "health_score": funnel.get("health_score", 0)
    }


@router.get("/brands/{brand_id}/brand-funnel/history")
async def get_funnel_history(brand_id: str, limit: int = 12, user: dict = Depends(get_current_user)):
    """Get historical funnel data"""
    history = await db.brand_funnel_history.find(
        {"brand_id": brand_id},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(limit)
    
    return {"history": history, "total": len(history)}


@router.get("/brands/{brand_id}/brand-funnel/benchmark")
async def get_funnel_benchmark(brand_id: str, user: dict = Depends(get_current_user)):
    """Get industry benchmark for funnel comparison"""
    funnel = await db.brand_funnel.find_one({"brand_id": brand_id}, {"_id": 0})
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0, "sector": 1})
    
    sector = brand.get("sector", "general") if brand else "general"
    
    # Industry benchmarks by sector (simplified)
    benchmarks = {
        "technology": {
            "awareness_to_consideration": 35,
            "consideration_to_preference": 45,
            "preference_to_purchase": 20,
            "purchase_to_loyalty": 40,
            "loyalty_to_advocacy": 25
        },
        "retail": {
            "awareness_to_consideration": 40,
            "consideration_to_preference": 35,
            "preference_to_purchase": 30,
            "purchase_to_loyalty": 25,
            "loyalty_to_advocacy": 15
        },
        "services": {
            "awareness_to_consideration": 30,
            "consideration_to_preference": 40,
            "preference_to_purchase": 25,
            "purchase_to_loyalty": 45,
            "loyalty_to_advocacy": 30
        },
        "general": {
            "awareness_to_consideration": 30,
            "consideration_to_preference": 40,
            "preference_to_purchase": 25,
            "purchase_to_loyalty": 35,
            "loyalty_to_advocacy": 20
        }
    }
    
    sector_benchmark = benchmarks.get(sector.lower(), benchmarks["general"])
    
    # Compare with brand's rates
    comparison = {}
    if funnel and funnel.get("conversion_rates"):
        brand_rates = funnel["conversion_rates"]
        for key, benchmark_val in sector_benchmark.items():
            brand_val = brand_rates.get(key, 0)
            comparison[key] = {
                "brand": brand_val,
                "benchmark": benchmark_val,
                "difference": round(brand_val - benchmark_val, 1),
                "status": "above" if brand_val >= benchmark_val else "below"
            }
    
    return {
        "sector": sector,
        "benchmark": sector_benchmark,
        "comparison": comparison,
        "has_data": bool(funnel)
    }


def calculate_conversion_rates(stages: List[FunnelStageData]) -> dict:
    """Calculate conversion rates between stages"""
    rates = {}
    stages_dict = {s.stage_id: s.value for s in stages}
    
    stage_order = ["awareness", "consideration", "preference", "purchase", "loyalty", "advocacy"]
    
    for i in range(len(stage_order) - 1):
        current = stage_order[i]
        next_stage = stage_order[i + 1]
        
        current_val = stages_dict.get(current, 0)
        next_val = stages_dict.get(next_stage, 0)
        
        rate = round((next_val / current_val * 100), 1) if current_val > 0 else 0
        rates[f"{current}_to_{next_stage}"] = min(rate, 100)  # Cap at 100%
    
    return rates


def calculate_funnel_health(stages: List[FunnelStageData], rates: dict) -> int:
    """Calculate overall funnel health score"""
    # Average of all conversion rates normalized to 0-100
    if not rates:
        return 0
    
    # Ideal rates (benchmarks)
    ideal_rates = {
        "awareness_to_consideration": 30,
        "consideration_to_preference": 40,
        "preference_to_purchase": 25,
        "purchase_to_loyalty": 35,
        "loyalty_to_advocacy": 20
    }
    
    scores = []
    for key, ideal in ideal_rates.items():
        actual = rates.get(key, 0)
        # Score is how close to ideal (max 100 if at or above ideal)
        score = min(100, (actual / ideal) * 100) if ideal > 0 else 0
        scores.append(score)
    
    return int(sum(scores) / len(scores)) if scores else 0


async def generate_initial_funnel(brand_id: str) -> dict:
    """Generate initial funnel data based on available metrics"""
    # Get ads data
    meta_ads = await db.ads_metrics.find_one({"brand_id": brand_id, "provider": "meta"})
    google_ads = await db.ads_metrics.find_one({"brand_id": brand_id, "provider": "google"})
    
    # Estimate funnel values
    total_impressions = 0
    total_conversions = 0
    
    for ads in [meta_ads, google_ads]:
        if ads and ads.get("metrics"):
            for m in ads["metrics"]:
                total_impressions += m.get("impressions", 0)
                total_conversions += m.get("conversions", 0)
    
    # Generate estimated values
    awareness = max(total_impressions // 100, 10000)  # Normalize
    consideration = int(awareness * 0.3)
    preference = int(consideration * 0.4)
    purchase = max(total_conversions, int(preference * 0.25))
    loyalty = int(purchase * 0.35)
    advocacy = int(loyalty * 0.2)
    
    stages = {
        "awareness": {"value": awareness, "previous_value": None, "notes": "Estimativa baseada em impressões"},
        "consideration": {"value": consideration, "previous_value": None, "notes": "Estimativa"},
        "preference": {"value": preference, "previous_value": None, "notes": "Estimativa"},
        "purchase": {"value": purchase, "previous_value": None, "notes": "Baseado em conversões de Ads"},
        "loyalty": {"value": loyalty, "previous_value": None, "notes": "Estimativa"},
        "advocacy": {"value": advocacy, "previous_value": None, "notes": "Estimativa"}
    }
    
    # Calculate rates
    rates = {
        "awareness_to_consideration": 30,
        "consideration_to_preference": 40,
        "preference_to_purchase": 25,
        "purchase_to_loyalty": 35,
        "loyalty_to_advocacy": 20
    }
    
    return {
        "brand_id": brand_id,
        "stages": stages,
        "conversion_rates": rates,
        "health_score": 50,
        "period": "initial",
        "is_estimated": True,
        "message": "Dados estimados. Atualize com valores reais para análises precisas."
    }
