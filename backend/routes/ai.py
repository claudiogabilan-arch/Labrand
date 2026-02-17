"""
LaBrand - AI Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import json
import logging

from config import db
from utils.helpers import get_current_user, call_llm, deduct_ai_credits

router = APIRouter(tags=["AI"])


@router.post("/ai/insights")
async def generate_ai_insight(data: dict, user: dict = Depends(get_current_user)):
    """Generate AI insights for brand pillars"""
    try:
        # Check and deduct AI credits
        success, result = await deduct_ai_credits(user["user_id"], "suggestion")
        if not success:
            raise HTTPException(status_code=402, detail=result)
        
        context = data.get("context", "")
        pillar = data.get("pillar", "default")
        brand_name = data.get("brand_name", "Marca")
        
        system_prompts = {
            "values": "Você é um especialista em branding e estratégia de marca. Analise os valores e necessidades fornecidos e gere insights estratégicos sobre como a marca pode conectar seus valores com as necessidades dos públicos. Responda em português do Brasil de forma clara e acionável.",
            "purpose": "Você é um especialista em propósito de marca. Com base nas habilidades, curiosidades, paixões e impactos fornecidos, gere uma declaração de propósito inspiradora e autêntica. Responda em português do Brasil.",
            "positioning": "Você é um especialista em posicionamento de marca. Com base no contexto competitivo fornecido, gere uma declaração de posicionamento clara e diferenciadora. Responda em português do Brasil.",
            "personality": "Você é um especialista em personalidade de marca e arquétipos de Jung. Com base nos atributos fornecidos, desenvolva uma narrativa de humanização da marca. Responda em português do Brasil.",
            "valuation": "Você é um especialista em brand valuation e avaliação de marcas, com profundo conhecimento da metodologia Interbrand. Com base nos dados de Brand Strength, Role of Brand Index e performance financeira fornecidos, gere recomendações estratégicas para aumentar o valor da marca. Foque em ações específicas para melhorar os fatores mais fracos e capitalizar nos pontos fortes. Responda em português do Brasil de forma clara e acionável.",
            "audience": "Você é um especialista em análise de audiência e marketing de influência. Analise o perfil da marca e sugira estratégias de engajamento. Responda em português do Brasil.",
            "default": "Você é um especialista em branding e estratégia de marca. Analise o contexto fornecido e gere insights acionáveis. Responda em português do Brasil."
        }
        
        system_prompt = system_prompts.get(pillar, system_prompts["default"])
        user_prompt = f"Marca: {brand_name}\n\nContexto:\n{context}\n\nGere insights estratégicos e acionáveis:"
        
        response = await call_llm(system_prompt, user_prompt)
        
        return {"insight": response, "credits_used": result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"AI insight error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/mentor")
async def generate_mentor_insights(data: dict, user: dict = Depends(get_current_user)):
    """Generate AI mentor insights"""
    try:
        # Check and deduct AI credits
        success, result = await deduct_ai_credits(user["user_id"], "mentor_insight")
        if not success:
            raise HTTPException(status_code=402, detail=result)
        
        brand_id = data.get("brand_id")
        brand_name = data.get("brand_name", "Marca")
        industry = data.get("industry", "")
        
        # Fetch brand data
        pillars_data = {}
        for pillar in ['start', 'values', 'purpose', 'positioning', 'personality', 'valuation']:
            pdata = await db[f"pillar_{pillar}"].find_one({"brand_id": brand_id}, {"_id": 0})
            if pdata:
                pillars_data[pillar] = pdata
        
        context_parts = [f"Marca: {brand_name}", f"Setor: {industry}"]
        if 'purpose' in pillars_data:
            context_parts.append(f"Propósito: {pillars_data['purpose'].get('declaracao_proposito', 'N/A')}")
        if 'positioning' in pillars_data:
            context_parts.append(f"Posicionamento: {pillars_data['positioning'].get('declaracao_posicionamento', 'N/A')}")
        if 'personality' in pillars_data:
            context_parts.append(f"Arquétipo: {pillars_data['personality'].get('arquetipo_principal', 'N/A')}")
        if 'values' in pillars_data:
            vals = pillars_data['values'].get('valores_marca', [])
            if vals:
                context_parts.append(f"Valores: {', '.join(vals[:5])}")
        
        context = "\n".join(context_parts)
        
        system_prompt = """Você é um mentor estratégico de marcas com expertise em branding, marketing, finanças e inovação.
        
Analise os dados da marca e forneça insights em 5 categorias:

1. **🎯 Ação Imediata**: Uma ação prática que a marca pode fazer esta semana
2. **📈 Oportunidade de Mercado**: Uma tendência ou oportunidade no setor
3. **💡 Ideia de Produto/Serviço**: Sugestão de novo produto ou serviço alinhado à marca
4. **⚠️ Ponto de Atenção**: Algo que a marca deve monitorar ou evitar
5. **🚀 Visão de Futuro**: Uma recomendação estratégica para os próximos 6 meses

Seja específico, prático e cite exemplos quando possível. Responda em português do Brasil."""

        user_prompt = f"Dados da marca:\n{context}\n\nGere insights de mentor:"
        
        response = await call_llm(system_prompt, user_prompt)
        
        return {"insights": response, "credits_used": result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Mentor error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/brand-way")
async def generate_brand_way_suggestions(data: dict, user: dict = Depends(get_current_user)):
    """Generate AI suggestions for brand way dimensions"""
    try:
        # Check and deduct AI credits
        success, result = await deduct_ai_credits(user["user_id"], "brand_way_suggestion")
        if not success:
            raise HTTPException(status_code=402, detail=result)
        
        dimension = data.get("dimension", "proposito")
        brand_name = data.get("brand_name", "Marca")
        industry = data.get("industry", "")
        
        prompts = {
            "proposito": f"""Analise a marca "{brand_name}" do setor "{industry}" e sugira:
1. Uma declaração de propósito inspiradora (por que a empresa existe além do lucro)
2. O impacto que a marca gera no mundo
3. 3 evidências de como o propósito se manifesta

Retorne em formato JSON:
{{"declaracao": "...", "impacto": "...", "evidencias": ["...", "...", "..."]}}""",

            "valores": f"""Para a marca "{brand_name}" do setor "{industry}", sugira:
5 valores de marca autênticos e diferenciadores, com descrições práticas.

Retorne em formato JSON:
{{"lista": ["Valor1", "Valor2", ...], "descricoes": {{"Valor1": "descrição...", ...}}}}""",

            "personalidade": f"""Se a marca "{brand_name}" fosse uma pessoa, como seria?
Sugira:
1. Arquétipo principal (de Jung)
2. Arquétipo secundário
3. 5 atributos de personalidade

Retorne em formato JSON:
{{"arquetipo_principal": "...", "arquetipo_secundario": "...", "atributos": ["...", ...]}}""",

            "tom_voz": f"""Defina o tom de voz para a marca "{brand_name}" do setor "{industry}":
1. Estilo de comunicação (descrição)
2. 3 exemplos do que a marca FAZ na comunicação
3. 3 exemplos do que a marca NÃO faz

Retorne em formato JSON:
{{"estilo": "...", "exemplos_fazer": ["...", ...], "exemplos_evitar": ["...", ...]}}""",

            "comportamentos": f"""Defina comportamentos para a marca "{brand_name}":
1. 3 comportamentos internos (com colaboradores)
2. 3 comportamentos externos (com clientes)
3. 2 rituais da marca

Retorne em formato JSON:
{{"internos": ["...", ...], "externos": ["...", ...], "rituais": ["...", ...]}}""",

            "promessa": f"""Defina a promessa de marca para "{brand_name}" do setor "{industry}":
1. Declaração de promessa central
2. Entrega funcional (o que o cliente recebe)
3. Entrega emocional (como se sente)
4. Entrega aspiracional (o que pode se tornar)

Retorne em formato JSON:
{{"declaracao": "...", "funcional": "...", "emocional": "...", "aspiracional": "..."}}"""
        }
        
        prompt = prompts.get(dimension, prompts["proposito"])
        system_prompt = "Você é um especialista em branding e estratégia de marca. Responda APENAS em JSON válido, sem markdown ou explicações adicionais. Use português do Brasil."
        
        response = await call_llm(system_prompt, prompt)
        
        # Parse JSON response
        try:
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            suggestions = json.loads(clean_response)
        except json.JSONDecodeError:
            suggestions = {"raw": response}
        
        return {"suggestions": suggestions, "credits_used": result}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Brand way AI error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== BRAND RISK MODULE ====================

@router.get("/brands/{brand_id}/risk-analysis")
async def get_risk_analysis(brand_id: str, user: dict = Depends(get_current_user)):
    """Get brand risk analysis"""
    data = await db.brand_risk.find_one({"brand_id": brand_id}, {"_id": 0})
    return data or {}


@router.post("/brands/{brand_id}/risk-analysis")
async def analyze_brand_risks(brand_id: str, user: dict = Depends(get_current_user)):
    """Analyze brand risks using AI"""
    try:
        # Check and deduct AI credits
        success, result = await deduct_ai_credits(user["user_id"], "risk_analysis")
        if not success:
            raise HTTPException(status_code=402, detail=result)
        
        # Get brand data
        brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
        brand_way = await db.brand_way.find_one({"brand_id": brand_id}, {"_id": 0})
        pillars = {}
        for pillar in ['start', 'values', 'purpose', 'promise', 'positioning', 'personality', 'universality']:
            data = await db[f"pillar_{pillar}"].find_one({"brand_id": brand_id}, {"_id": 0})
            if data:
                pillars[pillar] = data
        
        context = f"""
        Marca: {brand.get('name', 'N/A') if brand else 'N/A'}
        Indústria: {brand.get('industry', 'N/A') if brand else 'N/A'}
        Jeito de Ser: {json.dumps(brand_way, ensure_ascii=False) if brand_way else 'Não definido'}
        Pilares: {json.dumps(pillars, ensure_ascii=False)}
        """
        
        system_prompt = "Você é um analista de risco de marca especializado. Analise os dados e retorne APENAS JSON válido."
        
        prompt = f"""Analise os riscos da marca com base nos dados fornecidos:
        {context}
        
        Retorne um JSON com a seguinte estrutura:
        {{
            "risks": {{
                "reputacional": {{"score": 0-100, "factors": ["fator1", "fator2", "fator3"]}},
                "competitivo": {{"score": 0-100, "factors": ["fator1", "fator2", "fator3"]}},
                "operacional": {{"score": 0-100, "factors": ["fator1", "fator2", "fator3"]}},
                "legal": {{"score": 0-100, "factors": ["fator1", "fator2", "fator3"]}},
                "cultural": {{"score": 0-100, "factors": ["fator1", "fator2", "fator3"]}}
            }},
            "recommendations": ["recomendação1", "recomendação2", "recomendação3", "recomendação4", "recomendação5"]
        }}
        
        Score: 0=sem risco, 100=risco máximo. Seja realista baseado nos dados disponíveis."""
        
        response = await call_llm(system_prompt, prompt)
        
        # Parse response
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        
        risk_data = json.loads(clean_response)
        risk_data["brand_id"] = brand_id
        risk_data["analyzed_at"] = datetime.now(timezone.utc).isoformat()
        risk_data["credits_used"] = result
        
        # Save to DB
        await db.brand_risk.update_one(
            {"brand_id": brand_id},
            {"$set": risk_data},
            upsert=True
        )
        
        return risk_data
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Risk analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CONSISTENCY ALERTS ====================

@router.get("/brands/{brand_id}/consistency-alerts")
async def get_consistency_alerts(brand_id: str, user: dict = Depends(get_current_user)):
    """Get consistency alerts"""
    data = await db.consistency_alerts.find_one({"brand_id": brand_id}, {"_id": 0})
    return data or {}


@router.post("/brands/{brand_id}/consistency-alerts")
async def analyze_consistency(brand_id: str, user: dict = Depends(get_current_user)):
    """Analyze brand consistency using AI"""
    try:
        # Check and deduct AI credits
        success, result = await deduct_ai_credits(user["user_id"], "consistency_analysis")
        if not success:
            raise HTTPException(status_code=402, detail=result)
        
        # Get all brand data
        brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
        brand_way = await db.brand_way.find_one({"brand_id": brand_id}, {"_id": 0})
        
        pillars = {}
        for pillar in ['start', 'values', 'purpose', 'promise', 'positioning', 'personality', 'universality']:
            data = await db[f"pillar_{pillar}"].find_one({"brand_id": brand_id}, {"_id": 0})
            if data:
                pillars[pillar] = data
        
        context = f"""
        Marca: {brand.get('name', 'N/A') if brand else 'N/A'}
        Jeito de Ser: {json.dumps(brand_way, ensure_ascii=False) if brand_way else 'Não definido'}
        Pilares: {json.dumps(pillars, ensure_ascii=False)}
        """
        
        system_prompt = "Você é um especialista em consistência de marca. Analise os dados e identifique inconsistências entre os pilares. Retorne APENAS JSON válido."
        
        prompt = f"""Analise a consistência entre os pilares da marca:
        {context}
        
        Identifique:
        1. Inconsistências graves (type: "error") - contradições diretas entre pilares
        2. Alertas de atenção (type: "warning") - desalinhamentos menores
        3. Pontos consistentes (type: "success") - onde a marca está alinhada
        4. Sugestões de melhoria (type: "info") - oportunidades de fortalecimento
        
        Retorne JSON:
        {{
            "alerts": [
                {{
                    "type": "error|warning|success|info",
                    "title": "Título do alerta",
                    "description": "Descrição detalhada",
                    "suggestion": "Sugestão de correção (opcional)",
                    "pillars": ["pilar1", "pilar2"] (pilares envolvidos, opcional)
                }}
            ]
        }}
        
        Seja específico e construtivo. Mínimo 5 alertas, máximo 12."""
        
        response = await call_llm(system_prompt, prompt)
        
        # Parse response
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        
        alerts_data = json.loads(clean_response)
        alerts_data["brand_id"] = brand_id
        alerts_data["analyzed_at"] = datetime.now(timezone.utc).isoformat()
        alerts_data["credits_used"] = result
        
        # Save to DB
        await db.consistency_alerts.update_one(
            {"brand_id": brand_id},
            {"$set": alerts_data},
            upsert=True
        )
        
        return alerts_data
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Consistency analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
