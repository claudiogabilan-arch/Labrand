"""Admin Dashboard Routes"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Admin"])

async def get_admin_user(request: Request):
    user = await get_current_user(request)
    if not user.get("is_admin") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores")
    return user

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
async def get_admin_users(skip: int = 0, limit: int = 50, user: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    for u in users:
        u["brands_count"] = await db.brands.count_documents({"owner_id": u["user_id"]})
        credits = await db.ai_credits.find_one({"user_id": u["user_id"]}, {"_id": 0})
        u["ai_credits"] = credits.get("balance", 0) if credits else 0
    return {"users": users, "total": total, "skip": skip, "limit": limit}

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
