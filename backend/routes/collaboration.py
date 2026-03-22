"""Collaboration Module - Approvals, Activity Log, Comments"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user
from routes.notifications import create_notification

router = APIRouter(tags=["Collaboration"])


class ApprovalRequest(BaseModel):
    item_type: str  # pillar, touchpoint, strategy, content
    item_id: str
    item_name: str
    description: Optional[str] = ""
    assigned_to: Optional[str] = None  # user_id of reviewer

class ApprovalAction(BaseModel):
    action: str  # approve, reject, request_changes
    comment: Optional[str] = ""

class CommentRequest(BaseModel):
    item_type: str
    item_id: str
    content: str
    parent_id: Optional[str] = None


# ---- APPROVALS ----

@router.get("/brands/{brand_id}/approvals")
async def get_approvals(brand_id: str, status: str = None, user: dict = Depends(get_current_user)):
    query = {"brand_id": brand_id}
    if status:
        query["status"] = status
    approvals = await db.approvals.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)

    counts = {
        "pending": await db.approvals.count_documents({"brand_id": brand_id, "status": "pending"}),
        "approved": await db.approvals.count_documents({"brand_id": brand_id, "status": "approved"}),
        "rejected": await db.approvals.count_documents({"brand_id": brand_id, "status": "rejected"}),
        "changes_requested": await db.approvals.count_documents({"brand_id": brand_id, "status": "changes_requested"})
    }

    return {"approvals": approvals, "counts": counts}


@router.post("/brands/{brand_id}/approvals")
async def create_approval(brand_id: str, data: ApprovalRequest, user: dict = Depends(get_current_user)):
    approval_id = f"appr_{uuid.uuid4().hex[:12]}"
    doc = {
        "approval_id": approval_id, "brand_id": brand_id,
        "item_type": data.item_type, "item_id": data.item_id, "item_name": data.item_name,
        "description": data.description, "status": "pending",
        "requested_by": user["user_id"], "requested_by_name": user.get("name", ""),
        "assigned_to": data.assigned_to,
        "history": [{"action": "created", "by": user["user_id"], "by_name": user.get("name", ""), "at": datetime.now(timezone.utc).isoformat()}],
        "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.approvals.insert_one(doc)
    doc.pop("_id", None)

    # Log activity
    await log_activity(brand_id, user, "approval_created", f"Solicitou aprovacao: {data.item_name}", {"approval_id": approval_id, "item_type": data.item_type})

    # Notify assigned reviewer
    if data.assigned_to:
        await create_notification(
            user_id=data.assigned_to, brand_id=brand_id,
            notif_type="approval_request",
            title="Nova solicitacao de aprovacao",
            message=f"{user.get('name', 'Alguem')} solicitou sua aprovacao para: {data.item_name}",
            link=f"/collaboration",
            actor_name=user.get("name", "")
        )

    return doc


@router.post("/brands/{brand_id}/approvals/{approval_id}/action")
async def approval_action(brand_id: str, approval_id: str, data: ApprovalAction, user: dict = Depends(get_current_user)):
    approval = await db.approvals.find_one({"approval_id": approval_id, "brand_id": brand_id})
    if not approval:
        raise HTTPException(status_code=404, detail="Aprovacao nao encontrada")

    status_map = {"approve": "approved", "reject": "rejected", "request_changes": "changes_requested"}
    new_status = status_map.get(data.action)
    if not new_status:
        raise HTTPException(status_code=400, detail="Acao invalida")

    history_entry = {
        "action": data.action, "comment": data.comment,
        "by": user["user_id"], "by_name": user.get("name", ""),
        "at": datetime.now(timezone.utc).isoformat()
    }

    await db.approvals.update_one(
        {"approval_id": approval_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}, "$push": {"history": history_entry}}
    )

    action_labels = {"approve": "Aprovou", "reject": "Rejeitou", "request_changes": "Pediu alteracoes"}
    await log_activity(brand_id, user, f"approval_{data.action}", f"{action_labels[data.action]}: {approval.get('item_name', '')}", {"approval_id": approval_id})

    # Notify the original requester about the action
    requester_id = approval.get("requested_by")
    if requester_id and requester_id != user["user_id"]:
        status_labels = {"approve": "aprovada", "reject": "rejeitada", "request_changes": "com alteracoes solicitadas"}
        await create_notification(
            user_id=requester_id, brand_id=brand_id,
            notif_type="approval_action",
            title=f"Aprovacao {status_labels.get(data.action, 'atualizada')}",
            message=f"{user.get('name', 'Alguem')} {action_labels[data.action].lower()}: {approval.get('item_name', '')}",
            link=f"/collaboration",
            actor_name=user.get("name", "")
        )

    updated = await db.approvals.find_one({"approval_id": approval_id}, {"_id": 0})
    return updated


# ---- ACTIVITY LOG ----

async def log_activity(brand_id: str, user: dict, action: str, description: str, metadata: dict = None):
    doc = {
        "activity_id": f"act_{uuid.uuid4().hex[:12]}",
        "brand_id": brand_id,
        "user_id": user["user_id"],
        "user_name": user.get("name", ""),
        "action": action,
        "description": description,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_log.insert_one(doc)


@router.get("/brands/{brand_id}/activity")
async def get_activity_log(brand_id: str, limit: int = 50, user: dict = Depends(get_current_user)):
    activities = await db.activity_log.find({"brand_id": brand_id}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return {"activities": activities, "total": len(activities)}


@router.post("/brands/{brand_id}/activity/log")
async def log_user_activity(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Endpoint for frontend to log user actions."""
    await log_activity(brand_id, user, data.get("action", "page_view"), data.get("description", ""), data.get("metadata", {}))
    return {"success": True}


# ---- COMMENTS ----

@router.get("/brands/{brand_id}/comments")
async def get_comments(brand_id: str, item_type: str = None, item_id: str = None, user: dict = Depends(get_current_user)):
    query = {"brand_id": brand_id}
    if item_type:
        query["item_type"] = item_type
    if item_id:
        query["item_id"] = item_id

    comments = await db.comments.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"comments": comments, "total": len(comments)}


@router.post("/brands/{brand_id}/comments")
async def create_comment(brand_id: str, data: CommentRequest, user: dict = Depends(get_current_user)):
    comment_id = f"cmt_{uuid.uuid4().hex[:12]}"
    doc = {
        "comment_id": comment_id, "brand_id": brand_id,
        "item_type": data.item_type, "item_id": data.item_id,
        "content": data.content, "parent_id": data.parent_id,
        "user_id": user["user_id"], "user_name": user.get("name", ""),
        "user_picture": user.get("picture", ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(doc)
    doc.pop("_id", None)

    await log_activity(brand_id, user, "comment_added", f"Comentou em {data.item_type}", {"comment_id": comment_id, "item_type": data.item_type, "item_id": data.item_id})

    # Notify other collaborators on the same item (except commenter)
    other_commenters = await db.comments.distinct("user_id", {
        "brand_id": brand_id, "item_type": data.item_type, "item_id": data.item_id,
        "user_id": {"$ne": user["user_id"]}
    })
    for uid in other_commenters:
        await create_notification(
            user_id=uid, brand_id=brand_id,
            notif_type="comment",
            title="Novo comentario",
            message=f"{user.get('name', 'Alguem')} comentou em {data.item_type}: {data.content[:80]}",
            link=f"/collaboration",
            actor_name=user.get("name", "")
        )

    return doc


@router.delete("/brands/{brand_id}/comments/{comment_id}")
async def delete_comment(brand_id: str, comment_id: str, user: dict = Depends(get_current_user)):
    result = await db.comments.delete_one({"comment_id": comment_id, "brand_id": brand_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comentario nao encontrado ou sem permissao")
    return {"message": "Comentario removido"}
