"""Brand Health Routes - Consolidated health dashboard"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List
from datetime import datetime, timezone

from config import db
from utils.helpers import get_current_user
from services.brand_data_service import get_brand_metrics, calculate_brand_health

router = APIRouter(tags=["Brand Health"])


@router.get("/brands/{brand_id}/brand-health")
async def get_brand_health_dashboard(brand_id: str, user: dict = Depends(get_current_user)):
    """Get consolidated brand health dashboard with all metrics"""
    
    # Get brand info
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    # Calculate health from all sources
    health_data = await calculate_brand_health(brand_id)
    metrics = health_data["metrics"]
    
    # Determine status level
    health_score = health_data["health_score"]
    if health_score >= 80:
        level = {"name": "Excelente", "color": "#22c55e", "status": "excellent"}
    elif health_score >= 60:
        level = {"name": "Bom", "color": "#3b82f6", "status": "good"}
    elif health_score >= 40:
        level = {"name": "Em Desenvolvimento", "color": "#f59e0b", "status": "developing"}
    else:
        level = {"name": "Atenção", "color": "#ef4444", "status": "attention"}
    
    # Build response with summaries for each module
    return {
        "brand_id": brand_id,
        "brand_name": brand.get("name"),
        "health_score": health_score,
        "level": level,
        "modules": {
            "brand_tracking": {
                "score": metrics["pillars"]["completion_pct"],
                "title": "Brand Score",
                "subtitle": f"{metrics['pillars']['completed']}/{metrics['pillars']['total']} pilares completos",
                "has_data": metrics["pillars"]["completed"] > 0,
                "link": "/brand-tracking"
            },
            "value_waves": {
                "score": round((metrics["value_waves"]["brand_score"] + metrics["value_waves"]["business_score"] + metrics["value_waves"]["communication_score"]) / 3) if metrics["value_waves"]["assessed"] else 0,
                "title": "Ondas de Valor",
                "subtitle": "Avaliação de dimensões estratégicas",
                "has_data": metrics["value_waves"]["assessed"],
                "link": "/value-waves"
            },
            "brand_funnel": {
                "score": metrics["funnel"]["health_score"],
                "title": "Saúde do Funil",
                "subtitle": "Taxa de conversão e retenção",
                "has_data": metrics["funnel"]["assessed"],
                "link": "/brand-funnel"
            },
            "social_listening": {
                "score": metrics["social"]["sentiment_score"],
                "title": "Sentimento Social",
                "subtitle": f"{metrics['social']['mentions_30d']} menções nos últimos 30 dias",
                "has_data": metrics["social"]["has_data"],
                "link": "/social-listening"
            },
            "crm": {
                "score": min(100, metrics["crm"]["contacts"] * 2) if metrics["crm"]["contacts"] > 0 else 0,
                "title": "CRM",
                "subtitle": f"{metrics['crm']['contacts']} contatos sincronizados",
                "has_data": metrics["crm"]["has_data"],
                "link": "/crm-integration"
            },
            "ads": {
                "score": min(100, (metrics["ads"]["impressions"] / 1000)) if metrics["ads"]["impressions"] > 0 else 0,
                "title": "Ads Performance",
                "subtitle": f"{metrics['ads']['impressions']:,} impressões" if metrics["ads"]["impressions"] > 0 else "Nenhuma campanha",
                "has_data": metrics["ads"]["has_data"],
                "link": "/ads-integration"
            }
        },
        "alerts": generate_health_alerts(metrics),
        "quick_actions": generate_quick_actions(metrics),
        "data_completeness": {
            "pillars": metrics["pillars"]["completed"] > 0,
            "touchpoints": metrics["touchpoints"]["count"] > 0,
            "maturity": metrics["maturity"]["assessed"],
            "value_waves": metrics["value_waves"]["assessed"],
            "funnel": metrics["funnel"]["assessed"],
            "social": metrics["social"]["has_data"],
            "crm": metrics["crm"]["has_data"],
            "ads": metrics["ads"]["has_data"]
        },
        "last_updated": datetime.now(timezone.utc).isoformat()
    }


@router.get("/brands/{brand_id}/brand-health/summary")
async def get_brand_health_summary(brand_id: str, user: dict = Depends(get_current_user)):
    """Get a quick summary of brand health for dashboard widgets"""
    
    metrics = await get_brand_metrics(brand_id)
    health_data = await calculate_brand_health(brand_id)
    
    return {
        "health_score": health_data["health_score"],
        "pillar_completion": metrics["pillars"]["completion_pct"],
        "sentiment_score": metrics["social"]["sentiment_score"],
        "funnel_health": metrics["funnel"]["health_score"],
        "active_integrations": metrics["crm"]["integrations_connected"] + metrics["ads"]["integrations_connected"]
    }


def generate_health_alerts(metrics: Dict) -> List[Dict]:
    """Generate alerts based on brand health metrics"""
    alerts = []
    
    # Pillar alerts
    if metrics["pillars"]["completion_pct"] < 50:
        alerts.append({
            "type": "warning",
            "icon": "target",
            "title": "Pilares incompletos",
            "message": f"Complete os pilares de marca ({metrics['pillars']['completed']}/{metrics['pillars']['total']})",
            "action": "Ir para Pilares",
            "link": "/pillars/start"
        })
    
    # Value waves alert
    if not metrics["value_waves"]["assessed"]:
        alerts.append({
            "type": "info",
            "icon": "waves",
            "title": "Avalie suas Ondas de Valor",
            "message": "Complete a avaliação para ter uma visão completa",
            "action": "Iniciar Avaliação",
            "link": "/value-waves"
        })
    
    # Funnel alert
    if not metrics["funnel"]["assessed"]:
        alerts.append({
            "type": "info",
            "icon": "funnel",
            "title": "Dados do Funil Estimados",
            "message": "Atualize com dados reais para análises precisas",
            "action": "Atualizar Funil",
            "link": "/brand-funnel"
        })
    
    # Social sentiment alert
    if metrics["social"]["has_data"] and metrics["social"]["sentiment_score"] < 50:
        alerts.append({
            "type": "critical",
            "icon": "alert-triangle",
            "title": "Sentimento negativo detectado",
            "message": f"Score de sentimento: {metrics['social']['sentiment_score']}%",
            "action": "Ver Menções",
            "link": "/social-listening"
        })
    
    # Integration alerts
    if metrics["crm"]["integrations_connected"] == 0 and metrics["ads"]["integrations_connected"] == 0:
        alerts.append({
            "type": "info",
            "icon": "plug",
            "title": "Conecte suas integrações",
            "message": "Sincronize CRM e Ads para dados completos",
            "action": "Configurar",
            "link": "/integrations"
        })
    
    return alerts


def generate_quick_actions(metrics: Dict) -> List[Dict]:
    """Generate quick action suggestions based on current state"""
    actions = []
    
    if metrics["pillars"]["completion_pct"] < 100:
        actions.append({
            "title": "Completar Pilares",
            "description": f"{metrics['pillars']['total'] - metrics['pillars']['completed']} pilares restantes",
            "priority": "high",
            "link": "/pillars/start"
        })
    
    if not metrics["maturity"]["assessed"]:
        actions.append({
            "title": "Diagnóstico de Maturidade",
            "description": "Avalie a maturidade organizacional",
            "priority": "medium",
            "link": "/maturity-diagnosis"
        })
    
    if metrics["touchpoints"]["count"] < 5:
        actions.append({
            "title": "Mapear Touchpoints",
            "description": "Identifique pontos de contato com o cliente",
            "priority": "medium",
            "link": "/touchpoints"
        })
    
    if not metrics["value_waves"]["assessed"]:
        actions.append({
            "title": "Avaliar Ondas de Valor",
            "description": "Framework de gestão estratégica",
            "priority": "medium",
            "link": "/value-waves"
        })
    
    return actions[:4]  # Max 4 actions
