"""Touchpoints Module Routes"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Touchpoints"])

FUNNEL_PHASES = ["Topo de Funil", "Meio de Funil", "Fundo de Funil"]
ENVIRONMENTS = ["Online", "Offline"]
SENTIMENTS = ["Feliz", "Triste", "Frustrado", "Neutro"]

@router.get("/brands/{brand_id}/touchpoints")
async def get_touchpoints(brand_id: str, persona: str = None, user: dict = Depends(get_current_user)):
    query = {"brand_id": brand_id}
    if persona:
        query["persona"] = persona
    touchpoints = await db.touchpoints.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    by_phase = {"Topo de Funil": [], "Meio de Funil": [], "Fundo de Funil": []}
    for tp in touchpoints:
        phase = tp.get("fase_funil", "Topo de Funil")
        if phase in by_phase:
            by_phase[phase].append(tp)
    
    total = len(touchpoints)
    avg_score = sum(tp.get("nota", 0) for tp in touchpoints) / total if total > 0 else 0
    critical = len([tp for tp in touchpoints if tp.get("nota", 0) <= 3])
    attention = len([tp for tp in touchpoints if 4 <= tp.get("nota", 0) <= 6])
    excellent = len([tp for tp in touchpoints if tp.get("nota", 0) >= 7])
    
    total_custo = sum(tp.get("custo_mensal", 0) for tp in touchpoints)
    total_receita = sum(tp.get("receita_gerada", 0) for tp in touchpoints)
    total_conversoes = sum(tp.get("conversoes", 0) for tp in touchpoints)
    roi_geral = ((total_receita - total_custo) / total_custo * 100) if total_custo > 0 else 0
    
    heatmap = {}
    for phase, tps in by_phase.items():
        if tps:
            heatmap[phase] = {"avg_score": round(sum(t.get("nota", 0) for t in tps) / len(tps), 1), "count": len(tps),
                              "critical": len([t for t in tps if t.get("nota", 0) <= 3]), "roi": round(sum(t.get("roi", 0) for t in tps) / len(tps), 1)}
        else:
            heatmap[phase] = {"avg_score": 0, "count": 0, "critical": 0, "roi": 0}
    
    sorted_by_score = sorted(touchpoints, key=lambda x: x.get("nota", 0))
    
    return {
        "touchpoints": touchpoints, "by_phase": by_phase,
        "stats": {"total": total, "avg_score": round(avg_score, 1), "critical": critical, "attention": attention, "excellent": excellent},
        "financial": {"total_custo": total_custo, "total_receita": total_receita, "total_conversoes": total_conversoes, "roi_geral": round(roi_geral, 1)},
        "heatmap": heatmap,
        "top_critical": sorted_by_score[:5] if len(sorted_by_score) >= 5 else sorted_by_score,
        "top_excellent": sorted_by_score[-5:][::-1] if len(sorted_by_score) >= 5 else sorted_by_score[::-1]
    }

@router.post("/brands/{brand_id}/touchpoints")
async def create_touchpoint(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    touchpoint_id = f"tp_{uuid.uuid4().hex[:12]}"
    custo = float(data.get("custo_mensal", 0))
    receita = float(data.get("receita_gerada", 0))
    roi = ((receita - custo) / custo * 100) if custo > 0 else 0
    
    touchpoint_doc = {
        "touchpoint_id": touchpoint_id, "brand_id": brand_id, "nome": data.get("nome", ""), "descricao": data.get("descricao", ""),
        "ambiente": data.get("ambiente", "Online"), "fase_funil": data.get("fase_funil", "Topo de Funil"),
        "sentimento": data.get("sentimento", "Neutro"), "nota": min(10, max(0, int(data.get("nota", 5)))),
        "persona": data.get("persona", "Geral"), "custo_mensal": custo, "receita_gerada": receita,
        "conversoes": int(data.get("conversoes", 0)), "roi": round(roi, 1),
        "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.touchpoints.insert_one(touchpoint_doc)
    touchpoint_doc.pop("_id", None)
    return touchpoint_doc

@router.put("/brands/{brand_id}/touchpoints/{touchpoint_id}")
async def update_touchpoint(brand_id: str, touchpoint_id: str, data: dict, user: dict = Depends(get_current_user)):
    custo = float(data.get("custo_mensal", 0))
    receita = float(data.get("receita_gerada", 0))
    roi = ((receita - custo) / custo * 100) if custo > 0 else 0
    
    update_data = {
        "nome": data.get("nome"), "descricao": data.get("descricao"), "ambiente": data.get("ambiente"),
        "fase_funil": data.get("fase_funil"), "sentimento": data.get("sentimento"),
        "nota": min(10, max(0, int(data.get("nota", 5)))), "persona": data.get("persona"),
        "custo_mensal": custo, "receita_gerada": receita, "conversoes": int(data.get("conversoes", 0)),
        "roi": round(roi, 1), "updated_at": datetime.now(timezone.utc).isoformat()
    }
    update_data = {k: v for k, v in update_data.items() if v is not None}
    await db.touchpoints.update_one({"touchpoint_id": touchpoint_id, "brand_id": brand_id}, {"$set": update_data})
    return await db.touchpoints.find_one({"touchpoint_id": touchpoint_id}, {"_id": 0})

@router.delete("/brands/{brand_id}/touchpoints/{touchpoint_id}")
async def delete_touchpoint(brand_id: str, touchpoint_id: str, user: dict = Depends(get_current_user)):
    result = await db.touchpoints.delete_one({"touchpoint_id": touchpoint_id, "brand_id": brand_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Touchpoint não encontrado")
    return {"message": "Touchpoint removido com sucesso"}

@router.get("/touchpoints/options")
async def get_touchpoint_options(user: dict = Depends(get_current_user)):
    return {"funnel_phases": FUNNEL_PHASES, "environments": ENVIRONMENTS, "sentiments": SENTIMENTS}

@router.get("/brands/{brand_id}/personas")
async def get_personas(brand_id: str, user: dict = Depends(get_current_user)):
    personas = await db.personas.find({"brand_id": brand_id}, {"_id": 0}).to_list(50)
    return {"personas": personas}

@router.post("/brands/{brand_id}/personas")
async def create_persona(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    persona_id = f"persona_{uuid.uuid4().hex[:12]}"
    persona_doc = {"persona_id": persona_id, "brand_id": brand_id, "nome": data.get("nome", ""),
                   "descricao": data.get("descricao", ""), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.personas.insert_one(persona_doc)
    persona_doc.pop("_id", None)
    return persona_doc

@router.delete("/brands/{brand_id}/personas/{persona_id}")
async def delete_persona(brand_id: str, persona_id: str, user: dict = Depends(get_current_user)):
    await db.personas.delete_one({"persona_id": persona_id, "brand_id": brand_id})
    return {"message": "Persona removida"}
