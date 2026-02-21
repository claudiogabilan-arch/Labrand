"""Extras: Competitor Groups, Narratives, Templates, etc."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Extras"])

# Templates por setor
SECTOR_TEMPLATES = {
    "tecnologia": {"purpose": "Transformar a maneira como as pessoas...", "values": ["Inovação", "Agilidade", "Transparência"], "promise": "Entregar soluções que...", "positioning": "Somos a escolha de quem busca..."},
    "saude": {"purpose": "Promover qualidade de vida...", "values": ["Cuidado", "Excelência", "Humanização"], "promise": "Cuidar com dedicação...", "positioning": "Referência em atendimento..."},
    "educacao": {"purpose": "Desenvolver o potencial humano...", "values": ["Conhecimento", "Inclusão", "Transformação"], "promise": "Formar cidadãos preparados...", "positioning": "Educação que transforma..."},
    "varejo": {"purpose": "Conectar pessoas aos produtos...", "values": ["Acessibilidade", "Variedade", "Conveniência"], "promise": "Oferecer a melhor experiência...", "positioning": "Onde você encontra tudo..."},
    "financeiro": {"purpose": "Democratizar o acesso a serviços...", "values": ["Segurança", "Transparência", "Inovação"], "promise": "Simplificar sua vida financeira...", "positioning": "Parceiro da sua jornada..."},
}

SECTORS = ["Tecnologia", "Saúde", "Educação", "Varejo", "Financeiro", "Indústria", "Serviços", "Agronegócio", "Construção", "Logística", "Alimentação", "Moda"]

@router.get("/templates/pillars")
async def get_pillar_templates(sector: str = "tecnologia", pillar: str = "purpose"):
    templates = SECTOR_TEMPLATES.get(sector.lower(), SECTOR_TEMPLATES["tecnologia"])
    return {"sector": sector, "pillar": pillar, "template": templates.get(pillar, ""), "all_templates": templates}

@router.get("/templates/sectors")
async def get_sectors():
    return {"sectors": SECTORS}

# Competitor Groups
@router.get("/brands/{brand_id}/competitor-groups")
async def get_competitor_groups(brand_id: str, user: dict = Depends(get_current_user)):
    groups = await db.competitor_groups.find({"brand_id": brand_id}, {"_id": 0}).to_list(20)
    return {"groups": groups}

@router.post("/brands/{brand_id}/competitor-groups")
async def create_competitor_group(brand_id: str, name: str, competitors: list = [], user: dict = Depends(get_current_user)):
    group_id = f"cg_{uuid.uuid4().hex[:12]}"
    group_doc = {"group_id": group_id, "brand_id": brand_id, "name": name, "competitors": competitors, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.competitor_groups.insert_one(group_doc)
    group_doc.pop("_id", None)
    return group_doc

@router.put("/brands/{brand_id}/competitor-groups/{group_id}")
async def update_competitor_group(brand_id: str, group_id: str, name: str = None, competitors: list = None, user: dict = Depends(get_current_user)):
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if name:
        update["name"] = name
    if competitors is not None:
        update["competitors"] = competitors
    await db.competitor_groups.update_one({"group_id": group_id, "brand_id": brand_id}, {"$set": update})
    return await db.competitor_groups.find_one({"group_id": group_id}, {"_id": 0})

@router.delete("/brands/{brand_id}/competitor-groups/{group_id}")
async def delete_competitor_group(brand_id: str, group_id: str, user: dict = Depends(get_current_user)):
    await db.competitor_groups.delete_one({"group_id": group_id, "brand_id": brand_id})
    return {"message": "Grupo removido"}

# Narratives
@router.get("/brands/{brand_id}/narratives")
async def get_narratives(brand_id: str, user: dict = Depends(get_current_user)):
    narratives = await db.narratives.find({"brand_id": brand_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"narratives": narratives}

@router.post("/brands/{brand_id}/narratives")
async def create_narrative(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    narrative_id = f"narr_{uuid.uuid4().hex[:12]}"
    doc = {"narrative_id": narrative_id, "brand_id": brand_id, "title": data.get("title", ""),
           "content": data.get("content", ""), "type": data.get("type", "general"),
           "created_at": datetime.now(timezone.utc).isoformat(), "created_by": user["user_id"]}
    await db.narratives.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/brands/{brand_id}/narratives/{narrative_id}")
async def update_narrative(brand_id: str, narrative_id: str, data: dict, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.items() if k in ["title", "content", "type"]}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.narratives.update_one({"narrative_id": narrative_id, "brand_id": brand_id}, {"$set": update})
    return await db.narratives.find_one({"narrative_id": narrative_id}, {"_id": 0})

# Executive Summary & Benchmark
@router.get("/brands/{brand_id}/executive-summary")
async def get_executive_summary(brand_id: str, user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    tasks = await db.tasks.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
    decisions = await db.decisions.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
    
    pillar_keys = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillars_filled = sum(1 for k in pillar_keys if any(p.get("pillar_type") == k and p.get("answers") for p in pillars))
    
    return {
        "brand": brand,
        "completion": {"pillars_filled": pillars_filled, "total_pillars": len(pillar_keys), "percentage": int((pillars_filled / len(pillar_keys)) * 100)},
        "tasks": {"total": len(tasks), "completed": len([t for t in tasks if t.get("status") == "completed"]), "pending": len([t for t in tasks if t.get("status") != "completed"])},
        "decisions": {"total": len(decisions), "pending": len([d for d in decisions if d.get("status") == "pending"])}
    }

@router.get("/brands/{brand_id}/benchmark")
async def get_benchmark(brand_id: str, user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    industry = brand.get("industry", "geral") if brand else "geral"
    
    industry_averages = {"pillar_completion": 65, "task_completion": 55, "decision_rate": 70, "brand_score": 58}
    
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    pillar_keys = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillars_filled = sum(1 for k in pillar_keys if any(p.get("pillar_type") == k and p.get("answers") for p in pillars))
    pillar_completion = int((pillars_filled / len(pillar_keys)) * 100)
    
    return {
        "brand_metrics": {"pillar_completion": pillar_completion, "industry": industry},
        "industry_averages": industry_averages,
        "comparison": {
            "pillar_completion": {"brand": pillar_completion, "industry": industry_averages["pillar_completion"],
                                   "diff": pillar_completion - industry_averages["pillar_completion"]}
        }
    }

# Dashboard Metrics
@router.get("/brands/{brand_id}/dashboard-metrics")
async def get_dashboard_metrics(brand_id: str, user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    tasks = await db.tasks.find({"brand_id": brand_id}, {"_id": 0}).to_list(100)
    
    pillar_keys = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillar_status = {}
    for key in pillar_keys:
        has_data = any(p.get("pillar_type") == key and p.get("answers") for p in pillars)
        pillar_status[key] = "complete" if has_data else "pending"
    
    return {
        "brand": {"name": brand.get("name") if brand else "N/A", "industry": brand.get("industry") if brand else "N/A"},
        "pillars": pillar_status,
        "completion_rate": int((sum(1 for s in pillar_status.values() if s == "complete") / len(pillar_keys)) * 100),
        "tasks": {"total": len(tasks), "completed": len([t for t in tasks if t.get("status") == "completed"])}
    }
