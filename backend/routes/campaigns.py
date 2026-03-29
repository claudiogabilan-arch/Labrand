"""Campaigns CRUD + Social Post Linking"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Campaigns"])


@router.get("/brands/{brand_id}/campaigns")
async def list_campaigns(brand_id: str, user: dict = Depends(get_current_user)):
    campaigns = await db.campaigns.find(
        {"brand_id": brand_id}, {"_id": 0}
    ).sort("start_date", -1).to_list(100)
    return campaigns


@router.post("/brands/{brand_id}/campaigns")
async def create_campaign(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    doc = {
        "campaign_id": f"camp_{uuid.uuid4().hex[:12]}",
        "brand_id": brand_id,
        "title": data.get("title", ""),
        "description": data.get("description", ""),
        "type": data.get("type", "awareness"),
        "start_date": data.get("start_date", ""),
        "end_date": data.get("end_date", ""),
        "budget": float(data.get("budget", 0)),
        "goals": data.get("goals", ""),
        "linked_posts": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"],
    }
    await db.campaigns.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/brands/{brand_id}/campaigns/{campaign_id}")
async def update_campaign(brand_id: str, campaign_id: str, data: dict, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in data.items() if k not in ("campaign_id", "brand_id", "_id", "created_at", "created_by", "linked_posts")}
    if "budget" in update:
        update["budget"] = float(update["budget"])
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.campaigns.update_one(
        {"brand_id": brand_id, "campaign_id": campaign_id},
        {"$set": update},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    return {"success": True}


@router.delete("/brands/{brand_id}/campaigns/{campaign_id}")
async def delete_campaign(brand_id: str, campaign_id: str, user: dict = Depends(get_current_user)):
    result = await db.campaigns.delete_one({"brand_id": brand_id, "campaign_id": campaign_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    return {"success": True}


@router.post("/brands/{brand_id}/campaigns/{campaign_id}/link-post")
async def link_post_to_campaign(brand_id: str, campaign_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Link a social mention/post to a campaign"""
    mention_id = data.get("mention_id")
    if not mention_id:
        raise HTTPException(status_code=400, detail="mention_id obrigatório")

    mention = await db.social_mentions.find_one(
        {"brand_id": brand_id, "mention_id": mention_id}, {"_id": 0}
    )
    if not mention:
        raise HTTPException(status_code=404, detail="Post não encontrado")

    result = await db.campaigns.update_one(
        {"brand_id": brand_id, "campaign_id": campaign_id},
        {"$addToSet": {"linked_posts": mention_id}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    return {"success": True, "message": "Post vinculado à campanha"}


@router.delete("/brands/{brand_id}/campaigns/{campaign_id}/unlink-post/{mention_id}")
async def unlink_post(brand_id: str, campaign_id: str, mention_id: str, user: dict = Depends(get_current_user)):
    """Remove a linked post from campaign"""
    await db.campaigns.update_one(
        {"brand_id": brand_id, "campaign_id": campaign_id},
        {"$pull": {"linked_posts": mention_id}},
    )
    return {"success": True}


@router.get("/brands/{brand_id}/campaigns/{campaign_id}/posts")
async def get_campaign_posts(brand_id: str, campaign_id: str, user: dict = Depends(get_current_user)):
    """Get all linked posts for a campaign with their metrics"""
    campaign = await db.campaigns.find_one(
        {"brand_id": brand_id, "campaign_id": campaign_id}, {"_id": 0}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")

    linked_ids = campaign.get("linked_posts", [])
    if not linked_ids:
        return {"posts": [], "totals": {"likes": 0, "comments": 0, "shares": 0, "views": 0}}

    posts = await db.social_mentions.find(
        {"brand_id": brand_id, "mention_id": {"$in": linked_ids}}, {"_id": 0}
    ).to_list(100)

    totals = {"likes": 0, "comments": 0, "shares": 0, "views": 0}
    for p in posts:
        eng = p.get("engagement", {})
        totals["likes"] += eng.get("likes", 0)
        totals["comments"] += eng.get("comments", 0)
        totals["shares"] += eng.get("shares", 0)
        totals["views"] += eng.get("views", 0)

    return {"posts": posts, "totals": totals, "count": len(posts)}
