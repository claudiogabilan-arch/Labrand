"""
LaBrand - Plans & Subscription Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

from config import db, PLANS, TRIAL_DAYS
from utils.helpers import get_current_user

router = APIRouter(tags=["Plans"])


@router.get("/plans")
async def get_plans():
    """Get available plans"""
    return {"plans": PLANS, "trial_days": TRIAL_DAYS}


@router.get("/user/plan")
async def get_user_plan(user: dict = Depends(get_current_user)):
    """Get current user plan status"""
    plan = user.get("plan", "free")
    trial_ends_at = user.get("trial_ends_at")
    
    is_trial_active = False
    trial_days_left = 0
    if trial_ends_at:
        trial_dt = datetime.fromisoformat(trial_ends_at) if isinstance(trial_ends_at, str) else trial_ends_at
        if trial_dt.tzinfo is None:
            trial_dt = trial_dt.replace(tzinfo=timezone.utc)
        is_trial_active = trial_dt > datetime.now(timezone.utc)
        if is_trial_active:
            trial_days_left = (trial_dt - datetime.now(timezone.utc)).days
    
    plan_info = PLANS.get(plan, PLANS["free"])
    
    # If trial is active, give Pro features
    effective_plan = "pro" if is_trial_active and plan == "free" else plan
    effective_plan_info = PLANS.get(effective_plan, PLANS["free"])
    
    return {
        "plan": plan,
        "plan_info": plan_info,
        "effective_plan": effective_plan,
        "effective_plan_info": effective_plan_info,
        "is_trial_active": is_trial_active,
        "trial_days_left": trial_days_left,
        "trial_ends_at": trial_ends_at,
        "ai_requests_used": user.get("ai_requests_used", 0),
        "ai_requests_limit": effective_plan_info.get("ai_requests_month", 5)
    }


@router.post("/user/upgrade")
async def upgrade_plan(data: dict, user: dict = Depends(get_current_user)):
    """Upgrade user plan"""
    new_plan = data.get("plan")
    if new_plan not in ["pro", "enterprise"]:
        raise HTTPException(status_code=400, detail="Plano inválido")
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"plan": new_plan, "upgraded_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Plano atualizado para {new_plan}", "plan": new_plan}


@router.get("/user/feature-access")
async def get_feature_access(user: dict = Depends(get_current_user)):
    """Check feature access based on plan"""
    plan = user.get("plan", "free")
    trial_ends_at = user.get("trial_ends_at")
    
    is_trial_active = False
    if trial_ends_at:
        trial_dt = datetime.fromisoformat(trial_ends_at) if isinstance(trial_ends_at, str) else trial_ends_at
        if trial_dt.tzinfo is None:
            trial_dt = trial_dt.replace(tzinfo=timezone.utc)
        is_trial_active = trial_dt > datetime.now(timezone.utc)
    
    effective_plan = "pro" if is_trial_active and plan in ["free", "founder"] else plan
    
    # Define feature access by plan
    features = {
        "free": {
            "max_brands": 1,
            "ai_features": False,
            "export_pdf": False,
            "google_integration": False,
            "benchmark": False,
            "simulator": False,
            "brand_risk": False,
            "competitors": False,
            "consistency": False
        },
        "founder": {
            "max_brands": 1,
            "ai_features": True,
            "export_pdf": False,
            "google_integration": False,
            "benchmark": False,
            "simulator": True,
            "brand_risk": False,
            "competitors": False,
            "consistency": False
        },
        "pro": {
            "max_brands": 3,
            "ai_features": True,
            "export_pdf": True,
            "google_integration": True,
            "benchmark": True,
            "simulator": True,
            "brand_risk": True,
            "competitors": True,
            "consistency": True
        },
        "consultor": {
            "max_brands": 5,
            "ai_features": True,
            "export_pdf": True,
            "google_integration": True,
            "benchmark": True,
            "simulator": True,
            "brand_risk": True,
            "competitors": True,
            "consistency": True
        },
        "enterprise": {
            "max_brands": -1,
            "ai_features": True,
            "export_pdf": True,
            "google_integration": True,
            "benchmark": True,
            "simulator": True,
            "brand_risk": True,
            "competitors": True,
            "consistency": True,
            "api_access": True,
            "white_label": True
        }
    }
    
    return {
        "plan": plan,
        "effective_plan": effective_plan,
        "is_trial_active": is_trial_active,
        "features": features.get(effective_plan, features["free"])
    }
