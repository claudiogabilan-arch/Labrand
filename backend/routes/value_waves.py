"""Value Waves (Ondas de Valor) Routes - Brand/Business/Communication value management framework"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Value Waves"])


# Value Waves Framework Structure
VALUE_WAVES_FRAMEWORK = {
    "brand": {
        "name": "Onda de Marca",
        "description": "Gestão do valor e força da marca",
        "color": "#8B5CF6",
        "dimensions": [
            {
                "id": "awareness",
                "name": "Conhecimento",
                "description": "Quanto o público conhece sua marca",
                "questions": [
                    {"id": "q1", "text": "Sua marca é reconhecida pelo público-alvo?", "options": ["Sim, amplamente", "Parcialmente", "Pouco", "Não"]},
                    {"id": "q2", "text": "Os consumidores lembram da sua marca espontaneamente?", "options": ["Sim", "Às vezes", "Raramente", "Não"]},
                    {"id": "q3", "text": "Sua marca aparece em pesquisas do setor?", "options": ["Frequentemente", "Às vezes", "Raramente", "Nunca"]}
                ]
            },
            {
                "id": "perception",
                "name": "Percepção",
                "description": "Como o público percebe sua marca",
                "questions": [
                    {"id": "q1", "text": "A marca é vista como líder ou inovadora?", "options": ["Líder", "Inovadora", "Seguidora", "Desconhecida"]},
                    {"id": "q2", "text": "Os valores da marca são percebidos claramente?", "options": ["Sim, claramente", "Parcialmente", "Confusos", "Não"]},
                    {"id": "q3", "text": "A marca é associada a qualidade?", "options": ["Alta qualidade", "Boa qualidade", "Qualidade média", "Baixa qualidade"]}
                ]
            },
            {
                "id": "differentiation",
                "name": "Diferenciação",
                "description": "O que torna sua marca única",
                "questions": [
                    {"id": "q1", "text": "Sua marca tem um posicionamento único?", "options": ["Muito único", "Diferenciado", "Similar aos concorrentes", "Genérico"]},
                    {"id": "q2", "text": "O público consegue diferenciar sua marca?", "options": ["Facilmente", "Com algum esforço", "Dificilmente", "Não"]},
                    {"id": "q3", "text": "Seus diferenciais são comunicados consistentemente?", "options": ["Sempre", "Frequentemente", "Às vezes", "Raramente"]}
                ]
            }
        ]
    },
    "business": {
        "name": "Onda de Negócio",
        "description": "Gestão do valor e resultados do negócio",
        "color": "#10B981",
        "dimensions": [
            {
                "id": "revenue",
                "name": "Receita",
                "description": "Performance financeira",
                "questions": [
                    {"id": "q1", "text": "A receita está crescendo consistentemente?", "options": ["Crescimento alto", "Crescimento moderado", "Estável", "Em queda"]},
                    {"id": "q2", "text": "As margens de lucro são saudáveis?", "options": ["Excelentes", "Boas", "Aceitáveis", "Baixas"]},
                    {"id": "q3", "text": "O CAC (Custo de Aquisição) é sustentável?", "options": ["Muito baixo", "Adequado", "Alto", "Muito alto"]}
                ]
            },
            {
                "id": "market_share",
                "name": "Market Share",
                "description": "Participação no mercado",
                "questions": [
                    {"id": "q1", "text": "Qual sua participação de mercado?", "options": ["Líder (>30%)", "Top 3 (15-30%)", "Relevante (5-15%)", "Pequena (<5%)"]},
                    {"id": "q2", "text": "Sua participação está crescendo?", "options": ["Crescendo rápido", "Crescendo", "Estável", "Diminuindo"]},
                    {"id": "q3", "text": "Você está ganhando clientes dos concorrentes?", "options": ["Frequentemente", "Às vezes", "Raramente", "Perdendo clientes"]}
                ]
            },
            {
                "id": "customer_value",
                "name": "Valor do Cliente",
                "description": "LTV e retenção",
                "questions": [
                    {"id": "q1", "text": "O LTV (Lifetime Value) está aumentando?", "options": ["Crescendo muito", "Crescendo", "Estável", "Diminuindo"]},
                    {"id": "q2", "text": "A taxa de retenção é alta?", "options": [">90%", "70-90%", "50-70%", "<50%"]},
                    {"id": "q3", "text": "Clientes indicam sua empresa?", "options": ["Frequentemente", "Às vezes", "Raramente", "Nunca"]}
                ]
            }
        ]
    },
    "communication": {
        "name": "Onda de Comunicação",
        "description": "Gestão da comunicação e mensagens",
        "color": "#F59E0B",
        "dimensions": [
            {
                "id": "consistency",
                "name": "Consistência",
                "description": "Uniformidade da comunicação",
                "questions": [
                    {"id": "q1", "text": "A comunicação é consistente em todos os canais?", "options": ["Totalmente", "Maioria", "Parcialmente", "Inconsistente"]},
                    {"id": "q2", "text": "O tom de voz é mantido em todas as comunicações?", "options": ["Sempre", "Frequentemente", "Às vezes", "Raramente"]},
                    {"id": "q3", "text": "Visual e mensagem estão alinhados?", "options": ["Perfeitamente", "Bem alinhados", "Parcialmente", "Desalinhados"]}
                ]
            },
            {
                "id": "reach",
                "name": "Alcance",
                "description": "Abrangência da comunicação",
                "questions": [
                    {"id": "q1", "text": "Suas mensagens atingem o público-alvo?", "options": ["Amplamente", "Maioria", "Parte", "Pouco"]},
                    {"id": "q2", "text": "Presença em canais relevantes para o público?", "options": ["Todos", "Maioria", "Alguns", "Poucos"]},
                    {"id": "q3", "text": "Frequência de comunicação é adequada?", "options": ["Ideal", "Boa", "Poderia melhorar", "Inadequada"]}
                ]
            },
            {
                "id": "engagement",
                "name": "Engajamento",
                "description": "Interação do público",
                "questions": [
                    {"id": "q1", "text": "O público interage com seu conteúdo?", "options": ["Alto engajamento", "Bom engajamento", "Baixo engajamento", "Muito baixo"]},
                    {"id": "q2", "text": "As mensagens geram conversões?", "options": ["Alta conversão", "Boa conversão", "Baixa conversão", "Quase nenhuma"]},
                    {"id": "q3", "text": "O feedback do público é positivo?", "options": ["Muito positivo", "Positivo", "Neutro", "Negativo"]}
                ]
            }
        ]
    }
}


class ValueWaveAnswer(BaseModel):
    wave_id: str
    dimension_id: str
    question_id: str
    answer: int  # 0-3 index of the selected option


class ValueWaveAssessment(BaseModel):
    answers: List[ValueWaveAnswer]
    notes: Optional[str] = None


@router.get("/value-waves/framework")
async def get_value_waves_framework():
    """Get the complete Value Waves framework structure"""
    return {
        "framework": VALUE_WAVES_FRAMEWORK,
        "total_questions": sum(
            len(q["questions"]) 
            for wave in VALUE_WAVES_FRAMEWORK.values() 
            for q in wave["dimensions"]
        )
    }


@router.get("/brands/{brand_id}/value-waves")
async def get_brand_value_waves(brand_id: str, user: dict = Depends(get_current_user)):
    """Get value waves assessment for a brand"""
    assessment = await db.value_waves.find_one(
        {"brand_id": brand_id},
        {"_id": 0}
    )
    
    if not assessment:
        return {"assessment": None, "has_data": False}
    
    return {"assessment": assessment, "has_data": True}


@router.post("/brands/{brand_id}/value-waves/assess")
async def create_value_waves_assessment(
    brand_id: str, 
    data: ValueWaveAssessment, 
    user: dict = Depends(get_current_user)
):
    """Create or update value waves assessment"""
    # Process answers and calculate scores
    wave_scores = {}
    
    for wave_id, wave_data in VALUE_WAVES_FRAMEWORK.items():
        wave_scores[wave_id] = {"total": 0, "max": 0, "dimensions": {}}
        
        for dimension in wave_data["dimensions"]:
            dim_id = dimension["id"]
            dim_total = 0
            dim_max = len(dimension["questions"]) * 3  # Max score per question is 3
            
            for question in dimension["questions"]:
                # Find the answer for this question
                answer = next(
                    (a for a in data.answers 
                     if a.wave_id == wave_id 
                     and a.dimension_id == dim_id 
                     and a.question_id == question["id"]),
                    None
                )
                if answer:
                    # Score: 3 for first option, 2 for second, 1 for third, 0 for fourth
                    score = 3 - answer.answer
                    dim_total += score
            
            dim_percentage = int((dim_total / dim_max) * 100) if dim_max > 0 else 0
            wave_scores[wave_id]["dimensions"][dim_id] = {
                "score": dim_total,
                "max": dim_max,
                "percentage": dim_percentage
            }
            wave_scores[wave_id]["total"] += dim_total
            wave_scores[wave_id]["max"] += dim_max
    
    # Calculate wave percentages
    for wave_id in wave_scores:
        total = wave_scores[wave_id]["total"]
        max_score = wave_scores[wave_id]["max"]
        wave_scores[wave_id]["percentage"] = int((total / max_score) * 100) if max_score > 0 else 0
    
    # Calculate overall score
    total_score = sum(w["total"] for w in wave_scores.values())
    max_score = sum(w["max"] for w in wave_scores.values())
    overall_percentage = int((total_score / max_score) * 100) if max_score > 0 else 0
    
    # Determine overall level
    if overall_percentage >= 80:
        level = "Excelente"
        level_description = "Sua marca tem um excelente equilíbrio nas três ondas de valor"
    elif overall_percentage >= 60:
        level = "Bom"
        level_description = "Boa performance, mas há oportunidades de melhoria"
    elif overall_percentage >= 40:
        level = "Em Desenvolvimento"
        level_description = "Algumas áreas precisam de atenção significativa"
    else:
        level = "Crítico"
        level_description = "Várias áreas críticas necessitam de trabalho imediato"
    
    # Generate insights
    insights = generate_wave_insights(wave_scores)
    
    assessment_doc = {
        "brand_id": brand_id,
        "answers": [a.dict() for a in data.answers],
        "wave_scores": wave_scores,
        "overall_score": overall_percentage,
        "level": level,
        "level_description": level_description,
        "insights": insights,
        "notes": data.notes,
        "assessed_at": datetime.now(timezone.utc).isoformat(),
        "assessed_by": user["user_id"]
    }
    
    await db.value_waves.update_one(
        {"brand_id": brand_id},
        {"$set": assessment_doc},
        upsert=True
    )
    
    return {
        "success": True,
        "assessment": {k: v for k, v in assessment_doc.items() if k != "_id"}
    }


@router.get("/brands/{brand_id}/value-waves/history")
async def get_value_waves_history(brand_id: str, user: dict = Depends(get_current_user)):
    """Get history of value waves assessments"""
    history = await db.value_waves_history.find(
        {"brand_id": brand_id},
        {"_id": 0}
    ).sort("assessed_at", -1).to_list(12)
    
    return {"history": history, "total": len(history)}


def generate_wave_insights(wave_scores: Dict) -> List[Dict]:
    """Generate insights based on wave scores"""
    insights = []
    
    # Check brand wave
    brand_pct = wave_scores.get("brand", {}).get("percentage", 0)
    if brand_pct < 50:
        insights.append({
            "wave": "brand",
            "type": "warning",
            "title": "Marca precisa de fortalecimento",
            "description": "A onda de marca está abaixo do ideal. Foque em aumentar conhecimento e diferenciação."
        })
    elif brand_pct >= 80:
        insights.append({
            "wave": "brand",
            "type": "success",
            "title": "Marca forte",
            "description": "Excelente performance na gestão de marca. Continue mantendo a consistência."
        })
    
    # Check business wave
    business_pct = wave_scores.get("business", {}).get("percentage", 0)
    if business_pct < 50:
        insights.append({
            "wave": "business",
            "type": "warning",
            "title": "Resultados de negócio abaixo do esperado",
            "description": "Revise sua estratégia de crescimento e retenção de clientes."
        })
    elif business_pct >= 80:
        insights.append({
            "wave": "business",
            "type": "success",
            "title": "Negócio saudável",
            "description": "Ótimos indicadores de negócio. A marca está gerando valor."
        })
    
    # Check communication wave
    comm_pct = wave_scores.get("communication", {}).get("percentage", 0)
    if comm_pct < 50:
        insights.append({
            "wave": "communication",
            "type": "warning",
            "title": "Comunicação precisa melhorar",
            "description": "Trabalhe na consistência e alcance da sua comunicação."
        })
    elif comm_pct >= 80:
        insights.append({
            "wave": "communication",
            "type": "success",
            "title": "Comunicação efetiva",
            "description": "Sua comunicação está atingindo e engajando o público corretamente."
        })
    
    # Check balance between waves
    percentages = [brand_pct, business_pct, comm_pct]
    if max(percentages) - min(percentages) > 30:
        insights.append({
            "wave": "balance",
            "type": "info",
            "title": "Desequilíbrio entre ondas",
            "description": "Há uma diferença significativa entre as ondas. Busque equilibrar investimentos."
        })
    
    return insights


@router.get("/brands/{brand_id}/value-waves/recommendations")
async def get_value_waves_recommendations(brand_id: str, user: dict = Depends(get_current_user)):
    """Get specific recommendations based on value waves assessment"""
    assessment = await db.value_waves.find_one({"brand_id": brand_id}, {"_id": 0})
    
    if not assessment:
        return {"recommendations": [], "message": "Complete uma avaliação primeiro"}
    
    recommendations = []
    wave_scores = assessment.get("wave_scores", {})
    
    for wave_id, wave_data in wave_scores.items():
        wave_info = VALUE_WAVES_FRAMEWORK.get(wave_id, {})
        
        for dim_id, dim_data in wave_data.get("dimensions", {}).items():
            if dim_data.get("percentage", 0) < 60:
                dim_info = next(
                    (d for d in wave_info.get("dimensions", []) if d["id"] == dim_id),
                    {}
                )
                recommendations.append({
                    "wave": wave_info.get("name", wave_id),
                    "dimension": dim_info.get("name", dim_id),
                    "score": dim_data.get("percentage", 0),
                    "priority": "high" if dim_data.get("percentage", 0) < 40 else "medium",
                    "action": get_dimension_action(wave_id, dim_id)
                })
    
    # Sort by priority and score
    recommendations.sort(key=lambda x: (x["priority"] == "medium", x["score"]))
    
    return {"recommendations": recommendations[:10]}  # Top 10 recommendations


def get_dimension_action(wave_id: str, dim_id: str) -> str:
    """Get specific action for a dimension"""
    actions = {
        ("brand", "awareness"): "Invista em campanhas de awareness e presença de marca",
        ("brand", "perception"): "Trabalhe a comunicação de valores e posicionamento",
        ("brand", "differentiation"): "Defina e comunique seus diferenciais únicos",
        ("business", "revenue"): "Revise estratégias de pricing e aquisição",
        ("business", "market_share"): "Analise concorrentes e oportunidades de mercado",
        ("business", "customer_value"): "Foque em programas de fidelização e upsell",
        ("communication", "consistency"): "Crie guidelines e treine equipe em brand voice",
        ("communication", "reach"): "Expanda presença nos canais do público-alvo",
        ("communication", "engagement"): "Melhore conteúdo e CTAs das comunicações"
    }
    return actions.get((wave_id, dim_id), "Revise esta dimensão em detalhes")
