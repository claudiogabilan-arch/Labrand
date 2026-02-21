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
