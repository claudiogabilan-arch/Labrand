"""CRM Integration Routes"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["CRM"])

CRM_PROVIDERS = {
    "rdstation": {"name": "RD Station", "scopes": ["read_contacts", "write_contacts"]},
    "hubspot": {"name": "HubSpot", "scopes": ["crm.objects.contacts.read", "crm.objects.deals.read"]},
    "kommo": {"name": "Kommo", "scopes": ["contacts", "leads"]}
}

class CRMConfig(BaseModel):
    provider: str
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    api_key: Optional[str] = None
    subdomain: Optional[str] = None

class CRMImportRequest(BaseModel):
    provider: str
    import_type: str = "contacts"

@router.get("/crm/providers")
async def get_crm_providers():
    return {"providers": [{"id": k, "name": v["name"], "scopes": v["scopes"]} for k, v in CRM_PROVIDERS.items()]}

@router.get("/brands/{brand_id}/crm")
async def get_crm_integrations(brand_id: str, user: dict = Depends(get_current_user)):
    integrations = await db.crm_integrations.find({"brand_id": brand_id}, {"_id": 0}).to_list(10)
    stats = {}
    for provider in ["rdstation", "hubspot", "kommo"]:
        count = await db.crm_contacts.count_documents({"brand_id": brand_id, "source": provider})
        stats[provider] = {"contacts": count}
    return {"integrations": integrations, "stats": stats}

@router.post("/brands/{brand_id}/crm/connect")
async def connect_crm(brand_id: str, config: CRMConfig, user: dict = Depends(get_current_user)):
    if config.provider not in CRM_PROVIDERS:
        raise HTTPException(status_code=400, detail="Provedor CRM inválido")
    integration_doc = {
        "brand_id": brand_id, "provider": config.provider, "provider_name": CRM_PROVIDERS[config.provider]["name"],
        "client_id": config.client_id, "client_secret": config.client_secret, "api_key": config.api_key, "subdomain": config.subdomain,
        "connected": True, "connected_at": datetime.now(timezone.utc).isoformat(), "last_sync": None
    }
    await db.crm_integrations.update_one({"brand_id": brand_id, "provider": config.provider}, {"$set": integration_doc}, upsert=True)
    return {"success": True, "message": f"{CRM_PROVIDERS[config.provider]['name']} conectado!"}

@router.delete("/brands/{brand_id}/crm/{provider}")
async def disconnect_crm(brand_id: str, provider: str, user: dict = Depends(get_current_user)):
    await db.crm_integrations.delete_one({"brand_id": brand_id, "provider": provider})
    return {"success": True, "message": "CRM desconectado"}

@router.post("/brands/{brand_id}/crm/import")
async def import_crm_data(brand_id: str, request: CRMImportRequest, user: dict = Depends(get_current_user)):
    integration = await db.crm_integrations.find_one({"brand_id": brand_id, "provider": request.provider})
    if not integration:
        raise HTTPException(status_code=400, detail="CRM não conectado")
    
    mock_contacts = [
        {"name": "João Silva", "email": "joao@exemplo.com", "phone": "+55 11 99999-1111", "stage": "lead"},
        {"name": "Maria Santos", "email": "maria@exemplo.com", "phone": "+55 11 99999-2222", "stage": "qualified"},
        {"name": "Pedro Oliveira", "email": "pedro@exemplo.com", "phone": "+55 11 99999-3333", "stage": "customer"},
        {"name": "Ana Costa", "email": "ana@exemplo.com", "phone": "+55 11 99999-4444", "stage": "lead"},
        {"name": "Carlos Ferreira", "email": "carlos@exemplo.com", "phone": "+55 11 99999-5555", "stage": "opportunity"},
    ]
    
    for contact in mock_contacts:
        contact_doc = {"contact_id": f"crm_{uuid.uuid4().hex[:12]}", "brand_id": brand_id, "source": request.provider,
                       "source_name": CRM_PROVIDERS[request.provider]["name"], **contact, "imported_at": datetime.now(timezone.utc).isoformat()}
        await db.crm_contacts.update_one({"brand_id": brand_id, "email": contact["email"], "source": request.provider}, {"$set": contact_doc}, upsert=True)
    
    await db.crm_integrations.update_one({"brand_id": brand_id, "provider": request.provider}, {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}})
    return {"success": True, "imported": len(mock_contacts), "message": f"{len(mock_contacts)} contatos importados do {CRM_PROVIDERS[request.provider]['name']}"}

@router.get("/brands/{brand_id}/crm/contacts")
async def get_crm_contacts(brand_id: str, provider: str = None, stage: str = None, user: dict = Depends(get_current_user)):
    query = {"brand_id": brand_id}
    if provider:
        query["source"] = provider
    if stage:
        query["stage"] = stage
    contacts = await db.crm_contacts.find(query, {"_id": 0}).sort("imported_at", -1).to_list(500)
    stages = {}
    for contact in contacts:
        s = contact.get("stage", "unknown")
        stages[s] = stages.get(s, 0) + 1
    return {"contacts": contacts, "total": len(contacts), "by_stage": stages}
