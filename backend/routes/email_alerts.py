"""Email Alerts Module - Configuration and Sending"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone

from config import db
from utils.helpers import get_current_user
from services.email_service import (
    send_test_alert,
    send_brand_alert,
    generate_consistency_alert_data,
    generate_risk_alert_data,
    generate_opportunities_alert_data
)

router = APIRouter(tags=["Email Alerts"])

class EmailAlertConfig(BaseModel):
    alert_types: List[str] = ["consistency", "risk", "opportunities"]
    frequency: str = "weekly"
    recipients: List[str] = []

class SendAlertRequest(BaseModel):
    alert_type: str = "consistency"
    recipients: Optional[List[EmailStr]] = None

@router.get("/brands/{brand_id}/alerts/config")
async def get_alert_config(brand_id: str, user: dict = Depends(get_current_user)):
    config = await db.email_alerts_config.find_one({"brand_id": brand_id}, {"_id": 0})
    if not config:
        config = {"brand_id": brand_id, "enabled": False, "alert_types": ["consistency", "risk"], "frequency": "weekly", "recipients": [user.get("email", "")], "last_sent": None}
    return config

@router.post("/brands/{brand_id}/alerts/config")
async def save_alert_config(brand_id: str, config: EmailAlertConfig, user: dict = Depends(get_current_user)):
    doc = {"brand_id": brand_id, "enabled": True, "alert_types": config.alert_types, "frequency": config.frequency, "recipients": config.recipients if config.recipients else [user.get("email", "")], "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": user["user_id"]}
    await db.email_alerts_config.update_one({"brand_id": brand_id}, {"$set": doc}, upsert=True)
    return {"success": True, "message": "Configuração salva!", "config": doc}

@router.post("/brands/{brand_id}/alerts/send-test")
async def send_test_alert_endpoint(brand_id: str, user: dict = Depends(get_current_user)):
    """Send a real test alert email using Resend"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    recipient_email = user.get("email")
    if not recipient_email:
        raise HTTPException(status_code=400, detail="Email do usuário não encontrado")
    
    brand_name = brand.get("name", "Marca")
    result = await send_test_alert(brand_id, brand_name, recipient_email)
    
    if result.get("success"):
        return {
            "success": True,
            "message": f"Email de teste enviado com sucesso para {recipient_email}!",
            "brand_name": brand_name,
            "email_id": result.get("email_id")
        }
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao enviar email: {result.get('error', 'Erro desconhecido')}"
        )

@router.post("/brands/{brand_id}/alerts/send")
async def send_alert_endpoint(brand_id: str, request: SendAlertRequest, user: dict = Depends(get_current_user)):
    """Send a real alert email based on type (consistency, risk, opportunities)"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca não encontrada")
    
    recipients = request.recipients
    if not recipients:
        config = await db.email_alerts_config.find_one({"brand_id": brand_id}, {"_id": 0})
        recipients = config.get("recipients", []) if config else []
    if not recipients:
        recipients = [user.get("email")]
    
    if not recipients or not recipients[0]:
        raise HTTPException(status_code=400, detail="Nenhum destinatário configurado")
    
    brand_name = brand.get("name", "Marca")
    
    if request.alert_type == "consistency":
        data = await generate_consistency_alert_data(brand_id)
    elif request.alert_type == "risk":
        data = await generate_risk_alert_data(brand_id)
    elif request.alert_type == "opportunities":
        data = await generate_opportunities_alert_data(brand_id)
    else:
        raise HTTPException(status_code=400, detail=f"Tipo de alerta inválido: {request.alert_type}")
    
    result = await send_brand_alert(
        brand_id=brand_id,
        brand_name=brand_name,
        alert_type=request.alert_type,
        recipients=recipients,
        data=data
    )
    
    if result.get("success"):
        return {
            "success": True,
            "message": f"Alerta de {request.alert_type} enviado para {', '.join(recipients)}!",
            "brand_name": brand_name,
            "email_id": result.get("email_id"),
            "alert_type": request.alert_type
        }
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao enviar alerta: {result.get('error', 'Erro desconhecido')}"
        )

@router.get("/brands/{brand_id}/alerts/history")
async def get_alerts_history(brand_id: str, limit: int = 20, user: dict = Depends(get_current_user)):
    """Get history of sent alerts"""
    alerts = await db.email_alerts_log.find(
        {"brand_id": brand_id},
        {"_id": 0}
    ).sort("sent_at", -1).to_list(limit)
    
    return {
        "alerts": alerts,
        "total": len(alerts)
    }
