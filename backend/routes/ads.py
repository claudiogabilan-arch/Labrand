"""Ads Integration Routes (Meta & Google)"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import random

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Ads"])

class AdsConfig(BaseModel):
    provider: str
    account_id: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None

@router.get("/brands/{brand_id}/ads/providers")
async def get_ads_providers(brand_id: str, user: dict = Depends(get_current_user)):
    integrations = await db.ads_integrations.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    providers = [
        {"id": "meta", "name": "Meta Ads", "description": "Facebook & Instagram Ads", "icon": "facebook",
         "connected": any(i["provider"] == "meta" for i in integrations),
         "metrics": ["impressions", "clicks", "spend", "ctr", "cpc", "conversions", "roas"]},
        {"id": "google", "name": "Google Ads", "description": "Search, Display & YouTube Ads", "icon": "google",
         "connected": any(i["provider"] == "google" for i in integrations),
         "metrics": ["impressions", "clicks", "spend", "ctr", "cpc", "conversions", "conversion_value"]}
    ]
    return {"providers": providers, "integrations": integrations}

@router.post("/brands/{brand_id}/ads/connect")
async def connect_ads(brand_id: str, config: AdsConfig, user: dict = Depends(get_current_user)):
    integration_doc = {
        "brand_id": brand_id, "provider": config.provider, "account_id": config.account_id,
        "access_token": config.access_token, "refresh_token": config.refresh_token,
        "connected": True, "connected_at": datetime.now(timezone.utc).isoformat(), "last_sync": None
    }
    await db.ads_integrations.update_one({"brand_id": brand_id, "provider": config.provider}, {"$set": integration_doc}, upsert=True)
    return {"success": True, "message": f"{config.provider.title()} Ads conectado!"}

@router.delete("/brands/{brand_id}/ads/{provider}")
async def disconnect_ads(brand_id: str, provider: str, user: dict = Depends(get_current_user)):
    await db.ads_integrations.delete_one({"brand_id": brand_id, "provider": provider})
    await db.ads_metrics.delete_many({"brand_id": brand_id, "provider": provider})
    return {"success": True}

@router.post("/brands/{brand_id}/ads/{provider}/sync")
async def sync_ads_data(brand_id: str, provider: str, user: dict = Depends(get_current_user)):
    integration = await db.ads_integrations.find_one({"brand_id": brand_id, "provider": provider})
    if not integration:
        raise HTTPException(status_code=400, detail="Provider não conectado")
    
    today = datetime.now(timezone.utc)
    metrics_list = []
    for i in range(30):
        date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        impressions = random.randint(5000, 50000)
        clicks = int(impressions * random.uniform(0.01, 0.05))
        spend = round(random.uniform(50, 500), 2)
        conversions = int(clicks * random.uniform(0.02, 0.1))
        metrics_list.append({
            "date": date, "impressions": impressions, "clicks": clicks, "spend": spend,
            "ctr": round((clicks / impressions) * 100, 2), "cpc": round(spend / clicks, 2) if clicks > 0 else 0,
            "conversions": conversions, "conversion_rate": round((conversions / clicks) * 100, 2) if clicks > 0 else 0,
            "cost_per_conversion": round(spend / conversions, 2) if conversions > 0 else 0,
            "roas": round((conversions * random.uniform(50, 200)) / spend, 2) if spend > 0 else 0
        })
    
    await db.ads_metrics.update_one({"brand_id": brand_id, "provider": provider},
        {"$set": {"brand_id": brand_id, "provider": provider, "metrics": metrics_list, "last_sync": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    await db.ads_integrations.update_one({"brand_id": brand_id, "provider": provider}, {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}})
    return {"success": True, "synced_days": 30, "note": "MOCK - Dados simulados"}

@router.get("/brands/{brand_id}/ads/{provider}/metrics")
async def get_ads_metrics(brand_id: str, provider: str, days: int = 30, user: dict = Depends(get_current_user)):
    data = await db.ads_metrics.find_one({"brand_id": brand_id, "provider": provider}, {"_id": 0})
    if not data or not data.get("metrics"):
        return {"metrics": [], "summary": {}, "has_data": False}
    
    metrics = data.get("metrics", [])[:days]
    total_impressions = sum(m["impressions"] for m in metrics)
    total_clicks = sum(m["clicks"] for m in metrics)
    total_spend = sum(m["spend"] for m in metrics)
    total_conversions = sum(m["conversions"] for m in metrics)
    
    summary = {
        "impressions": total_impressions, "clicks": total_clicks, "spend": round(total_spend, 2), "conversions": total_conversions,
        "ctr": round((total_clicks / total_impressions) * 100, 2) if total_impressions > 0 else 0,
        "cpc": round(total_spend / total_clicks, 2) if total_clicks > 0 else 0,
        "cost_per_conversion": round(total_spend / total_conversions, 2) if total_conversions > 0 else 0,
        "avg_roas": round(sum(m["roas"] for m in metrics) / len(metrics), 2) if metrics else 0
    }
    return {"metrics": metrics, "summary": summary, "has_data": True, "last_sync": data.get("last_sync")}

@router.get("/brands/{brand_id}/intelligence/summary")
async def get_intelligence_summary(brand_id: str, user: dict = Depends(get_current_user)):
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    ga_data = None
    if brand and brand.get("google_tokens"):
        ga_metrics = await db.analytics_cache.find_one({"brand_id": brand_id}, {"_id": 0})
        if ga_metrics:
            ga_data = ga_metrics.get("data")
    
    meta_metrics = await db.ads_metrics.find_one({"brand_id": brand_id, "provider": "meta"}, {"_id": 0})
    google_ads_metrics = await db.ads_metrics.find_one({"brand_id": brand_id, "provider": "google"}, {"_id": 0})
    crm_contacts = await db.crm_contacts.count_documents({"brand_id": brand_id})
    
    total_ad_spend = total_ad_conversions = total_impressions = 0
    for ads_data in [meta_metrics, google_ads_metrics]:
        if ads_data and ads_data.get("metrics"):
            metrics = ads_data["metrics"][:30]
            total_ad_spend += sum(m["spend"] for m in metrics)
            total_ad_conversions += sum(m["conversions"] for m in metrics)
            total_impressions += sum(m["impressions"] for m in metrics)
    
    pillars = await db.pillars.find_one({"brand_id": brand_id}, {"_id": 0})
    pillar_keys = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillars_filled = sum(1 for k in pillar_keys if pillars and pillars.get(k) and len(pillars.get(k, {})) > 0)
    
    return {
        "brand_health": {"completeness": int((pillars_filled / len(pillar_keys)) * 100), "pillars_filled": pillars_filled, "total_pillars": len(pillar_keys)},
        "marketing": {"total_ad_spend_30d": round(total_ad_spend, 2), "total_conversions_30d": total_ad_conversions, "total_impressions_30d": total_impressions,
                      "cost_per_conversion": round(total_ad_spend / total_ad_conversions, 2) if total_ad_conversions > 0 else 0},
        "crm": {"total_contacts": crm_contacts},
        "sources_connected": {"google_analytics": bool(brand and brand.get("google_tokens")), "meta_ads": bool(meta_metrics and meta_metrics.get("metrics")),
                              "google_ads": bool(google_ads_metrics and google_ads_metrics.get("metrics")), "crm": crm_contacts > 0}
    }
