"""
LaBrand - Maturity Diagnosis Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import json
import logging

from config import db
from utils.helpers import get_current_user, call_llm, deduct_ai_credits

router = APIRouter(tags=["Maturity Diagnosis"])

# Maturity Dimensions Definition
MATURITY_DIMENSIONS = {
    "estrategia": {
        "name": "Estratégia de Marca",
        "description": "Clareza e documentação da estratégia de marca",
        "questions": [
            {"id": "e1", "text": "A marca possui um propósito claro e documentado?", "weight": 2},
            {"id": "e2", "text": "Existe um posicionamento de marca definido?", "weight": 2},
            {"id": "e3", "text": "Os valores da marca estão formalizados?", "weight": 1.5},
            {"id": "e4", "text": "A promessa de marca está articulada?", "weight": 1.5},
            {"id": "e5", "text": "Existe um plano estratégico de marca para os próximos 3 anos?", "weight": 1}
        ]
    },
    "identidade": {
        "name": "Identidade Visual",
        "description": "Consistência e qualidade dos elementos visuais",
        "questions": [
            {"id": "i1", "text": "A marca possui um manual de identidade visual atualizado?", "weight": 2},
            {"id": "i2", "text": "O logotipo é utilizado de forma consistente em todos os pontos de contato?", "weight": 2},
            {"id": "i3", "text": "A paleta de cores é respeitada em todas as comunicações?", "weight": 1.5},
            {"id": "i4", "text": "A tipografia segue padrões definidos?", "weight": 1},
            {"id": "i5", "text": "Existe um banco de imagens e assets padronizado?", "weight": 1}
        ]
    },
    "comunicacao": {
        "name": "Comunicação",
        "description": "Tom de voz e mensagens-chave",
        "questions": [
            {"id": "c1", "text": "A marca possui um tom de voz definido e documentado?", "weight": 2},
            {"id": "c2", "text": "As mensagens-chave são consistentes em todos os canais?", "weight": 2},
            {"id": "c3", "text": "Existe um guia de redação/conteúdo para a marca?", "weight": 1.5},
            {"id": "c4", "text": "A comunicação é adaptada para diferentes públicos mantendo a essência?", "weight": 1.5},
            {"id": "c5", "text": "Há um calendário editorial alinhado à estratégia de marca?", "weight": 1}
        ]
    },
    "experiencia": {
        "name": "Experiência do Cliente",
        "description": "Consistência nos pontos de contato",
        "questions": [
            {"id": "x1", "text": "Todos os pontos de contato estão mapeados?", "weight": 1.5},
            {"id": "x2", "text": "A experiência é consistente em todos os canais (on/offline)?", "weight": 2},
            {"id": "x3", "text": "Existe um padrão de atendimento alinhado à marca?", "weight": 2},
            {"id": "x4", "text": "O packaging/embalagem reflete a identidade da marca?", "weight": 1},
            {"id": "x5", "text": "Os ambientes físicos expressam a marca?", "weight": 1}
        ]
    },
    "cultura": {
        "name": "Cultura Interna",
        "description": "Engajamento dos colaboradores com a marca",
        "questions": [
            {"id": "u1", "text": "Os colaboradores conhecem e entendem a marca?", "weight": 2},
            {"id": "u2", "text": "Existe um programa de employer branding estruturado?", "weight": 1.5},
            {"id": "u3", "text": "Os valores da marca são vivenciados internamente?", "weight": 2},
            {"id": "u4", "text": "Há treinamentos regulares sobre a marca?", "weight": 1},
            {"id": "u5", "text": "Os líderes são embaixadores da marca?", "weight": 1.5}
        ]
    },
    "metricas": {
        "name": "Métricas e Governança",
        "description": "Monitoramento e gestão da marca",
        "questions": [
            {"id": "m1", "text": "Existe um comitê/responsável pela gestão da marca?", "weight": 2},
            {"id": "m2", "text": "A marca é medida regularmente (awareness, NPS, etc.)?", "weight": 2},
            {"id": "m3", "text": "Há KPIs de marca definidos e acompanhados?", "weight": 1.5},
            {"id": "m4", "text": "O valor da marca é calculado periodicamente?", "weight": 1},
            {"id": "m5", "text": "Existe um processo de aprovação para uso da marca?", "weight": 1.5}
        ]
    }
}

MATURITY_LEVELS = [
    {"min": 0, "max": 20, "level": "Inicial", "description": "A marca está em estágio inicial, sem processos estruturados."},
    {"min": 21, "max": 40, "level": "Básico", "description": "Existem alguns elementos básicos, mas falta consistência e documentação."},
    {"min": 41, "max": 60, "level": "Em Desenvolvimento", "description": "A marca está em desenvolvimento com processos sendo estruturados."},
    {"min": 61, "max": 80, "level": "Maduro", "description": "A marca possui boa estruturação e consistência na maioria das dimensões."},
    {"min": 81, "max": 100, "level": "Excelência", "description": "A marca está em nível de excelência com processos maduros e integrados."}
]


@router.get("/maturity/dimensions")
async def get_maturity_dimensions(user: dict = Depends(get_current_user)):
    """Get all maturity dimensions and questions"""
    return {"dimensions": MATURITY_DIMENSIONS, "levels": MATURITY_LEVELS}


@router.get("/brands/{brand_id}/maturity-diagnosis")
async def get_maturity_diagnosis(brand_id: str, user: dict = Depends(get_current_user)):
    """Get brand's maturity diagnosis"""
    data = await db.maturity_diagnosis.find_one({"brand_id": brand_id}, {"_id": 0})
    return data or {"status": "not_started", "dimensions": MATURITY_DIMENSIONS}


@router.post("/brands/{brand_id}/maturity-diagnosis")
async def save_maturity_diagnosis(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Save maturity diagnosis answers and calculate scores"""
    answers = data.get("answers", {})
    frontend_results = data.get("results", None)  # Preserve frontend results
    
    # Calculate scores for each dimension
    dimension_scores = {}
    total_score = 0
    total_weight = 0
    
    for dim_id, dimension in MATURITY_DIMENSIONS.items():
        dim_score = 0
        dim_weight = 0
        
        for question in dimension["questions"]:
            q_id = question["id"]
            weight = question["weight"]
            answer = answers.get(q_id, 0)  # 0-4 scale (0=não, 4=totalmente)
            
            dim_score += (answer / 4) * weight * 100  # Normalize to 0-100
            dim_weight += weight
        
        if dim_weight > 0:
            dimension_scores[dim_id] = {
                "score": round(dim_score / dim_weight, 1),
                "name": dimension["name"],
                "description": dimension["description"]
            }
            total_score += dim_score
            total_weight += dim_weight
    
    overall_score = round(total_score / total_weight, 1) if total_weight > 0 else 0
    
    # Determine maturity level
    maturity_level = MATURITY_LEVELS[0]
    for level in MATURITY_LEVELS:
        if level["min"] <= overall_score <= level["max"]:
            maturity_level = level
            break
    
    diagnosis_data = {
        "brand_id": brand_id,
        "user_id": user["user_id"],
        "answers": answers,
        "results": frontend_results,  # Save frontend results
        "dimension_scores": dimension_scores,
        "overall_score": overall_score,
        "maturity_level": maturity_level["level"],
        "maturity_description": maturity_level["description"],
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "completed"
    }
    
    await db.maturity_diagnosis.update_one(
        {"brand_id": brand_id},
        {"$set": diagnosis_data},
        upsert=True
    )
    
    return diagnosis_data


@router.post("/brands/{brand_id}/maturity-diagnosis/recommendations")
async def get_maturity_recommendations(brand_id: str, user: dict = Depends(get_current_user)):
    """Get AI-powered recommendations based on maturity diagnosis"""
    try:
        # Check and deduct AI credits
        success, result = await deduct_ai_credits(user["user_id"], "suggestion")
        if not success:
            raise HTTPException(status_code=402, detail=result)
        
        # Get diagnosis data
        diagnosis = await db.maturity_diagnosis.find_one({"brand_id": brand_id}, {"_id": 0})
        if not diagnosis or diagnosis.get("status") != "completed":
            raise HTTPException(status_code=400, detail="Complete o diagnóstico primeiro")
        
        brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
        
        # Find weakest dimensions
        dimension_scores = diagnosis.get("dimension_scores", {})
        sorted_dims = sorted(dimension_scores.items(), key=lambda x: x[1]["score"])
        weakest = sorted_dims[:3] if len(sorted_dims) >= 3 else sorted_dims
        strongest = sorted_dims[-2:] if len(sorted_dims) >= 2 else []
        
        context = f"""
        Marca: {brand.get('name', 'N/A') if brand else 'N/A'}
        Score Geral de Maturidade: {diagnosis.get('overall_score')}%
        Nível de Maturidade: {diagnosis.get('maturity_level')}
        
        Dimensões mais fracas:
        {chr(10).join([f"- {d[1]['name']}: {d[1]['score']}%" for d in weakest])}
        
        Dimensões mais fortes:
        {chr(10).join([f"- {d[1]['name']}: {d[1]['score']}%" for d in strongest])}
        """
        
        system_prompt = """Você é um consultor de branding experiente. Analise o diagnóstico de maturidade e forneça recomendações práticas.

Retorne um JSON com:
{
    "summary": "Resumo executivo do diagnóstico (2-3 linhas)",
    "priority_actions": [
        {"action": "Ação prioritária 1", "dimension": "dimensão", "impact": "alto/médio/baixo", "effort": "alto/médio/baixo"},
        {"action": "Ação prioritária 2", "dimension": "dimensão", "impact": "alto/médio/baixo", "effort": "alto/médio/baixo"},
        {"action": "Ação prioritária 3", "dimension": "dimensão", "impact": "alto/médio/baixo", "effort": "alto/médio/baixo"}
    ],
    "quick_wins": ["Quick win 1", "Quick win 2", "Quick win 3"],
    "roadmap": {
        "30_days": ["Ação para 30 dias"],
        "90_days": ["Ação para 90 dias"],
        "180_days": ["Ação para 180 dias"]
    },
    "strengths_to_leverage": ["Ponto forte 1 para alavancar", "Ponto forte 2 para alavancar"]
}

Seja específico e prático. Use português do Brasil."""

        prompt = f"""Analise o diagnóstico de maturidade da marca e gere recomendações:
        {context}
        
        Retorne apenas o JSON válido."""
        
        response = await call_llm(system_prompt, prompt)
        
        # Parse response
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        
        recommendations = json.loads(clean_response)
        recommendations["credits_used"] = result
        recommendations["generated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Save recommendations
        await db.maturity_diagnosis.update_one(
            {"brand_id": brand_id},
            {"$set": {"recommendations": recommendations}}
        )
        
        return recommendations
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Maturity recommendations error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/brands/{brand_id}/maturity-diagnosis/history")
async def get_maturity_history(brand_id: str, user: dict = Depends(get_current_user)):
    """Get history of maturity diagnoses"""
    history = await db.maturity_diagnosis_history.find(
        {"brand_id": brand_id},
        {"_id": 0}
    ).sort("completed_at", -1).to_list(10)
    
    return {"history": history}
