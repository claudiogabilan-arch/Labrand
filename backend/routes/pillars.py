"""
LaBrand - Pillar Routes
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Pillars"])


# Generic pillar functions
async def get_pillar(collection_name: str, brand_id: str, user: dict):
    """Get pillar data"""
    pillar = await db[collection_name].find_one({"brand_id": brand_id}, {"_id": 0})
    return pillar


async def upsert_pillar(collection_name: str, brand_id: str, data: dict, user: dict):
    """Create or update pillar data"""
    data["brand_id"] = brand_id
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    existing = await db[collection_name].find_one({"brand_id": brand_id}, {"_id": 0})
    if existing:
        await db[collection_name].update_one({"brand_id": brand_id}, {"$set": data})
    else:
        pillar_id = f"{collection_name}_{uuid.uuid4().hex[:12]}"
        data["pillar_id"] = pillar_id
        await db[collection_name].insert_one(data)
    
    result = await db[collection_name].find_one({"brand_id": brand_id}, {"_id": 0})
    return result


# Start Pillar
@router.get("/brands/{brand_id}/pillars/start")
async def get_pillar_start(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_start", brand_id, user) or {}


@router.put("/brands/{brand_id}/pillars/start")
async def update_pillar_start(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_start", brand_id, data, user)


# Values Pillar
@router.get("/brands/{brand_id}/pillars/values")
async def get_pillar_values(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_values", brand_id, user) or {}


@router.put("/brands/{brand_id}/pillars/values")
async def update_pillar_values(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_values", brand_id, data, user)


# Purpose Pillar
@router.get("/brands/{brand_id}/pillars/purpose")
async def get_pillar_purpose(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_purpose", brand_id, user) or {}


@router.put("/brands/{brand_id}/pillars/purpose")
async def update_pillar_purpose(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_purpose", brand_id, data, user)


# Promise Pillar
@router.get("/brands/{brand_id}/pillars/promise")
async def get_pillar_promise(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_promise", brand_id, user) or {}


@router.put("/brands/{brand_id}/pillars/promise")
async def update_pillar_promise(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_promise", brand_id, data, user)


# Positioning Pillar
@router.get("/brands/{brand_id}/pillars/positioning")
async def get_pillar_positioning(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_positioning", brand_id, user) or {}


@router.put("/brands/{brand_id}/pillars/positioning")
async def update_pillar_positioning(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_positioning", brand_id, data, user)


# Personality Pillar
@router.get("/brands/{brand_id}/pillars/personality")
async def get_pillar_personality(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_personality", brand_id, user) or {}


@router.put("/brands/{brand_id}/pillars/personality")
async def update_pillar_personality(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_personality", brand_id, data, user)


# Universality Pillar
@router.get("/brands/{brand_id}/pillars/universality")
async def get_pillar_universality(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_universality", brand_id, user) or {}


@router.put("/brands/{brand_id}/pillars/universality")
async def update_pillar_universality(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_universality", brand_id, data, user)


# Valuation Pillar
@router.get("/brands/{brand_id}/pillars/valuation")
async def get_pillar_valuation(brand_id: str, user: dict = Depends(get_current_user)):
    return await get_pillar("pillar_valuation", brand_id, user) or {}


@router.put("/brands/{brand_id}/pillars/valuation")
async def update_pillar_valuation(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await upsert_pillar("pillar_valuation", brand_id, data, user)


# ==================== TASKS ====================

@router.get("/brands/{brand_id}/tasks")
async def get_tasks(brand_id: str, user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({"brand_id": brand_id}, {"_id": 0}).to_list(500)
    return tasks


@router.post("/brands/{brand_id}/tasks")
async def create_task(brand_id: str, task_data: dict, user: dict = Depends(get_current_user)):
    task_id = f"task_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    task_doc = {
        "task_id": task_id,
        "brand_id": brand_id,
        "title": task_data.get("title", ""),
        "description": task_data.get("description"),
        "status": task_data.get("status", "backlog"),
        "priority": task_data.get("priority", "medium"),
        "assigned_to": task_data.get("assigned_to"),
        "due_date": task_data.get("due_date"),
        "pillar": task_data.get("pillar"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.tasks.insert_one(task_doc)
    task_doc.pop("_id", None)
    return task_doc


@router.put("/brands/{brand_id}/tasks/{task_id}")
async def update_task(brand_id: str, task_id: str, task_data: dict, user: dict = Depends(get_current_user)):
    task_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tasks.update_one({"task_id": task_id, "brand_id": brand_id}, {"$set": task_data})
    updated = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    return updated


@router.delete("/brands/{brand_id}/tasks/{task_id}")
async def delete_task(brand_id: str, task_id: str, user: dict = Depends(get_current_user)):
    await db.tasks.delete_one({"task_id": task_id, "brand_id": brand_id})
    return {"message": "Tarefa removida"}


# ==================== DECISIONS ====================

@router.get("/brands/{brand_id}/decisions")
async def get_decisions(brand_id: str, user: dict = Depends(get_current_user)):
    decisions = await db.decisions.find({"brand_id": brand_id}, {"_id": 0}).to_list(500)
    return decisions


@router.post("/brands/{brand_id}/decisions")
async def create_decision(brand_id: str, decision_data: dict, user: dict = Depends(get_current_user)):
    decision_id = f"decision_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    decision_doc = {
        "decision_id": decision_id,
        "brand_id": brand_id,
        "title": decision_data.get("title", ""),
        "contexto": decision_data.get("contexto"),
        "hipoteses": decision_data.get("hipoteses", []),
        "evidencias": decision_data.get("evidencias", []),
        "impacto_esperado": decision_data.get("impacto_esperado"),
        "resultado_real": decision_data.get("resultado_real"),
        "status": decision_data.get("status", "pending"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.decisions.insert_one(decision_doc)
    decision_doc.pop("_id", None)
    return decision_doc


@router.put("/brands/{brand_id}/decisions/{decision_id}")
async def update_decision(brand_id: str, decision_id: str, decision_data: dict, user: dict = Depends(get_current_user)):
    decision_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.decisions.update_one({"decision_id": decision_id, "brand_id": brand_id}, {"$set": decision_data})
    updated = await db.decisions.find_one({"decision_id": decision_id}, {"_id": 0})
    return updated


# ==================== NARRATIVES ====================

@router.get("/brands/{brand_id}/narratives")
async def get_narratives(brand_id: str, user: dict = Depends(get_current_user)):
    narratives = await db.narratives.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
    return narratives


@router.post("/brands/{brand_id}/narratives")
async def create_narrative(brand_id: str, narrative_data: dict, user: dict = Depends(get_current_user)):
    narrative_id = f"narrative_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    narrative_doc = {
        "narrative_id": narrative_id,
        "brand_id": brand_id,
        "tipo": narrative_data.get("tipo", "historia"),
        "title": narrative_data.get("title", ""),
        "content": narrative_data.get("content"),
        "missao": narrative_data.get("missao"),
        "visao": narrative_data.get("visao"),
        "valores": narrative_data.get("valores", []),
        "marcos": narrative_data.get("marcos", []),
        "anexos": narrative_data.get("anexos", []),
        "created_at": now,
        "updated_at": now
    }
    
    await db.narratives.insert_one(narrative_doc)
    narrative_doc.pop("_id", None)
    return narrative_doc


@router.put("/brands/{brand_id}/narratives/{narrative_id}")
async def update_narrative(brand_id: str, narrative_id: str, narrative_data: dict, user: dict = Depends(get_current_user)):
    narrative_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.narratives.update_one({"narrative_id": narrative_id, "brand_id": brand_id}, {"$set": narrative_data})
    updated = await db.narratives.find_one({"narrative_id": narrative_id}, {"_id": 0})
    return updated


# ==================== BRAND WAY (JEITO DE SER) ====================

@router.get("/brands/{brand_id}/brand-way")
async def get_brand_way(brand_id: str, user: dict = Depends(get_current_user)):
    """Get brand way/identity data"""
    data = await db.brand_way.find_one({"brand_id": brand_id}, {"_id": 0})
    return data or {}


@router.put("/brands/{brand_id}/brand-way")
async def update_brand_way(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update brand way/identity data"""
    data["brand_id"] = brand_id
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    existing = await db.brand_way.find_one({"brand_id": brand_id})
    if existing:
        await db.brand_way.update_one({"brand_id": brand_id}, {"$set": data})
    else:
        await db.brand_way.insert_one(data)
    
    result = await db.brand_way.find_one({"brand_id": brand_id}, {"_id": 0})
    return result


# ==================== COMPETITORS ====================

@router.get("/brands/{brand_id}/competitors")
async def get_competitors(brand_id: str, user: dict = Depends(get_current_user)):
    """Get competitor analysis data"""
    data = await db.competitors.find_one({"brand_id": brand_id}, {"_id": 0})
    return data or {"competitors": [], "my_brand_scores": {}}


@router.put("/brands/{brand_id}/competitors")
async def update_competitors(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update competitor analysis data"""
    data["brand_id"] = brand_id
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.competitors.update_one(
        {"brand_id": brand_id},
        {"$set": data},
        upsert=True
    )
    
    result = await db.competitors.find_one({"brand_id": brand_id}, {"_id": 0})
    return result
