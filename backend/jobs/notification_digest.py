"""Notification digest job.

Aggregates unread notifications per user (filtered by their preferences) and
sends a single grouped email summary. Can be run:
  - Manually via POST /api/notifications/send-digests (admin)
  - On a cron (cluster cron / external scheduler) — call run_digest(frequency='daily') etc.

Idempotency: each notification gets a `digested_at` timestamp once included so
back-to-back runs do not duplicate.
"""
from datetime import datetime, timezone, timedelta
from typing import Callable, Optional
import logging

from config import db

logger = logging.getLogger(__name__)

CATEGORY_LABEL = {
    "comment": "Comentários",
    "change":  "Mudanças e aprovações",
    "ai":      "Insights de IA",
    "system":  "Sistema",
}

TYPE_TO_CATEGORY = {
    "comment":          "comment",
    "approval_request": "change",
    "approval_action":  "change",
    "change":           "change",
    "ai":               "ai",
    "ai_insight":       "ai",
    "system":           "system",
}


def _digest_html(user_name: str, frequency: str, groups: dict) -> str:
    """Render a simple grouped HTML summary."""
    parts = []
    parts.append(f'<h2 style="margin:0 0 8px;color:#1f2937;font-size:20px;">Olá, {user_name or "tudo bem"}!</h2>')
    label = "do dia" if frequency == "daily" else "da semana"
    total = sum(len(items) for items in groups.values())
    parts.append(
        f'<p style="margin:0 0 24px;color:#6b7280;font-size:14px;">'
        f'Aqui está seu resumo {label}: <strong>{total}</strong> '
        f'{"notificação não lida" if total == 1 else "notificações não lidas"}.'
        f'</p>'
    )
    for cat in ["comment", "change", "ai", "system"]:
        items = groups.get(cat) or []
        if not items:
            continue
        parts.append(
            f'<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">'
            f'<tr><td style="border-left:3px solid #1a1a1a;padding:0 0 0 12px;margin-bottom:12px;">'
            f'<p style="margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;font-weight:600;">'
            f'{CATEGORY_LABEL[cat]} · {len(items)}'
            f'</p></td></tr>'
        )
        for item in items[:10]:
            title = (item.get("title") or "").replace("<", "&lt;")
            msg = (item.get("message") or "").replace("<", "&lt;")
            link = item.get("link") or ""
            link_html = f' <a href="{link}" style="color:#2563eb;text-decoration:none;">abrir →</a>' if link else ""
            parts.append(
                f'<tr><td style="padding:8px 0 8px 12px;border-bottom:1px solid #f3f4f6;">'
                f'<p style="margin:0;font-size:14px;color:#111827;font-weight:500;">{title}</p>'
                f'<p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">{msg}{link_html}</p>'
                f'</td></tr>'
            )
        if len(items) > 10:
            parts.append(
                f'<tr><td style="padding:8px 0 0 12px;font-size:12px;color:#9ca3af;">'
                f'…e mais {len(items) - 10} notificações nesta categoria.</td></tr>'
            )
        parts.append('</table>')

    body = "".join(parts)
    return (
        '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>'
        '<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;background:#f3f4f6;">'
        '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fff;">'
        '<tr><td style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);padding:32px;text-align:center;">'
        '<h1 style="margin:0;color:#fff;font-size:24px;"><span style="font-weight:700;">LA</span><span style="font-weight:400;">Brand</span></h1>'
        f'<p style="margin:8px 0 0;color:#9ca3af;font-size:14px;">Resumo {"diário" if frequency == "daily" else "semanal"}</p>'
        '</td></tr>'
        f'<tr><td style="padding:32px;">{body}</td></tr>'
        '<tr><td style="background:#f9fafb;padding:24px 32px;border-top:1px solid #e5e7eb;">'
        '<p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">'
        'Você está recebendo este email porque ativou o digest no LaBrand. Ajuste suas preferências em Configurações → Notificações.'
        '</p></td></tr></table></body></html>'
    )


async def run_digest(frequency: Optional[str], send_email_fn: Callable):
    """Send digest emails. Returns a stats dict.

    Args:
      frequency: 'daily' | 'weekly' | None (process both)
      send_email_fn: async fn(to: list[str], subject: str, html: str)
    """
    targets = ["daily", "weekly"] if frequency is None else [frequency]
    now = datetime.now(timezone.utc)
    stats = {"users_processed": 0, "emails_sent": 0, "notifications_marked": 0, "skipped_empty": 0}

    for freq in targets:
        lookback = timedelta(days=1 if freq == "daily" else 7)
        cutoff = (now - lookback).isoformat()

        prefs_cursor = db.notification_prefs.find({"email_digest": freq}, {"_id": 0})
        prefs_list = await prefs_cursor.to_list(length=10000)

        for prefs in prefs_list:
            stats["users_processed"] += 1
            user_id = prefs["user_id"]
            mute_types = set(prefs.get("mute_types") or [])
            mute_brands = set(prefs.get("mute_brands") or [])

            # Pull unread notifications since cutoff that have NOT been included in a previous digest
            query = {
                "user_id": user_id,
                "read": False,
                "created_at": {"$gte": cutoff},
                "$or": [{"digested_at": {"$exists": False}}, {"digested_at": None}],
            }
            notifs = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=500)

            # Apply mute filters (category and brand)
            filtered = []
            for n in notifs:
                cat = TYPE_TO_CATEGORY.get(n.get("type", ""), "system")
                if cat in mute_types:
                    continue
                if n.get("brand_id") and n["brand_id"] in mute_brands:
                    continue
                filtered.append((cat, n))

            if not filtered:
                stats["skipped_empty"] += 1
                continue

            user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "email": 1, "name": 1})
            if not user or not user.get("email"):
                continue

            grouped = {}
            for cat, n in filtered:
                grouped.setdefault(cat, []).append(n)

            html = _digest_html(user.get("name", ""), freq, grouped)
            subject = f"LaBrand · Resumo {'diário' if freq == 'daily' else 'semanal'} · {len(filtered)} notificações"

            try:
                await send_email_fn([user["email"]], subject, html)
                stats["emails_sent"] += 1
                # Mark these notifs so the next run does not re-include them
                ids = [n["notif_id"] for _, n in filtered]
                await db.notifications.update_many(
                    {"notif_id": {"$in": ids}},
                    {"$set": {"digested_at": now.isoformat()}},
                )
                stats["notifications_marked"] += len(ids)
            except Exception as e:
                logger.error(f"Digest send failed for {user_id}: {e}")

    return stats
