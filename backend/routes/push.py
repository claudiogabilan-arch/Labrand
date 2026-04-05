"""
LaBrand - Web Push Notifications
Manages push subscriptions and sends browser push notifications.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import json
import logging

from pywebpush import webpush, WebPushException
from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["push"])
logger = logging.getLogger(__name__)

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "").replace("\\n", "\n")
VAPID_CLAIMS = {"sub": os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:admin@labrand.com.br")}


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict


@router.get("/push/vapid-key")
async def get_vapid_key():
    """Return the public VAPID key for the frontend to subscribe"""
    return {"publicKey": VAPID_PUBLIC_KEY}


@router.post("/push/subscribe")
async def subscribe(data: PushSubscription, user: dict = Depends(get_current_user)):
    """Store a push subscription for the current user"""
    await db.push_subscriptions.update_one(
        {"user_id": user["user_id"], "endpoint": data.endpoint},
        {"$set": {
            "user_id": user["user_id"],
            "endpoint": data.endpoint,
            "keys": data.keys,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"status": "subscribed"}


@router.delete("/push/unsubscribe")
async def unsubscribe(user: dict = Depends(get_current_user)):
    """Remove all push subscriptions for the current user"""
    await db.push_subscriptions.delete_many({"user_id": user["user_id"]})
    return {"status": "unsubscribed"}


async def send_push_to_user(user_id: str, title: str, body: str, url: str = "", tag: str = ""):
    """Send a push notification to all subscriptions of a user"""
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        return

    subs = await db.push_subscriptions.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(10)

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "tag": tag or "labrand",
        "icon": "/icon-skull-black.png",
    })

    for sub in subs:
        try:
            webpush(
                subscription_info={"endpoint": sub["endpoint"], "keys": sub["keys"]},
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS,
            )
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                await db.push_subscriptions.delete_one({"endpoint": sub["endpoint"]})
            else:
                logger.error(f"Push failed for {user_id}: {e}")
        except Exception as e:
            logger.error(f"Push error: {e}")
