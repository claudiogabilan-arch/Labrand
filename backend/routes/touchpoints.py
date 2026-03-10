"""Touchpoints Module Routes - with Offline Touchpoint Business Rules"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Touchpoints"])

FUNNEL_PHASES = ["Topo de Funil", "Meio de Funil", "Fundo de Funil"]
ENVIRONMENTS = ["Online", "Offline"]
SENTIMENTS = ["Feliz", "Triste", "Frustrado", "Neutro"]

OFFLINE_TYPES = [
    {
        "id": "palestra",
        "label": "Palestra ou Keynote",
        "description": "Acao presencial onde voce fala para uma audiencia como convidado ou protagonista.",
        "default_fase_funil": "Topo de Funil",
        "nome_exemplo": "Palestra Febramark - Mar 2025",
        "orientacao": "Registre esse touchpoint em ate 48h apos o evento, quando os dados ainda estao frescos. O NPS deve ser coletado via formulario enviado no dia seguinte ao evento.",
        "metricas_obrigatorias": ["nome", "fase_funil", "custo_mensal", "receita_gerada", "conversoes", "nota", "sentimento"],
        "dicas": {
            "custo_mensal": "Cache recebido ou custo de deslocamento/producao",
            "receita_gerada": "Valor de contratos fechados originados desse evento",
            "conversoes": "Numero de leads qualificados que pediram contato apos o evento",
            "nota": "Baseada no NPS coletado com os participantes (0 a 10)"
        }
    },
    {
        "id": "imersao",
        "label": "Imersao Presencial",
        "description": "Evento de 1 ou 2 dias conduzido por voce com grupo seleto de participantes.",
        "default_fase_funil": "Meio de Funil",
        "nome_exemplo": "Imersao Brand for Equity - Turma 01 - Abr 2025",
        "orientacao": "A imersao e o touchpoint de maior valor no funil. Registre tambem nos proximos 30 dias quantos participantes avancaram para contratos. Atualize as Conversoes quando esse dado estiver disponivel.",
        "metricas_obrigatorias": ["nome", "fase_funil", "custo_mensal", "receita_gerada", "conversoes", "nota", "descricao"],
        "dicas": {
            "custo_mensal": "Custo total de producao do evento",
            "receita_gerada": "Receita total das inscricoes",
            "conversoes": "Participantes que fizeram upsell para mentoria ou consultoria",
            "nota": "NPS coletado ao final do evento (0 a 10)",
            "descricao": "Incluir numero de vagas ofertadas, vagas preenchidas e taxa de retencao na sala"
        }
    },
    {
        "id": "tv",
        "label": "Participacao em Programa de TV",
        "description": "Participacao como convidado ou entrevistado em programa de televisao ao vivo ou gravado.",
        "default_fase_funil": "Topo de Funil",
        "nome_exemplo": "Programa Roda Viva - TV Cultura - Mar 2025",
        "orientacao": "Registre a emissora e o dia/horario do programa. Monitore mencoes nas redes sociais nas 48h apos a exibicao usando o Social Listening do LABrand. Esse dado complementa as metricas deste touchpoint.",
        "metricas_obrigatorias": ["nome", "fase_funil", "custo_mensal", "receita_gerada", "conversoes", "nota", "emissora", "dia_horario"],
        "campos_extras": ["emissora", "dia_horario"],
        "dicas": {
            "custo_mensal": "Zero se convidado; valor de producao ou assessoria se pago",
            "receita_gerada": "Valor estimado de contratos atribuidos a essa aparicao",
            "conversoes": "Novos seguidores ou leads que citaram o programa como ponto de contato",
            "nota": "Avaliacao qualitativa da qualidade da participacao (0 a 10)",
            "emissora": "Nome da emissora ou canal (Ex: TV Cultura, Globo, Band, SBT)",
            "dia_horario": "Data e horario da exibicao (Ex: Seg 22h, 15/03/2025 20h)"
        }
    },
    {
        "id": "mentoria",
        "label": "Mentoria ou Reuniao Estrategica",
        "description": "Sessao individual ou em grupo de mentoria, advisory ou consultoria presencial.",
        "default_fase_funil": "Fundo de Funil",
        "nome_exemplo": "Mentoria Grupo - Turma 01 - Mai 2025",
        "orientacao": "Registre cada ciclo de mentoria como um touchpoint separado. Atualize as conversoes ao final de cada ciclo para refletir renovacoes e indicacoes.",
        "metricas_obrigatorias": ["nome", "fase_funil", "custo_mensal", "receita_gerada", "conversoes", "nota"],
        "dicas": {
            "custo_mensal": "Custo operacional da sessao",
            "receita_gerada": "Receita do contrato de mentoria",
            "conversoes": "Numero de renovacoes ou indicacoes geradas por esse grupo",
            "nota": "NPS coletado ao final de cada ciclo (0 a 10)"
        }
    }
]

OFFLINE_TYPES_MAP = {t["id"]: t for t in OFFLINE_TYPES}

def get_guidance_messages(touchpoint_doc, monthly_offline_count=0):
    """Generate contextual guidance messages based on touchpoint state."""
    messages = []
    
    if touchpoint_doc.get("ambiente") == "Offline":
        if touchpoint_doc.get("nota", 0) == 0:
            messages.append({
                "type": "warning",
                "message": "Lembre de atualizar a Nota de Avaliacao apos coletar o NPS dos participantes. Esse dado e essencial para calcular o Brand Score do periodo."
            })
        
        if touchpoint_doc.get("receita_gerada", 0) == 0 and touchpoint_doc.get("conversoes", 0) > 0:
            messages.append({
                "type": "info",
                "message": "Voce registrou conversoes mas ainda sem receita atribuida. Lembre de atualizar esse campo em ate 30 dias, quando os contratos originados desse touchpoint estiverem confirmados."
            })
        
        if monthly_offline_count >= 5:
            messages.append({
                "type": "success",
                "message": f"Voce tem {monthly_offline_count} touchpoints offline registrados este mes. Lembre de criar o snapshot mensal no Brand Tracking para consolidar o impacto desse periodo na evolucao da sua marca."
            })
    
    return messages


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
    
    # Offline stats
    offline_tps = [tp for tp in touchpoints if tp.get("ambiente") == "Offline"]
    online_tps = [tp for tp in touchpoints if tp.get("ambiente") == "Online"]
    
    # Monthly offline count for guidance
    now = datetime.now(timezone.utc)
    monthly_offline = [tp for tp in offline_tps if tp.get("created_at", "").startswith(now.strftime("%Y-%m"))]
    
    # Guidance messages for the overall page
    page_guidance = []
    if len(monthly_offline) >= 5:
        page_guidance.append({
            "type": "success",
            "message": f"Voce tem {len(monthly_offline)} touchpoints offline registrados este mes. Lembre de criar o snapshot mensal no Brand Tracking para consolidar o impacto desse periodo na evolucao da sua marca."
        })
    
    # Touchpoints needing attention (nota=0 or receita=0 with conversoes>0)
    needs_update = []
    for tp in offline_tps:
        msgs = get_guidance_messages(tp)
        if msgs:
            needs_update.append({"touchpoint_id": tp["touchpoint_id"], "nome": tp["nome"], "messages": msgs})
    
    return {
        "touchpoints": touchpoints, "by_phase": by_phase,
        "stats": {"total": total, "avg_score": round(avg_score, 1), "critical": critical, "attention": attention, "excellent": excellent,
                  "total_offline": len(offline_tps), "total_online": len(online_tps)},
        "financial": {"total_custo": total_custo, "total_receita": total_receita, "total_conversoes": total_conversoes, "roi_geral": round(roi_geral, 1)},
        "heatmap": heatmap,
        "top_critical": sorted_by_score[:5] if len(sorted_by_score) >= 5 else sorted_by_score,
        "top_excellent": sorted_by_score[-5:][::-1] if len(sorted_by_score) >= 5 else sorted_by_score[::-1],
        "page_guidance": page_guidance,
        "needs_update": needs_update
    }


@router.get("/touchpoints/offline-types")
async def get_offline_types(user: dict = Depends(get_current_user)):
    """Return all offline touchpoint type definitions with business rules."""
    return {"types": OFFLINE_TYPES}


@router.post("/brands/{brand_id}/touchpoints")
async def create_touchpoint(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    touchpoint_id = f"tp_{uuid.uuid4().hex[:12]}"
    custo = float(data.get("custo_mensal", 0))
    receita = float(data.get("receita_gerada", 0))
    roi = ((receita - custo) / custo * 100) if custo > 0 else 0
    
    ambiente = data.get("ambiente", "Online")
    tipo_offline = data.get("tipo_offline", None) if ambiente == "Offline" else None
    
    # Auto-set funnel phase for offline types if not explicitly changed
    fase_funil = data.get("fase_funil", "Topo de Funil")
    if tipo_offline and tipo_offline in OFFLINE_TYPES_MAP:
        type_def = OFFLINE_TYPES_MAP[tipo_offline]
        if data.get("fase_funil") is None or data.get("fase_funil") == "":
            fase_funil = type_def["default_fase_funil"]
    
    touchpoint_doc = {
        "touchpoint_id": touchpoint_id, "brand_id": brand_id, "nome": data.get("nome", ""), "descricao": data.get("descricao", ""),
        "ambiente": ambiente, "tipo_offline": tipo_offline,
        "fase_funil": fase_funil,
        "sentimento": data.get("sentimento", "Neutro"), "nota": min(10, max(0, int(data.get("nota", 5)))),
        "persona": data.get("persona", "Geral"), "custo_mensal": custo, "receita_gerada": receita,
        "conversoes": int(data.get("conversoes", 0)), "roi": round(roi, 1),
        "emissora": data.get("emissora", "") if tipo_offline == "tv" else "",
        "dia_horario": data.get("dia_horario", "") if tipo_offline == "tv" else "",
        "status": data.get("status", "ativo"),
        "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.touchpoints.insert_one(touchpoint_doc)
    touchpoint_doc.pop("_id", None)
    
    # Get monthly offline count for guidance
    now = datetime.now(timezone.utc)
    monthly_count = await db.touchpoints.count_documents({
        "brand_id": brand_id, "ambiente": "Offline",
        "created_at": {"$regex": f"^{now.strftime('%Y-%m')}"}
    })
    
    guidance = get_guidance_messages(touchpoint_doc, monthly_count)
    
    return {"touchpoint": touchpoint_doc, "guidance": guidance}


@router.put("/brands/{brand_id}/touchpoints/{touchpoint_id}")
async def update_touchpoint(brand_id: str, touchpoint_id: str, data: dict, user: dict = Depends(get_current_user)):
    custo = float(data.get("custo_mensal", 0))
    receita = float(data.get("receita_gerada", 0))
    roi = ((receita - custo) / custo * 100) if custo > 0 else 0
    
    update_data = {
        "nome": data.get("nome"), "descricao": data.get("descricao"), "ambiente": data.get("ambiente"),
        "tipo_offline": data.get("tipo_offline"), "fase_funil": data.get("fase_funil"), "sentimento": data.get("sentimento"),
        "nota": min(10, max(0, int(data.get("nota", 5)))), "persona": data.get("persona"),
        "custo_mensal": custo, "receita_gerada": receita, "conversoes": int(data.get("conversoes", 0)),
        "roi": round(roi, 1), "status": data.get("status"),
        "emissora": data.get("emissora"), "dia_horario": data.get("dia_horario"),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    update_data = {k: v for k, v in update_data.items() if v is not None}
    await db.touchpoints.update_one({"touchpoint_id": touchpoint_id, "brand_id": brand_id}, {"$set": update_data})
    
    updated = await db.touchpoints.find_one({"touchpoint_id": touchpoint_id}, {"_id": 0})
    guidance = get_guidance_messages(updated) if updated else []
    
    return {"touchpoint": updated, "guidance": guidance}


@router.delete("/brands/{brand_id}/touchpoints/{touchpoint_id}")
async def delete_touchpoint(brand_id: str, touchpoint_id: str, user: dict = Depends(get_current_user)):
    result = await db.touchpoints.delete_one({"touchpoint_id": touchpoint_id, "brand_id": brand_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Touchpoint nao encontrado")
    return {"message": "Touchpoint removido com sucesso"}


@router.get("/touchpoints/options")
async def get_touchpoint_options(user: dict = Depends(get_current_user)):
    return {"funnel_phases": FUNNEL_PHASES, "environments": ENVIRONMENTS, "sentiments": SENTIMENTS, "offline_types": OFFLINE_TYPES}


@router.get("/brands/{brand_id}/personas")
async def get_personas(brand_id: str, user: dict = Depends(get_current_user)):
    personas = await db.personas.find({"brand_id": brand_id}, {"_id": 0}).to_list(50)
    return {"personas": personas, "persona_names": ["Geral"] + [p["nome"] for p in personas]}


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
