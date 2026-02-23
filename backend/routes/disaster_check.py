"""Disaster Check Routes - Pre-launch risk verification checklist"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Disaster Check"])


# Checklist categories and items
DISASTER_CHECKLIST = {
    "brand_identity": {
        "name": "Identidade de Marca",
        "icon": "palette",
        "items": [
            {"id": "logo_variations", "text": "Logo tem variações para diferentes fundos e tamanhos", "weight": 2},
            {"id": "color_palette", "text": "Paleta de cores definida com códigos exatos (HEX, RGB, CMYK)", "weight": 2},
            {"id": "typography", "text": "Tipografia primária e secundária especificadas", "weight": 1},
            {"id": "brand_manual", "text": "Manual de marca ou brandbook disponível", "weight": 2},
            {"id": "visual_consistency", "text": "Elementos visuais consistentes em todos os materiais", "weight": 2},
        ]
    },
    "naming_legal": {
        "name": "Naming & Aspectos Legais",
        "icon": "shield",
        "items": [
            {"id": "trademark_search", "text": "Pesquisa de marca registrada realizada (INPI)", "weight": 3},
            {"id": "domain_secured", "text": "Domínio principal (.com.br, .com) garantido", "weight": 3},
            {"id": "social_handles", "text": "Handles de redes sociais reservados", "weight": 2},
            {"id": "phonetic_check", "text": "Nome verificado foneticamente em outros idiomas", "weight": 2},
            {"id": "legal_review", "text": "Revisão legal do nome e slogan", "weight": 2},
        ]
    },
    "market_validation": {
        "name": "Validação de Mercado",
        "icon": "users",
        "items": [
            {"id": "target_defined", "text": "Público-alvo claramente definido", "weight": 2},
            {"id": "competitor_analysis", "text": "Análise de concorrentes realizada", "weight": 2},
            {"id": "positioning_unique", "text": "Posicionamento diferenciado da concorrência", "weight": 3},
            {"id": "value_prop", "text": "Proposta de valor clara e comunicável", "weight": 3},
            {"id": "pricing_strategy", "text": "Estratégia de preços validada", "weight": 2},
        ]
    },
    "communication": {
        "name": "Comunicação",
        "icon": "message-circle",
        "items": [
            {"id": "key_messages", "text": "Mensagens-chave definidas", "weight": 2},
            {"id": "tone_voice", "text": "Tom de voz da marca documentado", "weight": 2},
            {"id": "elevator_pitch", "text": "Elevator pitch preparado (30 segundos)", "weight": 1},
            {"id": "press_kit", "text": "Press kit ou material de imprensa pronto", "weight": 1},
            {"id": "faq_ready", "text": "FAQ preparado para questões comuns", "weight": 1},
        ]
    },
    "digital_presence": {
        "name": "Presença Digital",
        "icon": "globe",
        "items": [
            {"id": "website_ready", "text": "Website funcional e otimizado", "weight": 3},
            {"id": "seo_basics", "text": "SEO básico implementado (meta tags, títulos)", "weight": 2},
            {"id": "social_profiles", "text": "Perfis de redes sociais configurados", "weight": 2},
            {"id": "analytics_setup", "text": "Google Analytics/Tag Manager configurado", "weight": 2},
            {"id": "mobile_optimized", "text": "Experiência mobile otimizada", "weight": 2},
        ]
    },
    "crisis_preparation": {
        "name": "Preparação para Crises",
        "icon": "alert-triangle",
        "items": [
            {"id": "crisis_plan", "text": "Plano de gestão de crise documentado", "weight": 2},
            {"id": "response_templates", "text": "Templates de resposta para situações críticas", "weight": 1},
            {"id": "spokesperson", "text": "Porta-voz definido e preparado", "weight": 2},
            {"id": "monitoring_setup", "text": "Monitoramento de menções configurado", "weight": 1},
            {"id": "escalation_process", "text": "Processo de escalonamento definido", "weight": 1},
        ]
    },
    "launch_operations": {
        "name": "Operações de Lançamento",
        "icon": "rocket",
        "items": [
            {"id": "launch_date", "text": "Data de lançamento definida e comunicada", "weight": 2},
            {"id": "team_aligned", "text": "Equipe alinhada sobre o lançamento", "weight": 2},
            {"id": "partners_notified", "text": "Parceiros e stakeholders notificados", "weight": 1},
            {"id": "support_ready", "text": "Equipe de suporte preparada", "weight": 2},
            {"id": "rollback_plan", "text": "Plano de contingência/rollback", "weight": 2},
        ]
    }
}


class DisasterCheckCreate(BaseModel):
    name: str
    launch_type: str  # "brand", "product", "campaign", "rebrand"
    launch_date: Optional[str] = None
    notes: Optional[str] = None


class DisasterCheckItem(BaseModel):
    item_id: str
    completed: bool
    notes: Optional[str] = None


@router.get("/disaster-check/template")
async def get_disaster_check_template():
    """Get the disaster check template with all categories and items"""
    return {
        "categories": DISASTER_CHECKLIST,
        "total_items": sum(len(cat["items"]) for cat in DISASTER_CHECKLIST.values()),
        "launch_types": [
            {"id": "brand", "name": "Lançamento de Marca"},
            {"id": "product", "name": "Lançamento de Produto"},
            {"id": "campaign", "name": "Campanha de Marketing"},
            {"id": "rebrand", "name": "Rebranding"}
        ]
    }


@router.get("/brands/{brand_id}/disaster-checks")
async def get_disaster_checks(brand_id: str, user: dict = Depends(get_current_user)):
    """Get all disaster checks for a brand"""
    checks = await db.disaster_checks.find(
        {"brand_id": brand_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"checks": checks, "total": len(checks)}


@router.post("/brands/{brand_id}/disaster-checks")
async def create_disaster_check(brand_id: str, data: DisasterCheckCreate, user: dict = Depends(get_current_user)):
    """Create a new disaster check"""
    # Initialize all items as not completed
    checklist = {}
    for cat_id, category in DISASTER_CHECKLIST.items():
        checklist[cat_id] = {
            "name": category["name"],
            "items": {item["id"]: {"completed": False, "notes": ""} for item in category["items"]}
        }
    
    check_doc = {
        "check_id": f"dc_{uuid.uuid4().hex[:12]}",
        "brand_id": brand_id,
        "name": data.name,
        "launch_type": data.launch_type,
        "launch_date": data.launch_date,
        "notes": data.notes,
        "checklist": checklist,
        "status": "in_progress",
        "completion_percentage": 0,
        "risk_score": 100,  # Starts at maximum risk
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.disaster_checks.insert_one(check_doc)
    
    return {"success": True, "check": {k: v for k, v in check_doc.items() if k != "_id"}}


@router.get("/brands/{brand_id}/disaster-checks/{check_id}")
async def get_disaster_check(brand_id: str, check_id: str, user: dict = Depends(get_current_user)):
    """Get a specific disaster check"""
    check = await db.disaster_checks.find_one(
        {"brand_id": brand_id, "check_id": check_id},
        {"_id": 0}
    )
    
    if not check:
        raise HTTPException(status_code=404, detail="Check não encontrado")
    
    return {"check": check}


@router.put("/brands/{brand_id}/disaster-checks/{check_id}/item")
async def update_disaster_check_item(
    brand_id: str, 
    check_id: str, 
    category_id: str,
    data: DisasterCheckItem, 
    user: dict = Depends(get_current_user)
):
    """Update a single checklist item"""
    check = await db.disaster_checks.find_one({"brand_id": brand_id, "check_id": check_id})
    if not check:
        raise HTTPException(status_code=404, detail="Check não encontrado")
    
    # Update the specific item
    update_path = f"checklist.{category_id}.items.{data.item_id}"
    
    await db.disaster_checks.update_one(
        {"check_id": check_id},
        {"$set": {
            f"{update_path}.completed": data.completed,
            f"{update_path}.notes": data.notes or "",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Recalculate completion and risk
    check = await db.disaster_checks.find_one({"check_id": check_id})
    checklist = check.get("checklist", {})
    
    total_weight = 0
    completed_weight = 0
    
    for cat_id, category in DISASTER_CHECKLIST.items():
        cat_data = checklist.get(cat_id, {}).get("items", {})
        for item in category["items"]:
            total_weight += item["weight"]
            if cat_data.get(item["id"], {}).get("completed", False):
                completed_weight += item["weight"]
    
    completion_pct = int((completed_weight / total_weight) * 100) if total_weight > 0 else 0
    risk_score = 100 - completion_pct  # Risk decreases as completion increases
    
    # Determine status
    status = "in_progress"
    if completion_pct == 100:
        status = "completed"
    elif completion_pct >= 80:
        status = "almost_ready"
    
    await db.disaster_checks.update_one(
        {"check_id": check_id},
        {"$set": {
            "completion_percentage": completion_pct,
            "risk_score": risk_score,
            "status": status
        }}
    )
    
    return {
        "success": True,
        "completion_percentage": completion_pct,
        "risk_score": risk_score,
        "status": status
    }


@router.delete("/brands/{brand_id}/disaster-checks/{check_id}")
async def delete_disaster_check(brand_id: str, check_id: str, user: dict = Depends(get_current_user)):
    """Delete a disaster check"""
    result = await db.disaster_checks.delete_one({"brand_id": brand_id, "check_id": check_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Check não encontrado")
    
    return {"success": True, "message": "Check removido"}


@router.get("/brands/{brand_id}/disaster-checks/{check_id}/report")
async def get_disaster_check_report(brand_id: str, check_id: str, user: dict = Depends(get_current_user)):
    """Generate a summary report for the disaster check"""
    check = await db.disaster_checks.find_one(
        {"brand_id": brand_id, "check_id": check_id},
        {"_id": 0}
    )
    
    if not check:
        raise HTTPException(status_code=404, detail="Check não encontrado")
    
    checklist = check.get("checklist", {})
    
    # Analyze by category
    categories_summary = []
    critical_items = []
    
    for cat_id, category in DISASTER_CHECKLIST.items():
        cat_data = checklist.get(cat_id, {}).get("items", {})
        total = len(category["items"])
        completed = sum(1 for item in category["items"] if cat_data.get(item["id"], {}).get("completed", False))
        
        categories_summary.append({
            "id": cat_id,
            "name": category["name"],
            "icon": category["icon"],
            "completed": completed,
            "total": total,
            "percentage": int((completed / total) * 100) if total > 0 else 0
        })
        
        # Find critical incomplete items (weight >= 3)
        for item in category["items"]:
            if item["weight"] >= 3 and not cat_data.get(item["id"], {}).get("completed", False):
                critical_items.append({
                    "category": category["name"],
                    "item": item["text"],
                    "weight": item["weight"]
                })
    
    return {
        "check": check,
        "categories_summary": categories_summary,
        "critical_items": critical_items,
        "recommendation": get_launch_recommendation(check["completion_percentage"], len(critical_items))
    }


def get_launch_recommendation(completion_pct: int, critical_count: int) -> dict:
    """Generate launch recommendation based on completion and critical items"""
    if completion_pct >= 95 and critical_count == 0:
        return {
            "status": "green",
            "title": "Pronto para Lançamento",
            "message": "Todos os itens críticos foram verificados. O lançamento pode prosseguir com segurança.",
            "action": "Prosseguir com o lançamento"
        }
    elif completion_pct >= 80 and critical_count <= 2:
        return {
            "status": "yellow",
            "title": "Quase Pronto",
            "message": f"Faltam {100 - completion_pct}% dos itens e {critical_count} itens críticos. Considere resolver antes do lançamento.",
            "action": "Resolver itens críticos pendentes"
        }
    elif completion_pct >= 60:
        return {
            "status": "orange",
            "title": "Precisa de Atenção",
            "message": f"Apenas {completion_pct}% concluído com {critical_count} itens críticos pendentes. Alto risco de problemas.",
            "action": "Adiar lançamento e completar checklist"
        }
    else:
        return {
            "status": "red",
            "title": "Não Recomendado",
            "message": f"Apenas {completion_pct}% concluído. O lançamento apresenta riscos significativos.",
            "action": "Não lançar - completar itens essenciais primeiro"
        }
