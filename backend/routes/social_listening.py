"""Social Listening Routes - Real social media monitoring"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
import uuid
import re

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Social Listening"])


# Sentiment keywords for rule-based analysis (Portuguese)
POSITIVE_KEYWORDS = [
    "ótimo", "excelente", "incrível", "maravilhoso", "perfeito", "amei", "adorei",
    "recomendo", "fantástico", "sensacional", "top", "melhor", "parabéns", "sucesso",
    "qualidade", "satisfeito", "feliz", "obrigado", "grato", "eficiente", "rápido"
]

NEGATIVE_KEYWORDS = [
    "péssimo", "horrível", "terrível", "ruim", "pior", "decepcionado", "decepção",
    "problema", "falha", "erro", "demora", "lento", "caro", "fraude", "golpe",
    "reclamação", "insatisfeito", "raiva", "irritado", "nunca mais", "não recomendo"
]

NEUTRAL_KEYWORDS = [
    "ok", "normal", "médio", "razoável", "regular"
]


class SocialMention(BaseModel):
    platform: str  # twitter, instagram, facebook, linkedin, tiktok
    content: str
    author: Optional[str] = None
    url: Optional[str] = None
    engagement: Optional[Dict] = None  # likes, shares, comments
    posted_at: Optional[str] = None


class SocialPlatformConnection(BaseModel):
    platform: str  # instagram, facebook, linkedin, youtube
    credentials: Dict  # Platform-specific credentials

class SocialMonitoringConfig(BaseModel):
    keywords: List[str]
    competitors: Optional[List[str]] = []
    platforms: List[str] = ["instagram", "facebook", "linkedin", "youtube"]
    is_active: bool = True
    
PLATFORM_SETUP_GUIDES = {
    "instagram": {
        "name": "Instagram",
        "fields": [
            {"key": "app_id", "label": "App ID (Meta for Developers)", "type": "text"},
            {"key": "app_secret", "label": "App Secret", "type": "password"},
            {"key": "access_token", "label": "Access Token (Long-lived)", "type": "password"}
        ],
        "steps": [
            "Acesse developers.facebook.com e crie um App do tipo 'Business'",
            "Ative o produto 'Instagram Graph API' no seu App",
            "Em Configurações > Básico, copie o App ID e o App Secret",
            "Gere um token de acesso de longa duração em Ferramentas > Graph API Explorer",
            "Cole os dados nos campos abaixo"
        ],
        "doc_url": "https://developers.facebook.com/docs/instagram-api/getting-started"
    },
    "facebook": {
        "name": "Facebook",
        "fields": [
            {"key": "app_id", "label": "App ID (Meta for Developers)", "type": "text"},
            {"key": "app_secret", "label": "App Secret", "type": "password"},
            {"key": "page_access_token", "label": "Page Access Token", "type": "password"}
        ],
        "steps": [
            "Acesse developers.facebook.com e crie um App do tipo 'Business'",
            "Ative o produto 'Pages API' no seu App",
            "Em Configurações > Básico, copie o App ID e o App Secret",
            "Gere um Page Access Token em Ferramentas > Graph API Explorer (selecione a Page)",
            "Cole os dados nos campos abaixo"
        ],
        "doc_url": "https://developers.facebook.com/docs/pages-api/getting-started"
    },
    "linkedin": {
        "name": "LinkedIn",
        "fields": [
            {"key": "client_id", "label": "Client ID", "type": "text"},
            {"key": "client_secret", "label": "Client Secret", "type": "password"},
            {"key": "access_token", "label": "Access Token", "type": "password"}
        ],
        "steps": [
            "Acesse linkedin.com/developers e crie um novo App",
            "Em Auth, copie o Client ID e o Client Secret",
            "Solicite as permissões: r_organization_social, rw_organization_admin",
            "Gere um Access Token usando o fluxo OAuth 2.0",
            "Cole os dados nos campos abaixo"
        ],
        "doc_url": "https://learn.microsoft.com/en-us/linkedin/marketing/getting-started"
    },
    "youtube": {
        "name": "YouTube",
        "fields": [
            {"key": "api_key", "label": "API Key (Google Cloud)", "type": "password"},
            {"key": "channel_id", "label": "Channel ID", "type": "text"}
        ],
        "steps": [
            "Acesse console.cloud.google.com e crie um projeto",
            "Ative a 'YouTube Data API v3' na biblioteca de APIs",
            "Em Credenciais, crie uma API Key",
            "Encontre seu Channel ID em youtube.com/account_advanced",
            "Cole os dados nos campos abaixo"
        ],
        "doc_url": "https://developers.google.com/youtube/v3/getting-started"
    },
    "tiktok": {
        "name": "TikTok",
        "fields": [
            {"key": "access_token", "label": "Access Token (TikTok for Developers)", "type": "password"}
        ],
        "steps": [
            "Acesse developers.tiktok.com e crie um App",
            "Solicite permissões: user.info.basic, video.list",
            "Gere um Access Token via fluxo OAuth",
            "Cole o token abaixo"
        ],
        "doc_url": "https://developers.tiktok.com/doc/getting-started"
    }
}


@router.get("/brands/{brand_id}/social-listening/platforms")
async def get_platform_guides(brand_id: str, user: dict = Depends(get_current_user)):
    """Get platform setup guides and connection status"""
    connections = await db.social_connections.find(
        {"brand_id": brand_id}, {"_id": 0, "credentials": 0}
    ).to_list(10)
    
    connected_map = {c["platform"]: c for c in connections}
    
    platforms = []
    for platform_id, guide in PLATFORM_SETUP_GUIDES.items():
        conn = connected_map.get(platform_id)
        platforms.append({
            "id": platform_id,
            "name": guide["name"],
            "fields": guide["fields"],
            "steps": guide["steps"],
            "doc_url": guide["doc_url"],
            "connected": conn is not None,
            "connected_at": conn.get("connected_at") if conn else None,
            "status": conn.get("status", "disconnected") if conn else "disconnected"
        })
    
    return {"platforms": platforms, "total_connected": len(connections)}


@router.post("/brands/{brand_id}/social-listening/connect")
async def connect_social_platform(brand_id: str, data: SocialPlatformConnection, user: dict = Depends(get_current_user)):
    """Save social platform credentials"""
    if data.platform not in PLATFORM_SETUP_GUIDES:
        raise HTTPException(status_code=400, detail=f"Plataforma inválida: {data.platform}")
    
    guide = PLATFORM_SETUP_GUIDES[data.platform]
    required_keys = [f["key"] for f in guide["fields"]]
    missing = [k for k in required_keys if not data.credentials.get(k)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Campos obrigatórios: {', '.join(missing)}")
    
    connection_doc = {
        "brand_id": brand_id,
        "platform": data.platform,
        "credentials": data.credentials,
        "status": "connected",
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "connected_by": user["user_id"]
    }
    
    await db.social_connections.update_one(
        {"brand_id": brand_id, "platform": data.platform},
        {"$set": connection_doc},
        upsert=True
    )
    
    return {
        "success": True,
        "platform": data.platform,
        "message": f"{guide['name']} conectado com sucesso!"
    }


@router.delete("/brands/{brand_id}/social-listening/disconnect/{platform}")
async def disconnect_social_platform(brand_id: str, platform: str, user: dict = Depends(get_current_user)):
    """Disconnect a social platform"""
    result = await db.social_connections.delete_one({"brand_id": brand_id, "platform": platform})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conexão não encontrada")
    return {"success": True, "message": f"Plataforma desconectada"}


@router.get("/brands/{brand_id}/social-listening/config")
async def get_social_config(brand_id: str, user: dict = Depends(get_current_user)):
    """Get social listening configuration for a brand"""
    config = await db.social_config.find_one({"brand_id": brand_id}, {"_id": 0})
    
    if not config:
        # Get brand name for default keywords
        brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0, "name": 1})
        brand_name = brand.get("name", "") if brand else ""
        
        return {
            "config": {
                "keywords": [brand_name] if brand_name else [],
                "competitors": [],
                "platforms": ["twitter", "instagram", "facebook"],
                "is_active": False
            },
            "configured": False
        }
    
    return {"config": config, "configured": True}


@router.post("/brands/{brand_id}/social-listening/config")
async def save_social_config(brand_id: str, data: SocialMonitoringConfig, user: dict = Depends(get_current_user)):
    """Save social listening configuration"""
    config_doc = {
        "brand_id": brand_id,
        "keywords": data.keywords,
        "competitors": data.competitors,
        "platforms": data.platforms,
        "is_active": data.is_active,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["user_id"]
    }
    
    await db.social_config.update_one(
        {"brand_id": brand_id},
        {"$set": config_doc},
        upsert=True
    )
    
    return {"success": True, "config": config_doc}


@router.post("/brands/{brand_id}/social-listening/mentions")
async def add_social_mention(brand_id: str, data: SocialMention, user: dict = Depends(get_current_user)):
    """Add a social mention (manual or from integration)"""
    # Analyze sentiment using rule-based approach
    sentiment = analyze_sentiment(data.content)
    
    mention_doc = {
        "mention_id": f"mention_{uuid.uuid4().hex[:12]}",
        "brand_id": brand_id,
        "platform": data.platform,
        "content": data.content,
        "author": data.author,
        "url": data.url,
        "engagement": data.engagement or {"likes": 0, "shares": 0, "comments": 0},
        "sentiment": sentiment,
        "posted_at": data.posted_at or datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "manual"
    }
    
    await db.social_mentions.insert_one(mention_doc)
    
    return {"success": True, "mention": {k: v for k, v in mention_doc.items() if k != "_id"}}


@router.get("/brands/{brand_id}/social-listening/mentions")
async def get_social_mentions(
    brand_id: str, 
    platform: Optional[str] = None,
    sentiment: Optional[str] = None,
    days: int = 30,
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    """Get social mentions for a brand"""
    query = {"brand_id": brand_id}
    
    if platform:
        query["platform"] = platform
    if sentiment:
        query["sentiment.label"] = sentiment
    
    # Date filter
    since = datetime.now(timezone.utc) - timedelta(days=days)
    query["created_at"] = {"$gte": since.isoformat()}
    
    mentions = await db.social_mentions.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return {"mentions": mentions, "total": len(mentions)}


@router.get("/brands/{brand_id}/social-listening/dashboard")
async def get_social_dashboard(brand_id: str, days: int = 30, user: dict = Depends(get_current_user)):
    """Get social listening dashboard with aggregated metrics"""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Get all mentions
    mentions = await db.social_mentions.find(
        {"brand_id": brand_id, "created_at": {"$gte": since.isoformat()}},
        {"_id": 0}
    ).to_list(1000)
    
    # Check if integrations are connected
    integrations = await db.integrations.find(
        {"brand_id": brand_id, "category": "social", "status": "connected"},
        {"_id": 0}
    ).to_list(10)
    
    if not mentions:
        # Return empty state - no mock data
        return {
            "summary": {
                "total_mentions": 0,
                "sentiment_score": 0,
                "total_engagement": 0,
                "positive_pct": 0,
                "negative_pct": 0,
                "neutral_pct": 0
            },
            "by_platform": {},
            "trend": [],
            "top_mentions": [],
            "alerts": [],
            "has_data": False,
            "integrations_connected": len(integrations),
            "message": "Nenhuma menção encontrada. Conecte suas redes sociais em Integrações para começar a monitorar."
        }
    
    # Aggregate by platform
    by_platform = {}
    for m in mentions:
        platform = m.get("platform", "other")
        if platform not in by_platform:
            by_platform[platform] = {"count": 0, "engagement": 0, "positive": 0, "negative": 0, "neutral": 0}
        by_platform[platform]["count"] += 1
        by_platform[platform]["engagement"] += sum((m.get("engagement") or {}).values())
        sentiment_label = m.get("sentiment", {}).get("label", "neutral")
        by_platform[platform][sentiment_label] += 1
    
    # Overall sentiment
    total = len(mentions)
    positive = sum(1 for m in mentions if m.get("sentiment", {}).get("label") == "positive")
    negative = sum(1 for m in mentions if m.get("sentiment", {}).get("label") == "negative")
    neutral = total - positive - negative
    
    # Total engagement
    total_engagement = sum(sum((m.get("engagement") or {}).values()) for m in mentions)
    
    # Sentiment trend (by day)
    trend = {}
    for m in mentions:
        date = m.get("created_at", "")[:10]
        if date not in trend:
            trend[date] = {"positive": 0, "negative": 0, "neutral": 0, "total": 0}
        trend[date][m.get("sentiment", {}).get("label", "neutral")] += 1
        trend[date]["total"] += 1
    
    # Top mentions by engagement
    sorted_mentions = sorted(mentions, key=lambda x: sum((x.get("engagement") or {}).values()), reverse=True)
    top_mentions = sorted_mentions[:5]
    
    # Calculate sentiment score (0-100)
    sentiment_score = 50  # Neutral baseline
    if total > 0:
        sentiment_score = int(((positive * 100) + (neutral * 50) + (negative * 0)) / total)
    
    return {
        "summary": {
            "total_mentions": total,
            "total_engagement": total_engagement,
            "sentiment_score": sentiment_score,
            "positive_pct": round(positive / total * 100, 1) if total > 0 else 0,
            "negative_pct": round(negative / total * 100, 1) if total > 0 else 0,
            "neutral_pct": round(neutral / total * 100, 1) if total > 0 else 0
        },
        "by_platform": by_platform,
        "trend": dict(sorted(trend.items())),
        "top_mentions": top_mentions,
        "period_days": days,
        "has_data": True,
        "integrations_connected": len(integrations) if 'integrations' in dir() else 0
    }


@router.get("/brands/{brand_id}/social-listening/alerts")
async def get_social_alerts(brand_id: str, user: dict = Depends(get_current_user)):
    """Get alerts based on social listening data"""
    dashboard = await get_social_dashboard(brand_id, 7, user)
    
    alerts = []
    summary = dashboard.get("summary", {})
    
    # Check for negative sentiment spike
    if summary.get("negative_pct", 0) > 30:
        alerts.append({
            "type": "critical",
            "title": "Alta taxa de menções negativas",
            "message": f"{summary['negative_pct']}% das menções são negativas nos últimos 7 dias",
            "action": "Revise as menções negativas e responda rapidamente"
        })
    
    # Check for low engagement
    if summary.get("total_mentions", 0) < 10:
        alerts.append({
            "type": "warning",
            "title": "Baixo volume de menções",
            "message": "Poucas menções detectadas. Considere aumentar a presença nas redes",
            "action": "Amplie as palavras-chave monitoradas ou invista em conteúdo"
        })
    
    # Check for positive trend
    if summary.get("positive_pct", 0) > 60:
        alerts.append({
            "type": "success",
            "title": "Sentimento positivo alto",
            "message": f"{summary['positive_pct']}% das menções são positivas!",
            "action": "Aproveite para destacar depoimentos e cases de sucesso"
        })
    
    return {"alerts": alerts, "total": len(alerts)}


def analyze_sentiment(text: str) -> dict:
    """Rule-based sentiment analysis"""
    text_lower = text.lower()
    
    positive_count = sum(1 for word in POSITIVE_KEYWORDS if word in text_lower)
    negative_count = sum(1 for word in NEGATIVE_KEYWORDS if word in text_lower)
    
    if positive_count > negative_count:
        return {"label": "positive", "score": min(0.9, 0.5 + (positive_count * 0.1)), "confidence": "rule_based"}
    elif negative_count > positive_count:
        return {"label": "negative", "score": max(0.1, 0.5 - (negative_count * 0.1)), "confidence": "rule_based"}
    else:
        return {"label": "neutral", "score": 0.5, "confidence": "rule_based"}


@router.get("/brands/{brand_id}/social-listening/clear-mock-data")
async def clear_mock_data(brand_id: str):
    """Clear all sample/mock data from social listening - GET for browser access"""
    # Delete ALL mentions for this brand (since they are all mock)
    result = await db.social_mentions.delete_many({"brand_id": brand_id})
    
    return {
        "success": True,
        "deleted": result.deleted_count,
        "message": f"Removidas {result.deleted_count} menções"
    }

