"""Conversion Attributes Analysis - Which brand attributes drive conversions"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Conversion Attributes"])


# Default brand attributes to analyze
DEFAULT_ATTRIBUTES = [
    {"id": "quality", "name": "Qualidade", "category": "product"},
    {"id": "price", "name": "Preço", "category": "product"},
    {"id": "innovation", "name": "Inovação", "category": "product"},
    {"id": "design", "name": "Design", "category": "product"},
    {"id": "trust", "name": "Confiança", "category": "brand"},
    {"id": "reputation", "name": "Reputação", "category": "brand"},
    {"id": "sustainability", "name": "Sustentabilidade", "category": "brand"},
    {"id": "customer_service", "name": "Atendimento", "category": "experience"},
    {"id": "convenience", "name": "Conveniência", "category": "experience"},
    {"id": "delivery", "name": "Entrega", "category": "experience"},
    {"id": "community", "name": "Comunidade", "category": "social"},
    {"id": "status", "name": "Status", "category": "social"}
]


class AttributeRating(BaseModel):
    attribute_id: str
    importance: int  # 1-5 how important this attribute is for purchase decision
    performance: int  # 1-5 how well the brand performs on this attribute


class AttributesSurvey(BaseModel):
    ratings: List[AttributeRating]
    converted: bool  # Did this respondent convert/purchase?
    respondent_type: str = "customer"  # customer, lead, churned


@router.get("/conversion-attributes/attributes")
async def get_attribute_list():
    """Get list of attributes for analysis"""
    return {
        "attributes": DEFAULT_ATTRIBUTES,
        "categories": [
            {"id": "product", "name": "Produto"},
            {"id": "brand", "name": "Marca"},
            {"id": "experience", "name": "Experiência"},
            {"id": "social", "name": "Social"}
        ]
    }


@router.post("/brands/{brand_id}/conversion-attributes/survey")
async def submit_attribute_survey(brand_id: str, data: AttributesSurvey, user: dict = Depends(get_current_user)):
    """Submit an attribute importance/performance survey"""
    survey_doc = {
        "survey_id": f"survey_{uuid.uuid4().hex[:12]}",
        "brand_id": brand_id,
        "ratings": [r.dict() for r in data.ratings],
        "converted": data.converted,
        "respondent_type": data.respondent_type,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "submitted_by": user["user_id"]
    }
    
    await db.attribute_surveys.insert_one(survey_doc)
    
    return {"success": True, "survey_id": survey_doc["survey_id"]}


@router.get("/brands/{brand_id}/conversion-attributes/analysis")
async def get_attributes_analysis(brand_id: str, user: dict = Depends(get_current_user)):
    """Get conversion attributes analysis"""
    
    # Get all surveys for the brand
    surveys = await db.attribute_surveys.find({"brand_id": brand_id}, {"_id": 0}).to_list(500)
    
    if not surveys or len(surveys) < 5:
        # Return empty state - no sample data
        return {
            "attributes": [],
            "top_conversion_drivers": [],
            "weaknesses": [],
            "recommendations": [],
            "total_surveys": len(surveys),
            "conversion_rate": 0,
            "has_data": False,
            "message": "Dados insuficientes. São necessárias pelo menos 5 pesquisas de atributos para gerar a análise."
        }
    
    # Separate converted vs non-converted
    converted_surveys = [s for s in surveys if s.get("converted")]
    non_converted_surveys = [s for s in surveys if not s.get("converted")]
    
    # Analyze each attribute
    attributes_analysis = []
    
    for attr in DEFAULT_ATTRIBUTES:
        attr_id = attr["id"]
        
        # Calculate averages for converted customers
        conv_importance = []
        conv_performance = []
        non_conv_importance = []
        non_conv_performance = []
        
        for survey in converted_surveys:
            for rating in survey.get("ratings", []):
                if rating["attribute_id"] == attr_id:
                    conv_importance.append(rating["importance"])
                    conv_performance.append(rating["performance"])
        
        for survey in non_converted_surveys:
            for rating in survey.get("ratings", []):
                if rating["attribute_id"] == attr_id:
                    non_conv_importance.append(rating["importance"])
                    non_conv_performance.append(rating["performance"])
        
        avg_conv_importance = sum(conv_importance) / len(conv_importance) if conv_importance else 0
        avg_conv_performance = sum(conv_performance) / len(conv_performance) if conv_performance else 0
        avg_non_conv_importance = sum(non_conv_importance) / len(non_conv_importance) if non_conv_importance else 0
        avg_non_conv_performance = sum(non_conv_performance) / len(non_conv_performance) if non_conv_performance else 0
        
        # Calculate conversion impact score
        # Higher importance among converted + Higher performance gap = Higher impact
        importance_diff = avg_conv_importance - avg_non_conv_importance
        performance_impact = avg_conv_performance - avg_non_conv_performance
        
        conversion_impact = round((avg_conv_importance * 0.6 + importance_diff * 0.2 + performance_impact * 0.2) * 20, 1)
        conversion_impact = max(0, min(100, conversion_impact))  # Clamp to 0-100
        
        attributes_analysis.append({
            "attribute": attr,
            "converted": {
                "avg_importance": round(avg_conv_importance, 2),
                "avg_performance": round(avg_conv_performance, 2)
            },
            "non_converted": {
                "avg_importance": round(avg_non_conv_importance, 2),
                "avg_performance": round(avg_non_conv_performance, 2)
            },
            "conversion_impact": conversion_impact,
            "gap": round(avg_conv_performance - avg_non_conv_performance, 2),
            "quadrant": get_quadrant(avg_conv_importance, avg_conv_performance)
        })
    
    # Sort by conversion impact
    attributes_analysis.sort(key=lambda x: x["conversion_impact"], reverse=True)
    
    # Top drivers and weaknesses
    top_drivers = [a for a in attributes_analysis if a["conversion_impact"] >= 60][:5]
    weaknesses = [a for a in attributes_analysis if a["converted"]["avg_performance"] < 3 and a["converted"]["avg_importance"] >= 4]
    
    # Generate recommendations
    recommendations = generate_attribute_recommendations(attributes_analysis)
    
    return {
        "attributes": attributes_analysis,
        "top_conversion_drivers": top_drivers,
        "weaknesses": weaknesses,
        "recommendations": recommendations,
        "total_surveys": len(surveys),
        "conversion_rate": round(len(converted_surveys) / len(surveys) * 100, 1) if surveys else 0
    }


@router.get("/brands/{brand_id}/conversion-attributes/matrix")
async def get_importance_performance_matrix(brand_id: str, user: dict = Depends(get_current_user)):
    """Get Importance-Performance matrix for strategic decisions"""
    analysis = await get_attributes_analysis(brand_id, user)
    
    # Handle empty state
    if analysis.get("has_data") == False:
        return {
            "quadrants": {"concentrate": [], "keep_up": [], "low_priority": [], "possible_overkill": []},
            "priority_actions": [],
            "has_data": False
        }
    
    quadrants = {
        "concentrate": [],  # High importance, Low performance - FOCUS HERE
        "keep_up": [],      # High importance, High performance - MAINTAIN
        "low_priority": [], # Low importance, Low performance - DON'T INVEST
        "possible_overkill": []  # Low importance, High performance - REDUCE INVESTMENT?
    }
    
    for attr in analysis["attributes"]:
        quadrant = attr["quadrant"]
        if quadrant in quadrants:
            quadrants[quadrant].append({
                "name": attr["attribute"]["name"],
                "importance": attr["converted"]["avg_importance"],
                "performance": attr["converted"]["avg_performance"],
                "impact": attr["conversion_impact"]
            })
    
    return {
        "quadrants": quadrants,
        "priority_actions": [
            {
                "priority": "high",
                "action": "Melhorar urgentemente",
                "attributes": [a["name"] for a in quadrants["concentrate"][:3]]
            },
            {
                "priority": "medium", 
                "action": "Manter e otimizar",
                "attributes": [a["name"] for a in quadrants["keep_up"][:3]]
            }
        ]
    }


def get_quadrant(importance: float, performance: float) -> str:
    """Determine which quadrant an attribute falls into"""
    high_importance = importance >= 3.5
    high_performance = performance >= 3.5
    
    if high_importance and high_performance:
        return "keep_up"
    elif high_importance and not high_performance:
        return "concentrate"
    elif not high_importance and high_performance:
        return "possible_overkill"
    else:
        return "low_priority"


def generate_attribute_recommendations(analysis: List[dict]) -> List[dict]:
    """Generate strategic recommendations based on attribute analysis"""
    recommendations = []
    
    # Find attributes that need improvement
    for attr in analysis:
        if attr["quadrant"] == "concentrate":
            recommendations.append({
                "type": "critical",
                "attribute": attr["attribute"]["name"],
                "message": f"{attr['attribute']['name']} é muito importante mas tem baixa performance",
                "action": f"Invista em melhorar {attr['attribute']['name'].lower()} - alto impacto na conversão"
            })
        elif attr["quadrant"] == "possible_overkill" and attr["conversion_impact"] < 40:
            recommendations.append({
                "type": "info",
                "attribute": attr["attribute"]["name"],
                "message": f"{attr['attribute']['name']} tem alta performance mas baixo impacto na conversão",
                "action": "Considere realocar recursos para atributos mais importantes"
            })
    
    # Limit recommendations
    return recommendations[:5]


    # generate_sample_surveys removed - no mock data
