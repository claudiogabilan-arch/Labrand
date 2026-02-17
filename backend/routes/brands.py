"""
LaBrand - Brand Management Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from config import db
from models.schemas import BrandCreate
from utils.helpers import get_current_user

router = APIRouter(tags=["Brands"])


@router.post("/brands", response_model=dict)
async def create_brand(brand_data: BrandCreate, user: dict = Depends(get_current_user)):
    """Create a new brand"""
    brand_id = f"brand_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    brand_doc = {
        "brand_id": brand_id,
        "owner_id": user["user_id"],
        "name": brand_data.name,
        "description": brand_data.description,
        "industry": brand_data.industry,
        "logo_url": brand_data.logo_url,
        "brand_type": brand_data.brand_type,
        "parent_brand_id": brand_data.parent_brand_id,
        "team_members": [user["user_id"]],
        "onboarding_complete": False,
        "created_at": now,
        "updated_at": now
    }
    
    await db.brands.insert_one(brand_doc)
    brand_doc.pop("_id", None)
    return brand_doc


@router.get("/brands")
async def get_brands(user: dict = Depends(get_current_user)):
    """Get all brands for current user"""
    brands = await db.brands.find(
        {"$or": [{"owner_id": user["user_id"]}, {"team_members": user["user_id"]}]},
        {"_id": 0}
    ).to_list(100)
    return brands


@router.get("/brands/{brand_id}")
async def get_brand(brand_id: str, user: dict = Depends(get_current_user)):
    """Get a specific brand"""
    brand = await db.brands.find_one(
        {"brand_id": brand_id, "$or": [{"owner_id": user["user_id"]}, {"team_members": user["user_id"]}]},
        {"_id": 0}
    )
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    return brand


@router.put("/brands/{brand_id}")
async def update_brand(brand_id: str, brand_data: dict, user: dict = Depends(get_current_user)):
    """Update a brand"""
    brand = await db.brands.find_one({"brand_id": brand_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    brand_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.brands.update_one({"brand_id": brand_id}, {"$set": brand_data})
    
    updated = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    return updated


@router.delete("/brands/{brand_id}")
async def delete_brand(brand_id: str, user: dict = Depends(get_current_user)):
    """Delete a brand and all related data"""
    brand = await db.brands.find_one({"brand_id": brand_id, "owner_id": user["user_id"]}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    # Delete brand and all related data
    await db.brands.delete_one({"brand_id": brand_id})
    await db.pillar_start.delete_many({"brand_id": brand_id})
    await db.pillar_values.delete_many({"brand_id": brand_id})
    await db.pillar_purpose.delete_many({"brand_id": brand_id})
    await db.pillar_promise.delete_many({"brand_id": brand_id})
    await db.pillar_positioning.delete_many({"brand_id": brand_id})
    await db.pillar_personality.delete_many({"brand_id": brand_id})
    await db.pillar_universality.delete_many({"brand_id": brand_id})
    await db.pillar_valuation.delete_many({"brand_id": brand_id})
    await db.tasks.delete_many({"brand_id": brand_id})
    await db.decisions.delete_many({"brand_id": brand_id})
    await db.narratives.delete_many({"brand_id": brand_id})
    await db.google_connections.delete_many({"brand_id": brand_id})
    await db.brand_way.delete_many({"brand_id": brand_id})
    await db.brand_risk.delete_many({"brand_id": brand_id})
    await db.competitors.delete_many({"brand_id": brand_id})
    await db.consistency_alerts.delete_many({"brand_id": brand_id})
    
    # Update child brands if this was a parent
    await db.brands.update_many(
        {"parent_brand_id": brand_id},
        {"$set": {"parent_brand_id": None, "brand_type": "monolitica"}}
    )
    
    return {"message": "Marca excluída com sucesso"}


# ==================== EXECUTIVE SUMMARY & BENCHMARK ====================

@router.get("/brands/{brand_id}/executive-summary")
async def get_executive_summary(brand_id: str, user: dict = Depends(get_current_user)):
    """Dashboard executivo com métricas simplificadas"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    pillars = await db.pillars.find_one({"brand_id": brand_id}, {"_id": 0})
    valuation = await db.valuations.find_one({"brand_id": brand_id}, {"_id": 0})
    
    pillar_keys = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    filled = sum(1 for k in pillar_keys if pillars and pillars.get(k) and len(pillars.get(k, {})) > 0)
    brand_strength = int((filled / len(pillar_keys)) * 100) if pillars else 0
    
    rbi = valuation.get("role_of_brand", 50) if valuation else 50
    brand_value = valuation.get("total_value", 0) if valuation else 0
    
    risks = []
    opportunities = []
    
    if not pillars or not pillars.get("values"):
        risks.append("Valores da marca não definidos - risco de inconsistência")
    else:
        opportunities.append("Valores bem definidos fortalecem cultura organizacional")
    
    if not pillars or not pillars.get("positioning"):
        risks.append("Posicionamento não estruturado - dificuldade de diferenciação")
    else:
        opportunities.append("Posicionamento claro permite comunicação mais efetiva")
    
    if not pillars or not pillars.get("purpose"):
        risks.append("Propósito não definido - engajamento limitado com stakeholders")
    else:
        opportunities.append("Propósito forte atrai talentos e clientes alinhados")
    
    if brand_strength < 50:
        risks.append("Brand Strength abaixo de 50% - marca vulnerável a concorrentes")
    elif brand_strength >= 80:
        opportunities.append("Brand Strength alto - potencial para expansão de mercado")
    
    trend = "stable"
    if brand_strength >= 70:
        trend = "up"
    elif brand_strength < 30:
        trend = "down"
    
    return {
        "brand_strength": brand_strength,
        "role_of_brand": rbi,
        "valuation": brand_value,
        "trend": trend,
        "risks": risks[:3],
        "opportunities": opportunities[:3]
    }


@router.get("/brands/{brand_id}/benchmark")
async def get_benchmark(brand_id: str, user: dict = Depends(get_current_user)):
    """Benchmark setorial da marca"""
    pillars = await db.pillars.find_one({"brand_id": brand_id}, {"_id": 0})
    valuation = await db.valuations.find_one({"brand_id": brand_id}, {"_id": 0})
    
    sector = pillars.get("start", {}).get("industry", "default") if pillars else "default"
    
    pillar_keys = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    filled = sum(1 for k in pillar_keys if pillars and pillars.get(k) and len(pillars.get(k, {})) > 0)
    brand_strength = int((filled / len(pillar_keys)) * 100) if pillars else 0
    rbi = valuation.get("role_of_brand", 50) if valuation else 50
    
    percentile = min(95, max(5, brand_strength + 10))
    
    return {
        "sector": sector,
        "brand_strength": brand_strength,
        "rbi": rbi,
        "percentile": percentile
    }


@router.get("/brands/{brand_id}/metrics")
async def get_brand_metrics(brand_id: str, user: dict = Depends(get_current_user)):
    """Get brand metrics for dashboard"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    # Count pillars completed
    pillar_collections = ["pillar_start", "pillar_values", "pillar_purpose", "pillar_promise", 
                          "pillar_positioning", "pillar_personality", "pillar_universality"]
    pillars_completed = 0
    for collection in pillar_collections:
        pillar = await db[collection].find_one({"brand_id": brand_id})
        if pillar:
            pillars_completed += 1
    
    # Get tasks count
    tasks = await db.tasks.count_documents({"brand_id": brand_id})
    tasks_done = await db.tasks.count_documents({"brand_id": brand_id, "status": "done"})
    
    # Get decisions count
    decisions = await db.decisions.count_documents({"brand_id": brand_id})
    
    return {
        "pillars_total": len(pillar_collections),
        "pillars_completed": pillars_completed,
        "progress_percentage": round((pillars_completed / len(pillar_collections)) * 100),
        "tasks_total": tasks,
        "tasks_completed": tasks_done,
        "decisions_total": decisions
    }
