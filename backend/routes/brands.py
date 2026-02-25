"""
LaBrand - Brand Management Routes
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from datetime import datetime, timezone
import uuid
import os

from config import db
from models.schemas import BrandCreate
from utils.helpers import get_current_user

router = APIRouter(tags=["Brands"])

UPLOAD_DIR = "/app/backend/uploads/logos"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB for logos
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".svg"}

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)


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


@router.post("/brands/{brand_id}/logo")
async def upload_brand_logo(
    brand_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload brand logo"""
    # Check brand ownership
    brand = await db.brands.find_one(
        {"brand_id": brand_id, "$or": [{"owner_id": user["user_id"]}, {"team_members": user["user_id"]}]},
        {"_id": 0}
    )
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail="Formato não suportado. Use: JPG, PNG, WebP ou SVG (máx. 5MB)"
        )
    
    # Read and check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Tamanho máximo: 5MB")
    
    # Generate unique filename
    filename = f"{brand_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    # Delete old logo if exists
    old_logo = brand.get("logo_url")
    if old_logo and old_logo.startswith("/api/uploads/logos/"):
        old_filename = old_logo.split("/")[-1]
        old_path = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
    
    # Save new file
    with open(filepath, "wb") as f:
        f.write(contents)
    
    # Update brand in database
    logo_url = f"/api/uploads/logos/{filename}"
    await db.brands.update_one(
        {"brand_id": brand_id},
        {"$set": {"logo_url": logo_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "logo_url": logo_url,
        "message": "Logo atualizado com sucesso!"
    }


@router.delete("/brands/{brand_id}/logo")
async def delete_brand_logo(brand_id: str, user: dict = Depends(get_current_user)):
    """Remove brand logo"""
    brand = await db.brands.find_one(
        {"brand_id": brand_id, "owner_id": user["user_id"]},
        {"_id": 0}
    )
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    old_logo = brand.get("logo_url")
    if old_logo and old_logo.startswith("/api/uploads/logos/"):
        old_filename = old_logo.split("/")[-1]
        old_path = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)
    
    await db.brands.update_one(
        {"brand_id": brand_id},
        {"$set": {"logo_url": None, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Logo removido"}


# ==================== EXECUTIVE SUMMARY & BENCHMARK ====================

@router.get("/brands/{brand_id}/executive-summary")
async def get_executive_summary(brand_id: str, user: dict = Depends(get_current_user)):
    """Dashboard executivo com métricas simplificadas"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    valuation = await db.valuations.find_one({"brand_id": brand_id}, {"_id": 0})
    
    # Get pillars from the correct collection structure
    pillar_types = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillars_data = {}
    
    # Check pillars collection (multiple documents with pillar_type field)
    all_pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(20)
    for p in all_pillars:
        pt = p.get("pillar_type")
        if pt and p.get("answers"):
            pillars_data[pt] = p.get("answers")
    
    # Also check legacy pillar_* collections
    for pt in pillar_types:
        if pt not in pillars_data:
            legacy = await db[f"pillar_{pt}"].find_one({"brand_id": brand_id}, {"_id": 0})
            if legacy:
                pillars_data[pt] = {k: v for k, v in legacy.items() if k not in ["brand_id", "pillar_id"]}
    
    # Calculate brand strength based on filled pillars
    filled = sum(1 for pt in pillar_types if pt in pillars_data and pillars_data[pt])
    brand_strength = int((filled / len(pillar_types)) * 100)
    
    rbi = valuation.get("role_of_brand", 50) if valuation else 50
    brand_value = valuation.get("total_value", 0) if valuation else 0
    
    risks = []
    opportunities = []
    
    if "values" not in pillars_data or not pillars_data.get("values"):
        risks.append("Valores da marca não definidos - risco de inconsistência")
    else:
        opportunities.append("Valores bem definidos fortalecem cultura organizacional")
    
    if "positioning" not in pillars_data or not pillars_data.get("positioning"):
        risks.append("Posicionamento não estruturado - dificuldade de diferenciação")
    else:
        opportunities.append("Posicionamento claro permite comunicação mais efetiva")
    
    if "purpose" not in pillars_data or not pillars_data.get("purpose"):
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
        "opportunities": opportunities[:3],
        "pillars_filled": filled,
        "pillars_total": len(pillar_types)
    }


@router.get("/brands/{brand_id}/benchmark")
async def get_benchmark(brand_id: str, user: dict = Depends(get_current_user)):
    """Benchmark setorial da marca"""
    valuation = await db.valuations.find_one({"brand_id": brand_id}, {"_id": 0})
    
    # Get pillars from the correct collection structure
    pillar_types = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillars_data = {}
    
    # Check pillars collection
    all_pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(20)
    for p in all_pillars:
        pt = p.get("pillar_type")
        if pt and p.get("answers"):
            pillars_data[pt] = p.get("answers")
    
    # Also check legacy pillar_* collections
    for pt in pillar_types:
        if pt not in pillars_data:
            legacy = await db[f"pillar_{pt}"].find_one({"brand_id": brand_id}, {"_id": 0})
            if legacy:
                pillars_data[pt] = {k: v for k, v in legacy.items() if k not in ["brand_id", "pillar_id"]}
    
    sector = pillars_data.get("start", {}).get("industry", "default") if pillars_data.get("start") else "default"
    
    filled = sum(1 for pt in pillar_types if pt in pillars_data and pillars_data[pt])
    brand_strength = int((filled / len(pillar_types)) * 100)
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
    """Get brand metrics for dashboard with pillar progress"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    # Pillar types we track
    pillar_types = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    
    pillar_progress = {}
    pillars_completed = 0
    
    # FIRST: Check "pillars" collection (used by most pages like Propósito, Personalidade, etc.)
    brand_way_pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(20)
    for p in brand_way_pillars:
        pillar_type = p.get("pillar_type")
        if pillar_type and pillar_type in pillar_types:
            answers = p.get("answers", {})
            
            # Count non-empty fields (including arrays and nested objects)
            filled_fields = 0
            for k, v in answers.items():
                if v:
                    if isinstance(v, list) and len(v) > 0:
                        filled_fields += 1
                    elif isinstance(v, dict) and any(v.values()):
                        filled_fields += 1
                    elif isinstance(v, str) and len(v.strip()) > 0:
                        filled_fields += 1
                    elif v:  # Any other truthy value
                        filled_fields += 1
            
            # More generous thresholds
            if filled_fields >= 2:
                pillar_progress[pillar_type] = 100
                pillars_completed += 1
            elif filled_fields >= 1:
                pillar_progress[pillar_type] = 75
            else:
                pillar_progress[pillar_type] = 0
    
    # SECOND: Check legacy pillar_* collections for any not yet found
    for pillar_type in pillar_types:
        if pillar_type in pillar_progress:
            continue  # Already found in pillars collection
            
        legacy_collection = f"pillar_{pillar_type}"
        legacy_doc = await db[legacy_collection].find_one({"brand_id": brand_id}, {"_id": 0})
        
        if legacy_doc:
            filled = sum(1 for k, v in legacy_doc.items() 
                        if k not in ["brand_id", "pillar_id", "updated_at", "created_at", "_id"] and v)
            if filled >= 3:
                pillar_progress[pillar_type] = 100
                pillars_completed += 1
            elif filled >= 2:
                pillar_progress[pillar_type] = 75
            elif filled >= 1:
                pillar_progress[pillar_type] = 50
            else:
                pillar_progress[pillar_type] = 0
        else:
            pillar_progress[pillar_type] = 0
    
    # Get tasks count
    tasks_total = await db.tasks.count_documents({"brand_id": brand_id})
    tasks_done = await db.tasks.count_documents({"brand_id": brand_id, "status": "done"})
    tasks_in_progress = await db.tasks.count_documents({"brand_id": brand_id, "status": "in_progress"})
    
    # Get decisions count  
    decisions_total = await db.decisions.count_documents({"brand_id": brand_id})
    decisions_validated = await db.decisions.count_documents({"brand_id": brand_id, "status": "validated"})
    
    # Overall completion
    overall = sum(pillar_progress.values()) / len(pillar_types) if pillar_progress else 0
    
    return {
        "pillars_total": len(pillar_types),
        "pillars_completed": pillars_completed,
        "pillars": pillar_progress,
        "overall_completion": round(overall),
        "tasks": {
            "total": tasks_total,
            "completed": tasks_done,
            "in_progress": tasks_in_progress
        },
        "decisions": {
            "total": decisions_total,
            "validated": decisions_validated
        }
    }



@router.get("/brands/{brand_id}/pillars-summary")
async def get_pillars_summary(brand_id: str, user: dict = Depends(get_current_user)):
    """Get pillars summary for frontend components"""
    pillar_types = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillars_data = {}
    
    # Get all pillars
    all_pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(20)
    for p in all_pillars:
        pt = p.get("pillar_type")
        if pt:
            pillars_data[pt] = p.get("answers", {})
    
    # Check legacy collections
    for pt in pillar_types:
        if pt not in pillars_data:
            legacy = await db[f"pillar_{pt}"].find_one({"brand_id": brand_id}, {"_id": 0})
            if legacy:
                pillars_data[pt] = {k: v for k, v in legacy.items() if k not in ["brand_id", "pillar_id", "_id"]}
    
    filled = sum(1 for pt in pillar_types if pt in pillars_data and pillars_data[pt])
    
    return {
        **pillars_data,
        "completion": round((filled / len(pillar_types)) * 100)
    }
