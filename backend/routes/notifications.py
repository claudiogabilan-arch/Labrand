"""Notifications System - In-app + Email notifications for collaboration events"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import asyncio
import logging
import os

from config import db
from utils.helpers import get_current_user

import resend
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = "alertas@labrand.com.br"

router = APIRouter(tags=["Notifications"])
logger = logging.getLogger(__name__)


def _email_template(title: str, body: str, cta_url: str = "", cta_text: str = "") -> str:
    cta = ""
    if cta_url and cta_text:
        cta = f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="text-align:center;"><a href="{cta_url}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">{cta_text}</a></td></tr></table>'
    return f'''<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
<tr><td style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);padding:32px;text-align:center;">
<h1 style="margin:0;color:#fff;font-size:24px;"><span style="font-weight:700;">LA</span><span style="font-weight:400;">Brand</span></h1>
<p style="margin:8px 0 0;color:#9ca3af;font-size:14px;">Brand OS</p></td></tr>
<tr><td style="padding:32px;">
<h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">{title}</h2>
<div style="color:#374151;font-size:15px;line-height:1.6;">{body}</div>
{cta}</td></tr>
<tr><td style="background:#f9fafb;padding:24px 32px;border-top:1px solid #e5e7eb;">
<p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">Este email foi enviado pelo LaBrand - Brand OS.</p>
</td></tr></table></body></html>'''


async def _send_email(to: list, subject: str, html: str):
    if not resend.api_key:
        return
    try:
        await asyncio.to_thread(resend.Emails.send, {"from": SENDER_EMAIL, "to": to, "subject": subject, "html": html})
    except Exception as e:
        logger.error(f"Notification email failed: {e}")


async def create_notification(
    user_id: str, brand_id: str, notif_type: str,
    title: str, message: str, link: str = "",
    actor_name: str = "", send_email: bool = True
):
    """Create in-app notification and optionally send email."""
    notif_id = f"notif_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "notif_id": notif_id,
        "user_id": user_id,
        "brand_id": brand_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "link": link,
        "actor_name": actor_name,
        "read": False,
        "created_at": now
    }
    await db.notifications.insert_one(doc)

    # Send browser push notification
    try:
        from routes.push import send_push_to_user
        await send_push_to_user(user_id, title, message, url=link, tag=notif_type)
    except Exception:
        pass

    if send_email:
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "email": 1, "name": 1})
        if user and user.get("email"):
            prefs = await db.notification_prefs.find_one({"user_id": user_id}, {"_id": 0})
            email_enabled = True
            if prefs:
                email_enabled = prefs.get("email_enabled", True)
                type_prefs = prefs.get("types", {})
                if not type_prefs.get(notif_type, True):
                    email_enabled = False
            if email_enabled:
                html = _email_template(
                    title, f"<p>{message}</p>",
                    cta_url=link if link else "",
                    cta_text="Ver no LABrand" if link else ""
                )
                await _send_email([user["email"]], f"LABrand: {title}", html)

    return notif_id


# ── ENDPOINTS ──

@router.get("/notifications")
async def get_notifications(limit: int = 30, unread_only: bool = False, user: dict = Depends(get_current_user)):
    query = {"user_id": user["user_id"]}
    if unread_only:
        query["read"] = False
    notifs = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    unread = await db.notifications.count_documents({"user_id": user["user_id"], "read": False})
    return {"notifications": notifs, "unread_count": unread}


@router.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"notif_id": notif_id, "user_id": user["user_id"]},
        {"$set": {"read": True}}
    )
    return {"success": True}


@router.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["user_id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"success": True}


@router.delete("/notifications/{notif_id}")
async def delete_notification(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.delete_one({"notif_id": notif_id, "user_id": user["user_id"]})
    return {"success": True}


# ── PREFERENCES ──

class NotifPrefs(BaseModel):
    email_enabled: bool = True
    types: dict = {}  # {"approval_request": true, "approval_action": true, "comment": true}


@router.get("/notifications/preferences")
async def get_prefs(user: dict = Depends(get_current_user)):
    prefs = await db.notification_prefs.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not prefs:
        prefs = {"user_id": user["user_id"], "email_enabled": True, "types": {
            "approval_request": True, "approval_action": True, "comment": True
        }}
    return prefs


@router.put("/notifications/preferences")
async def update_prefs(data: NotifPrefs, user: dict = Depends(get_current_user)):
    await db.notification_prefs.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"email_enabled": data.email_enabled, "types": data.types, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"success": True}
