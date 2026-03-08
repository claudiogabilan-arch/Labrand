"""Cultura & Pessoas - Culture mapping and team alignment"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Cultura & Pessoas"])


class CultureData(BaseModel):
    section: str
    data: Dict


CULTURE_SECTIONS = {
    "manifesto": {
        "title": "Manifesto Cultural",
        "description": "O que sua empresa acredita e como vive isso no dia a dia",
        "fields": [
            {"key": "statement", "label": "Manifesto", "type": "textarea", "placeholder": "Nós acreditamos que..."},
            {"key": "principles", "label": "Princípios (um por linha)", "type": "tags"},
        ]
    },
    "rituals": {
        "title": "Rituais & Práticas",
        "description": "Práticas recorrentes que reforçam a cultura",
        "fields": [
            {"key": "daily", "label": "Diários", "type": "tags", "placeholder": "Ex: Daily standup, check-in matinal"},
            {"key": "weekly", "label": "Semanais", "type": "tags", "placeholder": "Ex: All-hands, retrospectiva"},
            {"key": "monthly", "label": "Mensais/Trimestrais", "type": "tags", "placeholder": "Ex: Town hall, hackathon"},
        ]
    },
    "behaviors": {
        "title": "Comportamentos Esperados",
        "description": "Como as pessoas devem agir para viver a cultura",
        "fields": [
            {"key": "do_list", "label": "O que fazemos (DO)", "type": "tags", "placeholder": "Ex: Colaboramos antes de decidir"},
            {"key": "dont_list", "label": "O que não fazemos (DON'T)", "type": "tags", "placeholder": "Ex: Não culpamos, buscamos soluções"},
        ]
    },
    "employee_experience": {
        "title": "Experiência do Colaborador",
        "description": "Jornada do colaborador dentro da organização",
        "fields": [
            {"key": "onboarding", "label": "Onboarding", "type": "textarea", "placeholder": "Como recebemos novos membros"},
            {"key": "growth", "label": "Crescimento", "type": "textarea", "placeholder": "Como desenvolvemos as pessoas"},
            {"key": "recognition", "label": "Reconhecimento", "type": "textarea", "placeholder": "Como celebramos conquistas"},
        ]
    },
    "alignment": {
        "title": "Alinhamento Marca x Cultura",
        "description": "Conexão entre os valores da marca e a cultura interna",
        "fields": [
            {"key": "brand_values_reflection", "label": "Como os valores da marca se refletem internamente?", "type": "textarea"},
            {"key": "gaps", "label": "Gaps identificados", "type": "tags", "placeholder": "Ex: Prometemos agilidade mas processos são lentos"},
            {"key": "actions", "label": "Ações para alinhar", "type": "tags", "placeholder": "Ex: Simplificar aprovações internas"},
        ]
    }
}


@router.get("/brands/{brand_id}/culture")
async def get_culture(brand_id: str, user: dict = Depends(get_current_user)):
    """Get all culture data for a brand"""
    docs = await db.brand_culture.find({"brand_id": brand_id}, {"_id": 0}).to_list(20)
    data_map = {d["section"]: d.get("data", {}) for d in docs}

    sections = []
    filled = 0
    for sec_id, sec_info in CULTURE_SECTIONS.items():
        sec_data = data_map.get(sec_id, {})
        has_data = any(bool(v) for v in sec_data.values()) if sec_data else False
        if has_data:
            filled += 1
        sections.append({
            "id": sec_id,
            "title": sec_info["title"],
            "description": sec_info["description"],
            "fields": sec_info["fields"],
            "data": sec_data,
            "completed": has_data
        })

    total = len(CULTURE_SECTIONS)
    return {
        "sections": sections,
        "progress": round((filled / total) * 100) if total > 0 else 0,
        "filled": filled,
        "total": total
    }


@router.post("/brands/{brand_id}/culture")
async def save_culture_section(brand_id: str, payload: CultureData, user: dict = Depends(get_current_user)):
    """Save a culture section"""
    if payload.section not in CULTURE_SECTIONS:
        raise HTTPException(status_code=400, detail="Seção inválida")

    await db.brand_culture.update_one(
        {"brand_id": brand_id, "section": payload.section},
        {"$set": {
            "brand_id": brand_id,
            "section": payload.section,
            "data": payload.data,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user["user_id"]
        }},
        upsert=True
    )
    return {"success": True, "message": f"Seção '{CULTURE_SECTIONS[payload.section]['title']}' salva!"}


@router.get("/brands/{brand_id}/culture/score")
async def get_culture_score(brand_id: str, user: dict = Depends(get_current_user)):
    """Calculate culture health score"""
    docs = await db.brand_culture.find({"brand_id": brand_id}, {"_id": 0}).to_list(20)
    data_map = {d["section"]: d.get("data", {}) for d in docs}

    scores = {}
    for sec_id, sec_info in CULTURE_SECTIONS.items():
        sec_data = data_map.get(sec_id, {})
        field_count = len(sec_info["fields"])
        filled_count = sum(1 for f in sec_info["fields"] if sec_data.get(f["key"]))
        scores[sec_id] = {
            "title": sec_info["title"],
            "score": round((filled_count / field_count) * 100) if field_count > 0 else 0,
            "filled": filled_count,
            "total": field_count
        }

    overall = round(sum(s["score"] for s in scores.values()) / len(scores)) if scores else 0

    # Check alignment with brand pillars
    pillars = await db.pillars.find({"brand_id": brand_id, "pillar_type": "values"}, {"_id": 0}).to_list(1)
    brand_values = []
    if pillars and pillars[0].get("answers", {}).get("valores"):
        brand_values = pillars[0]["answers"]["valores"]

    return {
        "overall_score": overall,
        "sections": scores,
        "brand_values": brand_values,
        "has_alignment_data": bool(data_map.get("alignment")),
        "recommendations": [
            "Complete o Manifesto Cultural para alinhar a equipe" if not data_map.get("manifesto") else None,
            "Defina rituais recorrentes para fortalecer a cultura" if not data_map.get("rituals") else None,
            "Mapeie os comportamentos esperados (DO/DON'T)" if not data_map.get("behaviors") else None,
            "Documente a jornada do colaborador" if not data_map.get("employee_experience") else None,
            "Identifique gaps entre marca e cultura interna" if not data_map.get("alignment") else None,
        ]
    }
