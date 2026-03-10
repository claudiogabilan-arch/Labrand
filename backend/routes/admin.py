"""Admin Dashboard Routes"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
import uuid

from config import db
from utils.helpers import get_current_user, pwd_context

router = APIRouter(tags=["Admin"])

ADMIN_SETUP_SECRET = "LABRAND_SETUP_2026_SECRET"

async def get_admin_user(request: Request):
    user = await get_current_user(request)
    if not user.get("is_admin") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return user


@router.post("/admin/setup")
async def setup_admin(data: dict):
    """One-time admin setup endpoint. Protected by secret key."""
    if data.get("secret") != ADMIN_SETUP_SECRET:
        raise HTTPException(status_code=403, detail="Chave secreta invalida")

    email = data.get("email", "admin@labrand.com.br")
    password = data.get("password")
    name = data.get("name", "Administrador LaBrand")

    if not password:
        raise HTTPException(status_code=400, detail="Senha obrigatoria")

    existing = await db.users.find_one({"email": email})
    if existing:
        # Update password and ensure admin role
        hashed = pwd_context.hash(password)
        await db.users.update_one({"email": email}, {"$set": {
            "password": hashed, "role": "admin", "is_admin": True,
            "email_verified": True, "updated_at": datetime.now(timezone.utc).isoformat()
        }})
        return {"message": f"Admin {email} atualizado com sucesso", "action": "updated"}

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed = pwd_context.hash(password)
    now = datetime.now(timezone.utc)

    user_doc = {
        "user_id": user_id, "email": email, "name": name,
        "password": hashed, "role": "admin", "is_admin": True,
        "user_type": "estrategista", "plan": "enterprise",
        "email_verified": True, "onboarding_completed": True,
        "trial_ends_at": (now + timedelta(days=365)).isoformat(),
        "created_at": now.isoformat()
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("_id", None)
    user_doc.pop("password", None)

    # Create initial AI credits
    await db.ai_credits.insert_one({
        "user_id": user_id, "total_credits": 100,
        "available_credits": 100, "used_credits": 0,
        "created_at": now.isoformat()
    })

    return {"message": f"Admin {email} criado com sucesso", "action": "created", "user_id": user_id}

@router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"email_verified": True})
    users_by_plan = {}
    for plan in ["free", "founder", "essencial", "executivo", "enterprise"]:
        users_by_plan[plan] = await db.users.count_documents({"plan": plan})
    
    total_brands = await db.brands.count_documents({})
    
    credits_pipeline = [{"$group": {"_id": None, "total_credits_sold": {"$sum": "$total_credits"}, "total_credits_used": {"$sum": "$used_credits"}, "total_credits_available": {"$sum": "$available_credits"}}}]
    credits_result = await db.ai_credits.aggregate(credits_pipeline).to_list(1)
    credits_stats = credits_result[0] if credits_result else {"total_credits_sold": 0, "total_credits_used": 0, "total_credits_available": 0}
    
    usage_pipeline = [{"$group": {"_id": "$action", "count": {"$sum": 1}, "total_credits": {"$sum": {"$abs": "$credits"}}}}, {"$sort": {"total_credits": -1}}]
    usage_by_type = await db.ai_credits_history.aggregate(usage_pipeline).to_list(20)
    
    recent_purchases = await db.payment_transactions.find({"payment_status": "paid"}, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    daily_pipeline = [{"$match": {"created_at": {"$gte": thirty_days_ago}}}, {"$addFields": {"date": {"$substr": ["$created_at", 0, 10]}}}, {"$group": {"_id": "$date", "calls": {"$sum": 1}, "credits_used": {"$sum": {"$abs": "$credits"}}}}, {"$sort": {"_id": 1}}]
    daily_usage = await db.ai_credits_history.aggregate(daily_pipeline).to_list(30)
    
    top_users_pipeline = [{"$group": {"_id": "$user_id", "total_calls": {"$sum": 1}, "total_credits_used": {"$sum": {"$abs": "$credits"}}}}, {"$sort": {"total_credits_used": -1}}, {"$limit": 10}]
    top_users = await db.ai_credits_history.aggregate(top_users_pipeline).to_list(10)
    for u in top_users:
        user_data = await db.users.find_one({"user_id": u["_id"]}, {"name": 1, "email": 1})
        if user_data:
            u["name"] = user_data.get("name", "N/A")
            u["email"] = user_data.get("email", "N/A")
    
    revenue_pipeline = [{"$match": {"payment_status": "paid"}}, {"$group": {"_id": None, "total_revenue": {"$sum": "$amount"}, "total_transactions": {"$sum": 1}}}]
    revenue_result = await db.payment_transactions.aggregate(revenue_pipeline).to_list(1)
    revenue_stats = revenue_result[0] if revenue_result else {"total_revenue": 0, "total_transactions": 0}
    
    return {
        "users": {"total": total_users, "active": active_users, "by_plan": users_by_plan},
        "brands": {"total": total_brands},
        "credits": credits_stats,
        "usage_by_type": usage_by_type,
        "daily_usage": daily_usage,
        "top_users": top_users,
        "revenue": revenue_stats,
        "recent_purchases": recent_purchases
    }

@router.get("/admin/users")
async def get_admin_users(skip: int = 0, limit: int = 50, role: str = None, plan: str = None, search: str = None, user: dict = Depends(get_admin_user)):
    query = {}
    if role:
        query["role"] = role
    if plan:
        if plan == "paying":
            query["plan"] = {"$nin": ["free", None]}
        elif plan == "free":
            query["$or"] = [{"plan": "free"}, {"plan": None}, {"plan": {"$exists": False}}]
        else:
            query["plan"] = plan
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    now = datetime.now(timezone.utc)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    
    for u in users:
        uid = u["user_id"]
        
        # Brands owned
        owned_brands = await db.brands.find({"owner_id": uid}, {"_id": 0, "brand_id": 1, "name": 1}).to_list(20)
        
        # Brands as team member
        team_memberships = await db.team_members.find({"user_id": uid, "status": "active"}, {"_id": 0, "brand_id": 1}).to_list(20)
        team_brand_ids = [m["brand_id"] for m in team_memberships]
        team_brands = []
        if team_brand_ids:
            team_brands = await db.brands.find({"brand_id": {"$in": team_brand_ids}}, {"_id": 0, "brand_id": 1, "name": 1}).to_list(20)
        
        u["brands_owned"] = owned_brands
        u["brands_member"] = team_brands
        u["brands_count"] = len(owned_brands) + len(team_brands)
        
        # Activity stats
        u["touchpoints_count"] = await db.touchpoints.count_documents({"brand_id": {"$in": [b["brand_id"] for b in owned_brands]}})
        u["pillars_count"] = await db.pillars.count_documents({"brand_id": {"$in": [b["brand_id"] for b in owned_brands]}})
        
        # AI credits
        credits = await db.ai_credits.find_one({"user_id": uid}, {"_id": 0})
        u["credits"] = {
            "available_credits": credits.get("available_credits", 0) if credits else 0,
            "used_credits": credits.get("used_credits", 0) if credits else 0,
            "total_credits": credits.get("total_credits", 0) if credits else 0
        }
        
        # Payment status
        has_paid = await db.payment_transactions.count_documents({"user_id": uid, "payment_status": "paid"})
        trial_ends = u.get("trial_ends_at", "")
        trial_active = False
        if trial_ends:
            try:
                trial_dt = datetime.fromisoformat(trial_ends.replace("Z", "+00:00")) if isinstance(trial_ends, str) else trial_ends
                trial_active = trial_dt > now
            except:
                pass
        
        u["payment_status"] = "pagante" if has_paid > 0 else ("trial" if trial_active else "free")
        u["total_payments"] = has_paid
        
        # Last activity (AI usage)
        last_ai = await db.ai_credits_history.find_one({"user_id": uid}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])
        u["last_activity"] = last_ai.get("created_at") if last_ai else u.get("created_at", "")
    
    # Summary stats
    total_all = await db.users.count_documents({})
    new_this_month = await db.users.count_documents({"created_at": {"$gte": now.strftime("%Y-%m")}})
    paying_count = await db.payment_transactions.distinct("user_id", {"payment_status": "paid"})
    
    return {
        "users": users, "total": total, "skip": skip, "limit": limit,
        "summary": {
            "total_all": total_all,
            "new_this_month": new_this_month,
            "paying_users": len(paying_count),
            "free_users": total_all - len(paying_count)
        }
    }

@router.get("/admin/ai-usage")
async def get_ai_usage_details(days: int = 30, user: dict = Depends(get_admin_user)):
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    calls = await db.ai_credits_history.find({"created_at": {"$gte": start_date}}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    by_action = {}
    total_credits = 0
    for call in calls:
        action = call.get("action", "unknown")
        credits = abs(call.get("credits", 0))
        total_credits += credits
        if action not in by_action:
            by_action[action] = {"count": 0, "credits": 0}
        by_action[action]["count"] += 1
        by_action[action]["credits"] += credits
    
    return {"period_days": days, "total_calls": len(calls), "total_credits_consumed": total_credits,
            "estimated_cost_usd": round(total_credits * 0.001, 2), "estimated_cost_brl": round(total_credits * 0.001 * 5.5, 2),
            "by_action": by_action, "recent_calls": calls[:100]}



# ===========================================
# ENDPOINT TEMPORÁRIO PARA RESET DO BANCO
# REMOVER APÓS A APRESENTAÇÃO!
# ===========================================

@router.get("/admin/reset-database")
async def reset_database(secret_key: str):
    """
    Reset COMPLETO - Limpa todos os dados para começar do zero.
    Acesse: /api/admin/reset-database?secret_key=LABRAND2024RESET
    """
    if secret_key != "LABRAND2024RESET":
        raise HTTPException(status_code=403, detail="Chave secreta inválida")
    
    results = {}
    
    # Lista de TODAS as coleções para zerar
    collections = [
        "users", "brands", "pillars", "touchpoints",
        "maturity_diagnosis", "maturity_results", "naming_projects",
        "ai_credits", "ai_credits_history", "brand_scores",
        "brand_equity", "brand_equity_history", "consistency_alerts",
        "social_mentions", "bvs_scores", "value_waves", "brand_funnel",
        "disaster_checks", "share_of_voice", "crm_contacts", "ads_metrics",
        "integrations", "team_invites", "email_alerts", "payment_transactions",
        "attribute_surveys", "competitors", "brand_tracking", "reports_history",
        "sov_config", "tasks", "decisions"
    ]
    
    for coll in collections:
        try:
            r = await db[coll].delete_many({})
            results[coll] = r.deleted_count
        except:
            results[coll] = 0
    
    total = sum(v for v in results.values() if isinstance(v, int))
    
    return {
        "status": "success", 
        "message": f"Plataforma zerada! {total} registros removidos.",
        "deleted": results
    }


@router.get("/admin/clean-mock-data/{brand_id}")
async def clean_all_mock_data(brand_id: str):
    """
    Limpa TODOS os dados mock/simulados de uma marca.
    Acesse: /api/admin/clean-mock-data/{brand_id}
    Remove: social_mentions, attribute_surveys sample, brand_tracking auto, sov_config
    """
    results = {}
    
    # 1. Remove all social mentions (mock data)
    r = await db.social_mentions.delete_many({"brand_id": brand_id})
    results["social_mentions"] = r.deleted_count
    
    # 2. Remove sample attribute surveys
    r = await db.attribute_surveys.delete_many({"brand_id": brand_id, "survey_id": {"$regex": "^sample_"}})
    results["sample_surveys"] = r.deleted_count
    
    # 3. Remove auto-generated brand tracking snapshots
    r = await db.brand_tracking.delete_many({"brand_id": brand_id, "type": "auto"})
    results["auto_tracking"] = r.deleted_count
    
    # 4. Remove SOV config without real data
    r = await db.sov_config.delete_many({"brand_id": brand_id})
    results["sov_config"] = r.deleted_count
    
    # 5. Remove social config without real connections
    r = await db.social_config.delete_many({"brand_id": brand_id})
    results["social_config"] = r.deleted_count
    
    # 6. Remove estimated/initial funnel data 
    r = await db.brand_funnel.delete_many({"brand_id": brand_id, "period": "initial"})
    results["estimated_funnel"] = r.deleted_count
    
    total = sum(v for v in results.values())
    
    return {
        "success": True,
        "brand_id": brand_id,
        "message": f"Limpeza concluída! {total} registros removidos.",
        "details": results
    }
async def database_status():
    """Verifica o status atual do banco de dados (não precisa de autenticação)"""
    try:
        users_count = await db.users.count_documents({})
        brands_count = await db.brands.count_documents({})
        
        return {
            "status": "connected",
            "users": users_count,
            "brands": brands_count,
            "message": f"Banco conectado. {users_count} usuários, {brands_count} marcas."
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


@router.get("/admin/debug-pillars/{brand_id}")
async def debug_pillars(brand_id: str):
    """Debug endpoint to see pillar data structure"""
    result = {}
    
    # Check pillars collection
    pillars = await db.pillars.find({"brand_id": brand_id}, {"_id": 0}).to_list(20)
    result["pillars_collection"] = []
    for p in pillars:
        pillar_type = p.get("pillar_type")
        answers = p.get("answers", {})
        filled = sum(1 for k, v in answers.items() if v)
        result["pillars_collection"].append({
            "type": pillar_type,
            "total_answer_keys": len(answers),
            "filled_answers": filled,
            "answer_keys": list(answers.keys()) if answers else []
        })
    
    # Check legacy collections
    for pt in ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]:
        doc = await db[f"pillar_{pt}"].find_one({"brand_id": brand_id}, {"_id": 0})
        if doc:
            result[f"pillar_{pt}"] = {
                "exists": True,
                "keys": [k for k in doc.keys() if k != "brand_id"]
            }
    
    return result
