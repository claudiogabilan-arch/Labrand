"""CRM Integration Routes - Real APIs (HubSpot, RD Station, Kommo)"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import httpx
import logging

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["CRM"])
logger = logging.getLogger(__name__)

CRM_PROVIDERS = {
    "hubspot": {
        "name": "HubSpot",
        "auth_type": "api_key",
        "fields": ["api_key"],
        "base_url": "https://api.hubapi.com",
        "docs": "https://developers.hubspot.com/docs/api/crm/contacts"
    },
    "rdstation": {
        "name": "RD Station",
        "auth_type": "oauth",
        "fields": ["client_id", "client_secret", "access_token", "refresh_token"],
        "base_url": "https://api.rd.services",
        "docs": "https://developers.rdstation.com/reference/contacts"
    },
    "kommo": {
        "name": "Kommo (AmoCRM)",
        "auth_type": "api_key",
        "fields": ["api_key", "subdomain"],
        "base_url": "https://{subdomain}.kommo.com/api/v4",
        "docs": "https://www.kommo.com/developers/content/api/"
    }
}

class CRMConfig(BaseModel):
    provider: str
    api_key: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    subdomain: Optional[str] = None

class CRMImportRequest(BaseModel):
    provider: str
    import_type: str = "contacts"
    limit: int = 100

@router.get("/crm/providers")
async def get_crm_providers():
    """List available CRM providers with required fields"""
    providers = []
    for key, config in CRM_PROVIDERS.items():
        providers.append({
            "id": key,
            "name": config["name"],
            "auth_type": config["auth_type"],
            "required_fields": config["fields"],
            "docs_url": config["docs"]
        })
    return {"providers": providers}

@router.get("/brands/{brand_id}/crm")
async def get_crm_integrations(brand_id: str, user: dict = Depends(get_current_user)):
    """Get all CRM integrations for a brand"""
    integrations = await db.crm_integrations.find(
        {"brand_id": brand_id}, 
        {"_id": 0, "api_key": 0, "client_secret": 0, "access_token": 0, "refresh_token": 0}  # Hide sensitive data
    ).to_list(10)
    
    stats = {}
    for provider in CRM_PROVIDERS.keys():
        count = await db.crm_contacts.count_documents({"brand_id": brand_id, "source": provider})
        stats[provider] = {"contacts": count}
    
    return {"integrations": integrations, "stats": stats}

@router.post("/brands/{brand_id}/crm/connect")
async def connect_crm(brand_id: str, config: CRMConfig, user: dict = Depends(get_current_user)):
    """Connect a CRM provider with user credentials"""
    if config.provider not in CRM_PROVIDERS:
        raise HTTPException(status_code=400, detail="Provedor CRM inválido")
    
    provider_config = CRM_PROVIDERS[config.provider]
    
    # Validate required fields
    if config.provider == "hubspot" and not config.api_key:
        raise HTTPException(status_code=400, detail="API Key é obrigatória para HubSpot")
    if config.provider == "rdstation" and not (config.access_token or (config.client_id and config.client_secret)):
        raise HTTPException(status_code=400, detail="Access Token ou Client ID/Secret são obrigatórios para RD Station")
    if config.provider == "kommo" and not (config.api_key and config.subdomain):
        raise HTTPException(status_code=400, detail="API Key e Subdomain são obrigatórios para Kommo")
    
    # Test connection
    is_valid = await test_crm_connection(config)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Não foi possível conectar. Verifique suas credenciais.")
    
    integration_doc = {
        "brand_id": brand_id,
        "provider": config.provider,
        "provider_name": provider_config["name"],
        "api_key": config.api_key,
        "client_id": config.client_id,
        "client_secret": config.client_secret,
        "access_token": config.access_token,
        "refresh_token": config.refresh_token,
        "subdomain": config.subdomain,
        "connected": True,
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "last_sync": None,
        "connected_by": user["user_id"]
    }
    
    await db.crm_integrations.update_one(
        {"brand_id": brand_id, "provider": config.provider},
        {"$set": integration_doc},
        upsert=True
    )
    
    return {"success": True, "message": f"{provider_config['name']} conectado com sucesso!"}

async def test_crm_connection(config: CRMConfig) -> bool:
    """Test if CRM credentials are valid"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if config.provider == "hubspot":
                response = await client.get(
                    "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
                    headers={"Authorization": f"Bearer {config.api_key}"}
                )
                return response.status_code == 200
            
            elif config.provider == "rdstation":
                headers = {"Authorization": f"Bearer {config.access_token}"} if config.access_token else {}
                response = await client.get(
                    "https://api.rd.services/platform/contacts?limit=1",
                    headers=headers
                )
                return response.status_code in [200, 401]  # 401 means invalid token but API is reachable
            
            elif config.provider == "kommo":
                response = await client.get(
                    f"https://{config.subdomain}.kommo.com/api/v4/contacts?limit=1",
                    headers={"Authorization": f"Bearer {config.api_key}"}
                )
                return response.status_code in [200, 401]
            
        return False
    except Exception as e:
        logger.error(f"CRM connection test failed: {e}")
        return False

@router.delete("/brands/{brand_id}/crm/{provider}")
async def disconnect_crm(brand_id: str, provider: str, user: dict = Depends(get_current_user)):
    """Disconnect a CRM provider"""
    await db.crm_integrations.delete_one({"brand_id": brand_id, "provider": provider})
    return {"success": True, "message": "CRM desconectado"}

@router.post("/brands/{brand_id}/crm/import")
async def import_crm_data(brand_id: str, request: CRMImportRequest, user: dict = Depends(get_current_user)):
    """Import contacts from connected CRM"""
    integration = await db.crm_integrations.find_one({"brand_id": brand_id, "provider": request.provider})
    if not integration:
        raise HTTPException(status_code=400, detail="CRM não conectado")
    
    contacts = []
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if request.provider == "hubspot":
                contacts = await fetch_hubspot_contacts(client, integration, request.limit)
            elif request.provider == "rdstation":
                contacts = await fetch_rdstation_contacts(client, integration, request.limit)
            elif request.provider == "kommo":
                contacts = await fetch_kommo_contacts(client, integration, request.limit)
    except Exception as e:
        logger.error(f"CRM import failed: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao importar: {str(e)}")
    
    # Save contacts to database
    imported_count = 0
    for contact in contacts:
        contact_doc = {
            "contact_id": f"crm_{uuid.uuid4().hex[:12]}",
            "brand_id": brand_id,
            "source": request.provider,
            "source_name": CRM_PROVIDERS[request.provider]["name"],
            "external_id": contact.get("id"),
            "name": contact.get("name", ""),
            "email": contact.get("email", ""),
            "phone": contact.get("phone", ""),
            "company": contact.get("company", ""),
            "stage": contact.get("stage", "lead"),
            "raw_data": contact,
            "imported_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.crm_contacts.update_one(
            {"brand_id": brand_id, "email": contact.get("email"), "source": request.provider},
            {"$set": contact_doc},
            upsert=True
        )
        imported_count += 1
    
    # Update last sync
    await db.crm_integrations.update_one(
        {"brand_id": brand_id, "provider": request.provider},
        {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "imported": imported_count,
        "message": f"{imported_count} contatos importados do {CRM_PROVIDERS[request.provider]['name']}"
    }

async def fetch_hubspot_contacts(client: httpx.AsyncClient, integration: dict, limit: int) -> List[dict]:
    """Fetch contacts from HubSpot API"""
    contacts = []
    response = await client.get(
        f"https://api.hubapi.com/crm/v3/objects/contacts?limit={min(limit, 100)}&properties=firstname,lastname,email,phone,company,lifecyclestage",
        headers={"Authorization": f"Bearer {integration['api_key']}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        for result in data.get("results", []):
            props = result.get("properties", {})
            contacts.append({
                "id": result.get("id"),
                "name": f"{props.get('firstname', '')} {props.get('lastname', '')}".strip(),
                "email": props.get("email", ""),
                "phone": props.get("phone", ""),
                "company": props.get("company", ""),
                "stage": props.get("lifecyclestage", "lead")
            })
    
    return contacts

async def fetch_rdstation_contacts(client: httpx.AsyncClient, integration: dict, limit: int) -> List[dict]:
    """Fetch contacts from RD Station API"""
    contacts = []
    response = await client.get(
        f"https://api.rd.services/platform/contacts?page_size={min(limit, 100)}",
        headers={"Authorization": f"Bearer {integration.get('access_token', '')}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        for contact in data.get("contacts", []):
            contacts.append({
                "id": contact.get("uuid"),
                "name": contact.get("name", ""),
                "email": contact.get("email", ""),
                "phone": contact.get("personal_phone", ""),
                "company": contact.get("company", {}).get("name", ""),
                "stage": contact.get("lifecycle_stage", "lead")
            })
    
    return contacts

async def fetch_kommo_contacts(client: httpx.AsyncClient, integration: dict, limit: int) -> List[dict]:
    """Fetch contacts from Kommo API"""
    contacts = []
    subdomain = integration.get("subdomain", "")
    response = await client.get(
        f"https://{subdomain}.kommo.com/api/v4/contacts?limit={min(limit, 250)}",
        headers={"Authorization": f"Bearer {integration['api_key']}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        for contact in data.get("_embedded", {}).get("contacts", []):
            # Extract email and phone from custom fields
            email = phone = ""
            for field in contact.get("custom_fields_values", []):
                if field.get("field_code") == "EMAIL":
                    email = field.get("values", [{}])[0].get("value", "")
                elif field.get("field_code") == "PHONE":
                    phone = field.get("values", [{}])[0].get("value", "")
            
            contacts.append({
                "id": str(contact.get("id")),
                "name": contact.get("name", ""),
                "email": email,
                "phone": phone,
                "company": contact.get("company", {}).get("name", ""),
                "stage": "lead"
            })
    
    return contacts

@router.get("/brands/{brand_id}/crm/contacts")
async def get_crm_contacts(brand_id: str, provider: str = None, stage: str = None, limit: int = 100, user: dict = Depends(get_current_user)):
    """Get imported CRM contacts"""
    query = {"brand_id": brand_id}
    if provider:
        query["source"] = provider
    if stage:
        query["stage"] = stage
    
    contacts = await db.crm_contacts.find(query, {"_id": 0, "raw_data": 0}).sort("imported_at", -1).to_list(limit)
    
    stages = {}
    for contact in contacts:
        s = contact.get("stage", "unknown")
        stages[s] = stages.get(s, 0) + 1
    
    return {"contacts": contacts, "total": len(contacts), "by_stage": stages}
