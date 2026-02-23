"""Share of Voice Routes - Brand vs Competitors comparison"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Share of Voice"])


class CompetitorConfig(BaseModel):
    name: str
    keywords: List[str]


class SOVConfig(BaseModel):
    competitors: List[CompetitorConfig]
    channels: List[str] = ["social", "search", "paid"]


@router.get("/brands/{brand_id}/share-of-voice")
async def get_share_of_voice(brand_id: str, period: int = 30, user: dict = Depends(get_current_user)):
    """Get Share of Voice analysis comparing brand to competitors"""
    
    # Get brand info
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0, "name": 1})
    brand_name = brand.get("name", "Sua Marca") if brand else "Sua Marca"
    
    # Get SOV config
    sov_config = await db.sov_config.find_one({"brand_id": brand_id}, {"_id": 0})
    
    # Get social mentions for brand
    since = datetime.now(timezone.utc) - timedelta(days=period)
    brand_mentions = await db.social_mentions.count_documents({
        "brand_id": brand_id,
        "created_at": {"$gte": since.isoformat()}
    })
    
    # If no real data, generate sample
    if brand_mentions == 0:
        brand_mentions = 150  # Sample value
    
    # Get competitor data (simulated if not configured)
    competitors_data = []
    total_mentions = brand_mentions
    
    if sov_config and sov_config.get("competitors"):
        for comp in sov_config["competitors"]:
            # In real implementation, would fetch actual data
            comp_mentions = int(brand_mentions * (0.5 + (hash(comp["name"]) % 100) / 100))
            competitors_data.append({
                "name": comp["name"],
                "mentions": comp_mentions,
                "keywords": comp["keywords"]
            })
            total_mentions += comp_mentions
    else:
        # Default competitors for demo
        default_competitors = [
            {"name": "Concorrente A", "mentions": int(brand_mentions * 0.8)},
            {"name": "Concorrente B", "mentions": int(brand_mentions * 1.2)},
            {"name": "Concorrente C", "mentions": int(brand_mentions * 0.6)}
        ]
        for comp in default_competitors:
            competitors_data.append(comp)
            total_mentions += comp["mentions"]
    
    # Calculate SOV percentages
    brand_sov = round((brand_mentions / total_mentions) * 100, 1) if total_mentions > 0 else 0
    
    sov_data = {
        "brand": {
            "name": brand_name,
            "mentions": brand_mentions,
            "sov_percentage": brand_sov
        },
        "competitors": []
    }
    
    for comp in competitors_data:
        comp_sov = round((comp["mentions"] / total_mentions) * 100, 1) if total_mentions > 0 else 0
        sov_data["competitors"].append({
            "name": comp["name"],
            "mentions": comp["mentions"],
            "sov_percentage": comp_sov,
            "vs_brand": round(comp_sov - brand_sov, 1)
        })
    
    # Sort by SOV
    sov_data["competitors"].sort(key=lambda x: x["sov_percentage"], reverse=True)
    
    # Calculate rank
    all_sov = [brand_sov] + [c["sov_percentage"] for c in sov_data["competitors"]]
    all_sov.sort(reverse=True)
    brand_rank = all_sov.index(brand_sov) + 1
    
    # Channel breakdown (simulated)
    channel_breakdown = {
        "social": {"brand": int(brand_mentions * 0.5), "market": int(total_mentions * 0.45)},
        "search": {"brand": int(brand_mentions * 0.3), "market": int(total_mentions * 0.35)},
        "paid": {"brand": int(brand_mentions * 0.2), "market": int(total_mentions * 0.2)}
    }
    
    return {
        "sov": sov_data,
        "total_market_mentions": total_mentions,
        "brand_rank": brand_rank,
        "total_players": len(sov_data["competitors"]) + 1,
        "channel_breakdown": channel_breakdown,
        "period_days": period,
        "insights": generate_sov_insights(brand_sov, sov_data["competitors"], brand_rank)
    }


@router.post("/brands/{brand_id}/share-of-voice/config")
async def save_sov_config(brand_id: str, data: SOVConfig, user: dict = Depends(get_current_user)):
    """Save Share of Voice configuration"""
    config_doc = {
        "brand_id": brand_id,
        "competitors": [c.dict() for c in data.competitors],
        "channels": data.channels,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["user_id"]
    }
    
    await db.sov_config.update_one(
        {"brand_id": brand_id},
        {"$set": config_doc},
        upsert=True
    )
    
    return {"success": True, "config": config_doc}


@router.get("/brands/{brand_id}/share-of-voice/trend")
async def get_sov_trend(brand_id: str, months: int = 6, user: dict = Depends(get_current_user)):
    """Get Share of Voice trend over time"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0, "name": 1})
    brand_name = brand.get("name", "Sua Marca") if brand else "Sua Marca"
    
    # Generate trend data (in production, would aggregate from real data)
    now = datetime.now(timezone.utc)
    trend = []
    
    base_sov = 25  # Starting SOV
    for i in range(months):
        month_date = now - timedelta(days=30 * (months - 1 - i))
        # Simulate gradual improvement
        month_sov = base_sov + (i * 2) + (hash(str(i)) % 5)
        trend.append({
            "month": month_date.strftime("%Y-%m"),
            "brand_sov": min(45, month_sov),
            "market_leader_sov": 35 + (hash(str(i * 2)) % 10)
        })
    
    return {
        "brand_name": brand_name,
        "trend": trend,
        "growth": trend[-1]["brand_sov"] - trend[0]["brand_sov"] if trend else 0
    }


def generate_sov_insights(brand_sov: float, competitors: List[dict], rank: int) -> List[dict]:
    """Generate insights based on SOV data"""
    insights = []
    
    if rank == 1:
        insights.append({
            "type": "success",
            "title": "Líder de Share of Voice",
            "message": f"Sua marca lidera com {brand_sov}% de participação nas conversas",
            "action": "Mantenha a consistência e explore novos canais"
        })
    elif rank <= 3:
        leader = competitors[0] if competitors else None
        if leader:
            gap = leader["sov_percentage"] - brand_sov
            insights.append({
                "type": "info",
                "title": f"{rank}º lugar em Share of Voice",
                "message": f"Você está {gap:.1f}% atrás do líder ({leader['name']})",
                "action": "Aumente a frequência de publicações e interações"
            })
    else:
        insights.append({
            "type": "warning",
            "title": "Share of Voice abaixo do ideal",
            "message": f"Sua marca está na {rank}ª posição com apenas {brand_sov}%",
            "action": "Invista em conteúdo e campanhas para aumentar visibilidade"
        })
    
    # Check for close competitors
    for comp in competitors:
        if abs(comp["sov_percentage"] - brand_sov) < 3:
            insights.append({
                "type": "info",
                "title": f"Disputa acirrada com {comp['name']}",
                "message": f"Diferença de apenas {abs(comp['vs_brand']):.1f}%",
                "action": "Monitore de perto e diferencie sua comunicação"
            })
            break
    
    return insights
