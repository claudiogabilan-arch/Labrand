"""Admin Email System - Custom emails, Inactive alerts, Auto-alerts"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import asyncio
import logging

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Admin Emails"])

logger = logging.getLogger(__name__)

# Reuse Resend from existing service
import resend
import os
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = "alertas@labrand.com.br"


def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin" and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Acesso restrito")
    return user


def get_base_email_template(subject_line: str, body_html: str, cta_url: str = "", cta_text: str = "") -> str:
    cta_block = ""
    if cta_url and cta_text:
        cta_block = f"""
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
            <tr><td style="text-align: center;">
                <a href="{cta_url}" style="display: inline-block; background: #1a1a1a; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">{cta_text}</a>
            </td></tr>
        </table>"""

    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f3f4f6;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
<tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);padding:32px;text-align:center;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;"><span style="color:#ffffff;">LA</span><span style="font-weight:400;">Brand</span></h1>
<p style="margin:8px 0 0 0;color:#9ca3af;font-size:14px;">Brand OS</p></td></tr>
<tr><td style="padding:32px;">
<h2 style="margin:0 0 16px 0;color:#1f2937;font-size:20px;">{subject_line}</h2>
<div style="color:#374151;font-size:15px;line-height:1.6;">{body_html}</div>
{cta_block}
</td></tr>
<tr><td style="background:#f9fafb;padding:24px 32px;border-top:1px solid #e5e7eb;">
<p style="margin:0;color:#6b7280;font-size:12px;text-align:center;">Este email foi enviado pelo LaBrand - Brand OS.</p>
<p style="margin:12px 0 0 0;color:#9ca3af;font-size:11px;text-align:center;">&copy; {datetime.now().year} LaBrand. Todos os direitos reservados.</p>
</td></tr></table></body></html>"""


async def do_send_email(to: list, subject: str, html: str) -> dict:
    if not resend.api_key:
        return {"success": False, "error": "RESEND_API_KEY nao configurado"}
    params = {"from": SENDER_EMAIL, "to": to, "subject": subject, "html": html}
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        return {"success": True, "email_id": result.get("id")}
    except Exception as e:
        logger.error(f"Email send failed to {to}: {e}")
        return {"success": False, "error": str(e)}


# --- Models ---
class ComposeEmailRequest(BaseModel):
    recipients: List[str]
    subject: str
    body: str
    cta_url: Optional[str] = ""
    cta_text: Optional[str] = ""

class InactiveAlertRequest(BaseModel):
    user_ids: Optional[List[str]] = None
    custom_message: Optional[str] = None

class AutoAlertConfigRequest(BaseModel):
    enabled: bool = True
    days_threshold: int = 7
    max_emails_per_week: int = 1


# --- Endpoints ---

@router.get("/admin/emails/inactive-users")
async def get_inactive_users(days: int = 7, user: dict = Depends(get_admin_user)):
    """List users inactive for N+ days."""
    threshold = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    all_users = await db.users.find({"role": {"$ne": "admin"}}, {"_id": 0, "password": 0}).to_list(500)

    inactive = []
    for u in all_users:
        uid = u["user_id"]
        # Find last meaningful activity
        last_ai = await db.ai_credits_history.find_one({"user_id": uid}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])
        last_tp = await db.touchpoints.find_one({"brand_id": {"$regex": ".*"}}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])

        dates = [u.get("created_at", "")]
        if last_ai:
            dates.append(last_ai.get("created_at", ""))
        if last_tp:
            dates.append(last_tp.get("created_at", ""))

        last_activity = max(dates) if dates else u.get("created_at", "")
        u["last_activity"] = last_activity

        if last_activity and last_activity < threshold:
            # Check if already alerted this week
            week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            recent_alert = await db.admin_emails_log.find_one({
                "recipient_email": u["email"],
                "email_type": "inactive_alert",
                "sent_at": {"$gte": week_ago},
                "success": True
            })
            u["already_alerted_this_week"] = recent_alert is not None

            try:
                act_dt = datetime.fromisoformat(last_activity.replace("Z", "+00:00"))
                u["days_inactive"] = (datetime.now(timezone.utc) - act_dt).days
            except:
                u["days_inactive"] = days

            inactive.append(u)

    inactive.sort(key=lambda x: x.get("days_inactive", 0), reverse=True)
    return {"inactive_users": inactive, "total": len(inactive), "threshold_days": days}


@router.post("/admin/emails/send-inactive-alerts")
async def send_inactive_alerts(request: InactiveAlertRequest, user: dict = Depends(get_admin_user)):
    """Send re-engagement emails to inactive users (manual trigger)."""
    if request.user_ids:
        target_users = await db.users.find({"user_id": {"$in": request.user_ids}}, {"_id": 0, "password": 0}).to_list(100)
    else:
        # Get all inactive 7+ days
        res = await get_inactive_users(days=7, user=user)
        target_users = [u for u in res["inactive_users"] if not u.get("already_alerted_this_week")]

    if not target_users:
        return {"sent": 0, "message": "Nenhum usuario inativo para alertar ou todos ja foram alertados esta semana."}

    custom_msg = request.custom_message or ""
    sent = 0
    errors = []

    for u in target_users:
        email = u.get("email")
        name = u.get("name", "")
        days = u.get("days_inactive", 7)
        if not email:
            continue

        body = f"""<p>Ola{' ' + name.split()[0] if name else ''},</p>
<p>Sentimos sua falta no LaBrand! Faz <strong>{days} dias</strong> desde sua ultima atividade na plataforma.</p>
{f'<p>{custom_msg}</p>' if custom_msg else ''}
<p>Sua marca precisa de atencao constante para se fortalecer. Cada dia sem registro e um dado que se perde na evolucao da sua marca.</p>
<p>Que tal dedicar 10 minutos hoje para atualizar seus touchpoints ou verificar o estado dos seus pilares?</p>"""

        html = get_base_email_template(
            "Sua marca sente sua falta",
            body,
            cta_url="https://labrand.com.br/dashboard",
            cta_text="Voltar ao LaBrand"
        )

        result = await do_send_email([email], f"Sua marca sente sua falta - LaBrand", html)

        await db.admin_emails_log.insert_one({
            "email_id": f"email_{uuid.uuid4().hex[:12]}",
            "email_type": "inactive_alert",
            "recipient_email": email,
            "recipient_name": name,
            "recipient_user_id": u.get("user_id"),
            "subject": "Sua marca sente sua falta - LaBrand",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "sent_by": user["user_id"],
            "success": result.get("success", False),
            "resend_id": result.get("email_id"),
            "error": result.get("error"),
            "days_inactive": days
        })

        if result.get("success"):
            sent += 1
        else:
            errors.append({"email": email, "error": result.get("error")})

    return {"sent": sent, "total_targeted": len(target_users), "errors": errors}


@router.post("/admin/emails/compose")
async def send_custom_email(request: ComposeEmailRequest, user: dict = Depends(get_admin_user)):
    """Send a custom email to selected recipients."""
    if not request.recipients:
        raise HTTPException(status_code=400, detail="Selecione pelo menos um destinatario")
    if not request.subject.strip():
        raise HTTPException(status_code=400, detail="Assunto e obrigatorio")
    if not request.body.strip():
        raise HTTPException(status_code=400, detail="Corpo do email e obrigatorio")

    body_html = request.body.replace("\n", "<br>")
    html = get_base_email_template(
        request.subject,
        f"<div>{body_html}</div>",
        cta_url=request.cta_url or "",
        cta_text=request.cta_text or ""
    )

    result = await do_send_email(request.recipients, request.subject, html)

    await db.admin_emails_log.insert_one({
        "email_id": f"email_{uuid.uuid4().hex[:12]}",
        "email_type": "custom",
        "recipient_email": request.recipients,
        "subject": request.subject,
        "body_preview": request.body[:200],
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "sent_by": user["user_id"],
        "success": result.get("success", False),
        "resend_id": result.get("email_id"),
        "error": result.get("error")
    })

    if result.get("success"):
        return {"success": True, "message": f"Email enviado para {len(request.recipients)} destinatario(s)!", "email_id": result.get("email_id")}
    else:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar: {result.get('error')}")


@router.get("/admin/emails/history")
async def get_email_history(limit: int = 50, email_type: str = None, user: dict = Depends(get_admin_user)):
    """Get history of all admin-sent emails."""
    query = {}
    if email_type:
        query["email_type"] = email_type

    emails = await db.admin_emails_log.find(query, {"_id": 0}).sort("sent_at", -1).to_list(limit)
    total = await db.admin_emails_log.count_documents(query)

    stats = {
        "total_sent": await db.admin_emails_log.count_documents({"success": True}),
        "total_failed": await db.admin_emails_log.count_documents({"success": False}),
        "inactive_alerts": await db.admin_emails_log.count_documents({"email_type": "inactive_alert", "success": True}),
        "custom_emails": await db.admin_emails_log.count_documents({"email_type": "custom", "success": True}),
        "auto_alerts": await db.admin_emails_log.count_documents({"email_type": "auto_inactive", "success": True})
    }

    return {"emails": emails, "total": total, "stats": stats}


@router.get("/admin/emails/auto-config")
async def get_auto_alert_config(user: dict = Depends(get_admin_user)):
    config = await db.admin_auto_alert_config.find_one({"config_id": "inactive_alerts"}, {"_id": 0})
    if not config:
        config = {"config_id": "inactive_alerts", "enabled": False, "days_threshold": 7, "max_emails_per_week": 1, "last_run": None}
    return config


@router.post("/admin/emails/auto-config")
async def save_auto_alert_config(request: AutoAlertConfigRequest, user: dict = Depends(get_admin_user)):
    doc = {
        "config_id": "inactive_alerts",
        "enabled": request.enabled,
        "days_threshold": request.days_threshold,
        "max_emails_per_week": request.max_emails_per_week,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["user_id"]
    }
    await db.admin_auto_alert_config.update_one({"config_id": "inactive_alerts"}, {"$set": doc}, upsert=True)
    return {"success": True, "config": doc}


@router.post("/admin/emails/auto-run")
async def auto_run_inactive_alerts(user: dict = Depends(get_admin_user)):
    """Manually trigger the auto-alert process (also called by cron)."""
    config = await db.admin_auto_alert_config.find_one({"config_id": "inactive_alerts"}, {"_id": 0})
    if not config or not config.get("enabled"):
        return {"sent": 0, "message": "Alertas automaticos estao desativados."}

    days = config.get("days_threshold", 7)
    res = await get_inactive_users(days=days, user=user)
    eligible = [u for u in res["inactive_users"] if not u.get("already_alerted_this_week")]

    if not eligible:
        await db.admin_auto_alert_config.update_one({"config_id": "inactive_alerts"}, {"$set": {"last_run": datetime.now(timezone.utc).isoformat()}})
        return {"sent": 0, "message": "Nenhum usuario elegivel para alerta automatico."}

    sent = 0
    for u in eligible:
        email = u.get("email")
        name = u.get("name", "")
        days_inactive = u.get("days_inactive", days)
        if not email:
            continue

        body = f"""<p>Ola{' ' + name.split()[0] if name else ''},</p>
<p>Ja faz <strong>{days_inactive} dias</strong> desde sua ultima atividade no LaBrand.</p>
<p>Sua marca e um ativo que precisa de dados consistentes para crescer. Cada touchpoint registrado, cada pilar revisado, contribui para o fortalecimento mensuravel da sua marca.</p>
<p>Reserve 10 minutos hoje para atualizar sua marca.</p>"""

        html = get_base_email_template("Hora de cuidar da sua marca", body, "https://labrand.com.br/dashboard", "Acessar LaBrand")
        result = await do_send_email([email], "Hora de cuidar da sua marca - LaBrand", html)

        await db.admin_emails_log.insert_one({
            "email_id": f"email_{uuid.uuid4().hex[:12]}",
            "email_type": "auto_inactive",
            "recipient_email": email,
            "recipient_name": name,
            "recipient_user_id": u.get("user_id"),
            "subject": "Hora de cuidar da sua marca - LaBrand",
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "sent_by": "auto",
            "success": result.get("success", False),
            "resend_id": result.get("email_id"),
            "error": result.get("error"),
            "days_inactive": days_inactive
        })
        if result.get("success"):
            sent += 1

    await db.admin_auto_alert_config.update_one({"config_id": "inactive_alerts"}, {"$set": {"last_run": datetime.now(timezone.utc).isoformat()}})
    return {"sent": sent, "total_eligible": len(eligible), "message": f"{sent} alertas automaticos enviados."}
