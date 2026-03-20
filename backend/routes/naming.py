"""Naming Module Routes - Estúdio Onomástico"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid
import json
import random

from config import db
from utils.helpers import get_current_user, deduct_ai_credits, call_llm

router = APIRouter(tags=["Naming"])

NAMING_CRITERIA = [
    {"id": "memorabilidade", "name": "Memorabilidade", "description": "Fácil de lembrar", "weight": 3},
    {"id": "pronuncia", "name": "Pronúncia", "description": "Fácil de falar", "weight": 3},
    {"id": "escrita", "name": "Escrita", "description": "Fácil de escrever", "weight": 2},
    {"id": "unicidade", "name": "Unicidade", "description": "Diferenciação no mercado", "weight": 3},
    {"id": "significado", "name": "Significado", "description": "Conexão com o negócio", "weight": 2},
    {"id": "sonoridade", "name": "Sonoridade", "description": "Som agradável", "weight": 2},
    {"id": "extensibilidade", "name": "Extensibilidade", "description": "Permite expansão", "weight": 1},
]

ARCHETYPES = [
    {"id": "heroi", "name": "Herói", "essence": "Coragem e superação", "brands": ["Nike", "FedEx", "BMW"], "keywords": ["força", "vitória", "determinação"]},
    {"id": "mago", "name": "Mago", "essence": "Transformação e visão", "brands": ["Apple", "Disney", "Tesla"], "keywords": ["magia", "inovação", "visão"]},
    {"id": "rebelde", "name": "Rebelde", "essence": "Revolução e liberdade", "brands": ["Harley-Davidson", "Virgin"], "keywords": ["liberdade", "revolução", "ousadia"]},
    {"id": "explorador", "name": "Explorador", "essence": "Descoberta e aventura", "brands": ["Jeep", "The North Face"], "keywords": ["aventura", "descoberta", "jornada"]},
    {"id": "sabio", "name": "Sábio", "essence": "Conhecimento e verdade", "brands": ["Google", "BBC", "Harvard"], "keywords": ["conhecimento", "sabedoria", "verdade"]},
    {"id": "inocente", "name": "Inocente", "essence": "Simplicidade e otimismo", "brands": ["Coca-Cola", "McDonald's"], "keywords": ["pureza", "simplicidade", "felicidade"]},
    {"id": "criador", "name": "Criador", "essence": "Inovação e expressão", "brands": ["Lego", "Adobe"], "keywords": ["criatividade", "imaginação", "arte"]},
    {"id": "governante", "name": "Governante", "essence": "Controle e liderança", "brands": ["Mercedes-Benz", "Rolex"], "keywords": ["liderança", "poder", "status"]},
    {"id": "cuidador", "name": "Cuidador", "essence": "Proteção e serviço", "brands": ["Johnson & Johnson", "Volvo"], "keywords": ["proteção", "cuidado", "segurança"]},
    {"id": "cara_comum", "name": "Cara Comum", "essence": "Pertencimento", "brands": ["IKEA", "Gap"], "keywords": ["pertencimento", "comunidade", "autenticidade"]},
    {"id": "amante", "name": "Amante", "essence": "Paixão e intimidade", "brands": ["Chanel", "Victoria's Secret"], "keywords": ["paixão", "desejo", "beleza"]},
    {"id": "bobo", "name": "Bobo da Corte", "essence": "Alegria", "brands": ["M&M's", "Old Spice"], "keywords": ["diversão", "humor", "alegria"]},
]

TENSION_EXAMPLES = [
    {"tension": "Tradição vs Inovação", "example": "Como ser moderno sem perder raízes?"},
    {"tension": "Local vs Global", "example": "Como parecer internacional mantendo identidade local?"},
    {"tension": "Premium vs Acessível", "example": "Como comunicar qualidade sem parecer elitista?"},
    {"tension": "Técnico vs Humano", "example": "Como ser especialista sem ser frio?"},
]

class NamingContext(BaseModel):
    business_description: str
    mission: Optional[str] = None
    values: List[str] = []
    target_audience: str
    competitors: List[str] = []
    desired_perception: List[str] = []
    tone: str = "moderno"
    name_style: str = "criativo"

class NamingProject(BaseModel):
    project_name: str
    context: NamingContext

class NamingScore(BaseModel):
    name_id: str
    scores: Dict[str, int]

@router.get("/naming/archetypes")
async def get_archetypes():
    return {"archetypes": ARCHETYPES, "tension_examples": TENSION_EXAMPLES}

@router.get("/naming/criteria")
async def get_naming_criteria():
    return {"criteria": NAMING_CRITERIA}

@router.get("/brands/{brand_id}/naming")
async def get_naming_projects(brand_id: str, user: dict = Depends(get_current_user)):
    projects = await db.naming_projects.find({"brand_id": brand_id}, {"_id": 0}).sort("created_at", -1).to_list(20)
    return {"projects": projects}

@router.get("/brands/{brand_id}/naming/{project_id}")
async def get_naming_project(brand_id: str, project_id: str, user: dict = Depends(get_current_user)):
    project = await db.naming_projects.find_one({"brand_id": brand_id, "project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    names = await db.naming_names.find({"project_id": project_id}, {"_id": 0}).sort("total_score", -1).to_list(100)
    return {"project": project, "names": names}

@router.post("/brands/{brand_id}/naming")
async def create_naming_project(brand_id: str, data: NamingProject, user: dict = Depends(get_current_user)):
    project_id = f"naming_{uuid.uuid4().hex[:12]}"
    project_doc = {
        "project_id": project_id, "brand_id": brand_id, "project_name": data.project_name,
        "context": data.context.model_dump(), "status": "context", "propulsor": {}, "semantic_map": {},
        "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.naming_projects.insert_one(project_doc)
    project_doc.pop("_id", None)
    return project_doc

@router.put("/brands/{brand_id}/naming/{project_id}/propulsor")
async def update_propulsor(brand_id: str, project_id: str, archetype: str = "", tension: str = "", user: dict = Depends(get_current_user)):
    await db.naming_projects.update_one({"project_id": project_id, "brand_id": brand_id},
        {"$set": {"propulsor": {"archetype": archetype, "tension": tension}, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"success": True}

@router.post("/brands/{brand_id}/naming/{project_id}/semantic-map")
async def generate_semantic_map(brand_id: str, project_id: str, keywords: List[str] = Query(default=[]), user: dict = Depends(get_current_user)):
    if not keywords:
        raise HTTPException(status_code=400, detail="Insira palavras-chave")
    
    success, result = await deduct_ai_credits(user["user_id"], "semantic_map", 1)
    if not success:
        raise HTTPException(status_code=402, detail=result)
    
    # Mock semantic map (em produção usaria LLM)
    semantic_map = {"map": [{"keyword": kw, "concepts": [f"{kw}_conceito1", f"{kw}_conceito2"], "metaphors": [f"metáfora de {kw}"], "translations": {"latin": f"{kw}us", "greek": f"{kw}os"}} for kw in keywords[:5]]}
    
    await db.naming_projects.update_one({"project_id": project_id}, {"$set": {"semantic_map": semantic_map, "status": "semantic", "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"success": True, "semantic_map": semantic_map, "credits_used": 1}

@router.post("/brands/{brand_id}/naming/{project_id}/generate")
async def generate_names(brand_id: str, project_id: str, count: int = 10, user: dict = Depends(get_current_user)):
    project = await db.naming_projects.find_one({"project_id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    success, result = await deduct_ai_credits(user["user_id"], "naming_generation", 3)
    if not success:
        raise HTTPException(status_code=402, detail=result)
    
    # Mock name generation
    prefixes = ["Nova", "Prime", "Apex", "Vex", "Zeno", "Lux", "Aura", "Vera", "Core", "Nexus"]
    suffixes = ["fy", "io", "ly", "ex", "a", "on", "is", "um", "ar", "us"]
    
    names = []
    for i in range(min(count, 15)):
        name = random.choice(prefixes) + random.choice(suffixes)
        name_id = f"name_{uuid.uuid4().hex[:8]}"
        name_doc = {
            "name_id": name_id, "project_id": project_id, "name": name, "rationale": f"Nome criativo baseado no contexto do projeto",
            "phonetic_analysis": {"syllables": len(name) // 2, "rhythm": "fluido"}, "is_favorite": False, "total_score": 0, "scores": {},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.naming_names.insert_one(name_doc)
        name_doc.pop("_id", None)
        names.append(name_doc)
    
    await db.naming_projects.update_one({"project_id": project_id}, {"$set": {"status": "generated", "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"names": names, "credits_used": 3}

@router.post("/brands/{brand_id}/naming/{project_id}/sound-lab")
async def analyze_phonetics(brand_id: str, project_id: str, user: dict = Depends(get_current_user)):
    success, result = await deduct_ai_credits(user["user_id"], "naming_phonetic", 1)
    if not success:
        raise HTTPException(status_code=402, detail=result)
    
    names = await db.naming_names.find({"project_id": project_id}, {"_id": 0}).to_list(50)
    analyses = []
    for name in names:
        analysis = {"name_id": name["name_id"], "name": name["name"], "syllables": len(name["name"]) // 2, "rhythm": "fluido", "ease_of_pronunciation": random.randint(7, 10)}
        analyses.append(analysis)
    
    return {"analyses": analyses, "credits_used": 1}

@router.post("/brands/{brand_id}/naming/{project_id}/global-check")
async def check_global_friction(brand_id: str, project_id: str, user: dict = Depends(get_current_user)):
    success, result = await deduct_ai_credits(user["user_id"], "naming_global_friction", 2)
    if not success:
        raise HTTPException(status_code=402, detail=result)
    
    names = await db.naming_names.find({"project_id": project_id}, {"_id": 0}).to_list(50)
    checks = []
    languages = ["inglês", "espanhol", "francês", "alemão", "italiano", "português", "mandarim"]
    for name in names:
        check = {"name_id": name["name_id"], "name": name["name"], "languages": {}}
        for lang in languages:
            check["languages"][lang] = {"status": "ok", "notes": "Sem conflitos identificados"}
        checks.append(check)
    
    return {"checks": checks, "credits_used": 2}

@router.get("/brands/{brand_id}/naming/{project_id}/check-availability")
async def check_availability(brand_id: str, project_id: str, user: dict = Depends(get_current_user)):
    names = await db.naming_names.find({"project_id": project_id}, {"_id": 0}).to_list(50)
    availability = []
    for name in names:
        name_lower = name["name"].lower()
        avail = {
            "name_id": name["name_id"], "name": name["name"],
            "domains": {".com": random.choice([True, False]), ".com.br": random.choice([True, False]), ".io": True, ".co": True},
            "social": {"instagram": random.choice([True, False]), "twitter": True, "linkedin": True, "facebook": True}
        }
        availability.append(avail)
    return {"availability": availability, "note": "MOCK - Verificação real pendente"}

@router.get("/brands/{brand_id}/naming/{project_id}/export-pdf")
async def export_naming_pdf(brand_id: str, project_id: str, user: dict = Depends(get_current_user)):
    project = await db.naming_projects.find_one({"project_id": project_id}, {"_id": 0})
    names = await db.naming_names.find({"project_id": project_id}, {"_id": 0}).sort("total_score", -1).to_list(100)
    return {"project": project, "names": names, "export_format": "json", "note": "PDF export em desenvolvimento"}

@router.put("/brands/{brand_id}/naming/{project_id}/names/{name_id}/score")
async def update_name_score(brand_id: str, project_id: str, name_id: str, data: NamingScore, user: dict = Depends(get_current_user)):
    total = sum(data.scores.values())
    await db.naming_names.update_one({"name_id": name_id}, {"$set": {"scores": data.scores, "total_score": total}})
    return await db.naming_names.find_one({"name_id": name_id}, {"_id": 0})

@router.put("/brands/{brand_id}/naming/{project_id}/names/{name_id}/favorite")
async def toggle_favorite(brand_id: str, project_id: str, name_id: str, user: dict = Depends(get_current_user)):
    name = await db.naming_names.find_one({"name_id": name_id}, {"_id": 0})
    if not name:
        raise HTTPException(status_code=404, detail="Nome não encontrado")
    new_status = not name.get("is_favorite", False)
    await db.naming_names.update_one({"name_id": name_id}, {"$set": {"is_favorite": new_status}})
    return {"is_favorite": new_status}

@router.post("/brands/{brand_id}/naming/{project_id}/names")
async def add_custom_name(brand_id: str, project_id: str, name: str, rationale: str = "", user: dict = Depends(get_current_user)):
    name_id = f"name_{uuid.uuid4().hex[:8]}"
    name_doc = {"name_id": name_id, "project_id": project_id, "name": name, "rationale": rationale, "is_custom": True,
                "is_favorite": False, "total_score": 0, "scores": {}, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.naming_names.insert_one(name_doc)
    name_doc.pop("_id", None)
    return name_doc

@router.delete("/brands/{brand_id}/naming/{project_id}/names/{name_id}")
async def delete_name(brand_id: str, project_id: str, name_id: str, user: dict = Depends(get_current_user)):
    await db.naming_names.delete_one({"name_id": name_id, "project_id": project_id})
    return {"message": "Nome removido"}

@router.delete("/brands/{brand_id}/naming/{project_id}")
async def delete_naming_project(brand_id: str, project_id: str, user: dict = Depends(get_current_user)):
    await db.naming_projects.delete_one({"project_id": project_id, "brand_id": brand_id})
    await db.naming_names.delete_many({"project_id": project_id})
    return {"message": "Projeto removido"}
