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
    
    # Check if brand has real mentions
    if brand_mentions == 0:
        # Return empty state - no mock data
        return {
            "sov": {
                "brand": {
                    "name": brand_name,
                    "mentions": 0,
                    "sov_percentage": 0
                },
                "competitors": []
            },
            "channels": {},
            "trend": {},
            "insights": [],
            "has_data": False,
            "message": "Nenhuma menção encontrada. Configure o monitoramento em Social Listening e adicione concorrentes para comparar."
        }
    
    # Only use real competitor mention data from DB
    competitors_data = []
    total_mentions = brand_mentions
    
    if sov_config and sov_config.get("competitors"):
        for comp in sov_config["competitors"]:
            # Count real mentions for competitor keywords
            comp_mentions = 0
            for keyword in comp.get("keywords", []):
                count = await db.social_mentions.count_documents({
                    "brand_id": brand_id,
                    "content": {"$regex": keyword, "$options": "i"},
                    "created_at": {"$gte": since.isoformat()}
                })
                comp_mentions += count
            competitors_data.append({
                "name": comp["name"],
                "mentions": comp_mentions,
                "keywords": comp["keywords"]
            })
            total_mentions += comp_mentions
    
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
    
    return {
        "sov": sov_data,
        "total_market_mentions": total_mentions,
        "brand_rank": brand_rank,
        "total_players": len(sov_data["competitors"]) + 1,
        "channel_breakdown": {},
        "period_days": period,
        "has_data": True,
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
    """Get Share of Voice trend over time - only real data"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0, "name": 1})
    brand_name = brand.get("name", "Sua Marca") if brand else "Sua Marca"
    
    # Get real historical SOV data
    history = await db.sov_history.find(
        {"brand_id": brand_id},
        {"_id": 0}
    ).sort("month", -1).to_list(months)
    
    return {
        "brand_name": brand_name,
        "trend": history,
        "has_data": len(history) > 0,
        "growth": history[-1].get("brand_sov", 0) - history[0].get("brand_sov", 0) if len(history) >= 2 else 0,
        "message": "Nenhum histórico disponível. Os dados serão acumulados conforme o monitoramento." if not history else None
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
