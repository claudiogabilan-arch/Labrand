"""Ads Integration Routes - Real APIs (Meta Ads, Google Ads)"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import httpx
import logging

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Ads"])
logger = logging.getLogger(__name__)

ADS_PROVIDERS = {
    "meta": {
        "name": "Meta Ads",
        "description": "Facebook & Instagram Ads",
        "auth_type": "access_token",
        "fields": ["access_token", "account_id"],
        "base_url": "https://graph.facebook.com/v18.0",
        "docs": "https://developers.facebook.com/docs/marketing-apis/"
    },
    "google": {
        "name": "Google Ads",
        "description": "Search, Display & YouTube Ads",
        "auth_type": "oauth",
        "fields": ["client_id", "client_secret", "refresh_token", "customer_id", "developer_token"],
        "base_url": "https://googleads.googleapis.com/v14",
        "docs": "https://developers.google.com/google-ads/api/docs/start"
    }
}

class AdsConfig(BaseModel):
    provider: str
    access_token: Optional[str] = None
    account_id: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    refresh_token: Optional[str] = None
    customer_id: Optional[str] = None
    developer_token: Optional[str] = None

@router.get("/brands/{brand_id}/ads/providers")
async def get_ads_providers(brand_id: str, user: dict = Depends(get_current_user)):
    """Get available ads providers with connection status"""
    integrations = await db.ads_integrations.find({"brand_id": brand_id}, {"_id": 0, "access_token": 0, "client_secret": 0, "refresh_token": 0}).to_list(10)
    
    providers = []
    for key, config in ADS_PROVIDERS.items():
        integration = next((i for i in integrations if i.get("provider") == key), None)
        providers.append({
            "id": key,
            "name": config["name"],
            "description": config["description"],
            "auth_type": config["auth_type"],
            "required_fields": config["fields"],
            "connected": bool(integration and integration.get("connected")),
            "last_sync": integration.get("last_sync") if integration else None,
            "docs_url": config["docs"],
            "metrics": ["impressions", "clicks", "spend", "ctr", "cpc", "conversions", "roas"]
        })
    
    return {"providers": providers, "integrations": integrations}

@router.post("/brands/{brand_id}/ads/connect")
async def connect_ads(brand_id: str, config: AdsConfig, user: dict = Depends(get_current_user)):
    """Connect an ads provider with user credentials"""
    if config.provider not in ADS_PROVIDERS:
        raise HTTPException(status_code=400, detail="Provedor de Ads inválido")
    
    provider_config = ADS_PROVIDERS[config.provider]
    
    # Validate required fields
    if config.provider == "meta":
        if not config.access_token or not config.account_id:
            raise HTTPException(status_code=400, detail="Access Token e Account ID são obrigatórios para Meta Ads")
    elif config.provider == "google":
        if not all([config.client_id, config.client_secret, config.refresh_token, config.customer_id]):
            raise HTTPException(status_code=400, detail="Todos os campos são obrigatórios para Google Ads")
    
    # Test connection
    is_valid = await test_ads_connection(config)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Não foi possível conectar. Verifique suas credenciais.")
    
    integration_doc = {
        "brand_id": brand_id,
        "provider": config.provider,
        "provider_name": provider_config["name"],
        "access_token": config.access_token,
        "account_id": config.account_id,
        "client_id": config.client_id,
        "client_secret": config.client_secret,
        "refresh_token": config.refresh_token,
        "customer_id": config.customer_id,
        "developer_token": config.developer_token,
        "connected": True,
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "last_sync": None,
        "connected_by": user["user_id"]
    }
    
    await db.ads_integrations.update_one(
        {"brand_id": brand_id, "provider": config.provider},
        {"$set": integration_doc},
        upsert=True
    )
    
    return {"success": True, "message": f"{provider_config['name']} conectado com sucesso!"}

async def test_ads_connection(config: AdsConfig) -> bool:
    """Test if ads credentials are valid"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if config.provider == "meta":
                # Test Meta Ads API
                response = await client.get(
                    f"https://graph.facebook.com/v18.0/act_{config.account_id}",
                    params={"access_token": config.access_token, "fields": "name,account_status"}
                )
                return response.status_code == 200
            
            elif config.provider == "google":
                # For Google Ads, we'd need to get an access token first
                # This is a simplified check
                token_response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "client_id": config.client_id,
                        "client_secret": config.client_secret,
                        "refresh_token": config.refresh_token,
                        "grant_type": "refresh_token"
                    }
                )
                return token_response.status_code == 200
        
        return False
    except Exception as e:
        logger.error(f"Ads connection test failed: {e}")
        return False

@router.delete("/brands/{brand_id}/ads/{provider}")
async def disconnect_ads(brand_id: str, provider: str, user: dict = Depends(get_current_user)):
    """Disconnect an ads provider"""
    await db.ads_integrations.delete_one({"brand_id": brand_id, "provider": provider})
    await db.ads_metrics.delete_many({"brand_id": brand_id, "provider": provider})
    return {"success": True, "message": "Ads desconectado"}

@router.post("/brands/{brand_id}/ads/{provider}/sync")
async def sync_ads_data(brand_id: str, provider: str, days: int = 30, user: dict = Depends(get_current_user)):
    """Sync ads metrics from connected provider"""
    integration = await db.ads_integrations.find_one({"brand_id": brand_id, "provider": provider})
    if not integration:
        raise HTTPException(status_code=400, detail="Provider não conectado")
    
    metrics_list = []
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            if provider == "meta":
                metrics_list = await fetch_meta_ads_metrics(client, integration, days)
            elif provider == "google":
                metrics_list = await fetch_google_ads_metrics(client, integration, days)
    except Exception as e:
        logger.error(f"Ads sync failed: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao sincronizar: {str(e)}")
    
    if metrics_list:
        await db.ads_metrics.update_one(
            {"brand_id": brand_id, "provider": provider},
            {"$set": {
                "brand_id": brand_id,
                "provider": provider,
                "metrics": metrics_list,
                "last_sync": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        await db.ads_integrations.update_one(
            {"brand_id": brand_id, "provider": provider},
            {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {
        "success": True,
        "synced_days": len(metrics_list),
        "message": f"Métricas dos últimos {len(metrics_list)} dias sincronizadas"
    }

async def fetch_meta_ads_metrics(client: httpx.AsyncClient, integration: dict, days: int) -> List[dict]:
    """Fetch metrics from Meta Ads API"""
    metrics_list = []
    account_id = integration.get("account_id", "").replace("act_", "")
    access_token = integration.get("access_token", "")
    
    today = datetime.now(timezone.utc)
    since = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    until = today.strftime("%Y-%m-%d")
    
    response = await client.get(
        f"https://graph.facebook.com/v18.0/act_{account_id}/insights",
        params={
            "access_token": access_token,
            "time_range": f'{{"since":"{since}","until":"{until}"}}',
            "time_increment": 1,
            "fields": "date_start,impressions,clicks,spend,ctr,cpc,actions,action_values"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        for day_data in data.get("data", []):
            # Extract conversions from actions
            conversions = 0
            conversion_value = 0
            for action in day_data.get("actions", []):
                if action.get("action_type") in ["purchase", "lead", "complete_registration"]:
                    conversions += int(action.get("value", 0))
            for action_value in day_data.get("action_values", []):
                if action_value.get("action_type") == "purchase":
                    conversion_value += float(action_value.get("value", 0))
            
            impressions = int(day_data.get("impressions", 0))
            clicks = int(day_data.get("clicks", 0))
            spend = float(day_data.get("spend", 0))
            
            metrics_list.append({
                "date": day_data.get("date_start"),
                "impressions": impressions,
                "clicks": clicks,
                "spend": round(spend, 2),
                "ctr": round(float(day_data.get("ctr", 0)), 2),
                "cpc": round(float(day_data.get("cpc", 0)), 2),
                "conversions": conversions,
                "conversion_rate": round((conversions / clicks * 100) if clicks > 0 else 0, 2),
                "cost_per_conversion": round(spend / conversions if conversions > 0 else 0, 2),
                "roas": round(conversion_value / spend if spend > 0 else 0, 2)
            })
    
    return metrics_list

async def fetch_google_ads_metrics(client: httpx.AsyncClient, integration: dict, days: int) -> List[dict]:
    """Fetch metrics from Google Ads API"""
    metrics_list = []
    
    # First, get access token from refresh token
    token_response = await client.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": integration.get("client_id"),
            "client_secret": integration.get("client_secret"),
            "refresh_token": integration.get("refresh_token"),
            "grant_type": "refresh_token"
        }
    )
    
    if token_response.status_code != 200:
        raise Exception("Failed to refresh Google access token")
    
    access_token = token_response.json().get("access_token")
    customer_id = integration.get("customer_id", "").replace("-", "")
    developer_token = integration.get("developer_token", "")
    
    today = datetime.now(timezone.utc)
    
    # Query Google Ads API
    query = f"""
        SELECT
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions,
            metrics.conversions_value
        FROM campaign
        WHERE segments.date DURING LAST_{days}_DAYS
        ORDER BY segments.date DESC
    """
    
    response = await client.post(
        f"https://googleads.googleapis.com/v14/customers/{customer_id}/googleAds:searchStream",
        headers={
            "Authorization": f"Bearer {access_token}",
            "developer-token": developer_token,
            "Content-Type": "application/json"
        },
        json={"query": query}
    )
    
    if response.status_code == 200:
        data = response.json()
        daily_data = {}
        
        for result in data.get("results", []):
            date = result.get("segments", {}).get("date")
            metrics = result.get("metrics", {})
            
            if date not in daily_data:
                daily_data[date] = {
                    "impressions": 0, "clicks": 0, "cost": 0,
                    "conversions": 0, "conversion_value": 0
                }
            
            daily_data[date]["impressions"] += int(metrics.get("impressions", 0))
            daily_data[date]["clicks"] += int(metrics.get("clicks", 0))
            daily_data[date]["cost"] += int(metrics.get("costMicros", 0)) / 1_000_000
            daily_data[date]["conversions"] += float(metrics.get("conversions", 0))
            daily_data[date]["conversion_value"] += float(metrics.get("conversionsValue", 0))
        
        for date, data in sorted(daily_data.items(), reverse=True):
            impressions = data["impressions"]
            clicks = data["clicks"]
            spend = data["cost"]
            conversions = int(data["conversions"])
            
            metrics_list.append({
                "date": date,
                "impressions": impressions,
                "clicks": clicks,
                "spend": round(spend, 2),
                "ctr": round((clicks / impressions * 100) if impressions > 0 else 0, 2),
                "cpc": round(spend / clicks if clicks > 0 else 0, 2),
                "conversions": conversions,
                "conversion_rate": round((conversions / clicks * 100) if clicks > 0 else 0, 2),
                "cost_per_conversion": round(spend / conversions if conversions > 0 else 0, 2),
                "roas": round(data["conversion_value"] / spend if spend > 0 else 0, 2)
            })
    
    return metrics_list

@router.get("/brands/{brand_id}/ads/{provider}/metrics")
async def get_ads_metrics(brand_id: str, provider: str, days: int = 30, user: dict = Depends(get_current_user)):
    """Get stored ads metrics"""
    data = await db.ads_metrics.find_one({"brand_id": brand_id, "provider": provider}, {"_id": 0})
    if not data or not data.get("metrics"):
        return {"metrics": [], "summary": {}, "has_data": False}
    
    metrics = data.get("metrics", [])[:days]
    
    total_impressions = sum(m.get("impressions", 0) for m in metrics)
    total_clicks = sum(m.get("clicks", 0) for m in metrics)
    total_spend = sum(m.get("spend", 0) for m in metrics)
    total_conversions = sum(m.get("conversions", 0) for m in metrics)
    
    summary = {
        "impressions": total_impressions,
        "clicks": total_clicks,
        "spend": round(total_spend, 2),
        "conversions": total_conversions,
        "ctr": round((total_clicks / total_impressions * 100) if total_impressions > 0 else 0, 2),
        "cpc": round(total_spend / total_clicks if total_clicks > 0 else 0, 2),
        "cost_per_conversion": round(total_spend / total_conversions if total_conversions > 0 else 0, 2),
        "avg_roas": round(sum(m.get("roas", 0) for m in metrics) / len(metrics) if metrics else 0, 2)
    }
    
    return {
        "metrics": metrics,
        "summary": summary,
        "has_data": True,
        "last_sync": data.get("last_sync")
    }

@router.get("/brands/{brand_id}/intelligence/summary")
async def get_intelligence_summary(brand_id: str, user: dict = Depends(get_current_user)):
    """Get unified intelligence summary from all connected sources"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    
    # Collect data from all sources
    meta_metrics = await db.ads_metrics.find_one({"brand_id": brand_id, "provider": "meta"}, {"_id": 0})
    google_ads_metrics = await db.ads_metrics.find_one({"brand_id": brand_id, "provider": "google"}, {"_id": 0})
    crm_contacts = await db.crm_contacts.count_documents({"brand_id": brand_id})
    
    # Calculate totals
    total_ad_spend = total_ad_conversions = total_impressions = 0
    for ads_data in [meta_metrics, google_ads_metrics]:
        if ads_data and ads_data.get("metrics"):
            metrics = ads_data["metrics"][:30]
            total_ad_spend += sum(m.get("spend", 0) for m in metrics)
            total_ad_conversions += sum(m.get("conversions", 0) for m in metrics)
            total_impressions += sum(m.get("impressions", 0) for m in metrics)
    
    # Get brand completion
    pillars = await db.pillars.find_one({"brand_id": brand_id}, {"_id": 0})
    pillar_keys = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillars_filled = sum(1 for k in pillar_keys if pillars and pillars.get(k) and len(pillars.get(k, {})) > 0)
    
    return {
        "brand_health": {
            "completeness": int((pillars_filled / len(pillar_keys)) * 100),
            "pillars_filled": pillars_filled,
            "total_pillars": len(pillar_keys)
        },
        "marketing": {
            "total_ad_spend_30d": round(total_ad_spend, 2),
            "total_conversions_30d": total_ad_conversions,
            "total_impressions_30d": total_impressions,
            "cost_per_conversion": round(total_ad_spend / total_ad_conversions if total_ad_conversions > 0 else 0, 2)
        },
        "crm": {
            "total_contacts": crm_contacts
        },
        "sources_connected": {
            "google_analytics": bool(brand and brand.get("google_tokens")),
            "meta_ads": bool(meta_metrics and meta_metrics.get("metrics")),
            "google_ads": bool(google_ads_metrics and google_ads_metrics.get("metrics")),
            "crm": crm_contacts > 0
        }
    }
