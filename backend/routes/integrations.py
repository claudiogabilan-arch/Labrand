"""Integrations Management Routes - Self-service API key configuration"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid
import base64
import httpx

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Integrations"])


# Integration providers configuration
INTEGRATION_PROVIDERS = {
    "crm": {
        "rdstation": {
            "name": "RD Station",
            "icon": "rdstation",
            "fields": [
                {"id": "api_key", "label": "API Key", "type": "password", "required": True},
                {"id": "client_id", "label": "Client ID", "type": "text", "required": False},
                {"id": "client_secret", "label": "Client Secret", "type": "password", "required": False}
            ],
            "docs_url": "https://developers.rdstation.com/",
            "test_endpoint": "https://api.rd.services/platform/contacts"
        },
        "hubspot": {
            "name": "HubSpot",
            "icon": "hubspot",
            "fields": [
                {"id": "api_key", "label": "Private App Token", "type": "password", "required": True}
            ],
            "docs_url": "https://developers.hubspot.com/",
            "test_endpoint": "https://api.hubapi.com/crm/v3/objects/contacts"
        },
        "pipedrive": {
            "name": "Pipedrive",
            "icon": "pipedrive",
            "fields": [
                {"id": "api_key", "label": "API Token", "type": "password", "required": True},
                {"id": "company_domain", "label": "Domínio da Empresa", "type": "text", "required": True, "placeholder": "suaempresa"}
            ],
            "docs_url": "https://developers.pipedrive.com/",
            "test_endpoint": "https://{company_domain}.pipedrive.com/api/v1/users/me"
        },
        "kommo": {
            "name": "Kommo (amoCRM)",
            "icon": "kommo",
            "fields": [
                {"id": "api_key", "label": "Access Token", "type": "password", "required": True},
                {"id": "subdomain", "label": "Subdomínio", "type": "text", "required": True, "placeholder": "suaempresa"}
            ],
            "docs_url": "https://www.kommo.com/developers/",
            "test_endpoint": "https://{subdomain}.kommo.com/api/v4/account"
        }
    },
    "ads": {
        "meta": {
            "name": "Meta Ads (Facebook/Instagram)",
            "icon": "meta",
            "fields": [
                {"id": "access_token", "label": "Access Token", "type": "password", "required": True},
                {"id": "ad_account_id", "label": "Ad Account ID", "type": "text", "required": True, "placeholder": "act_123456789"},
                {"id": "app_id", "label": "App ID", "type": "text", "required": False},
                {"id": "app_secret", "label": "App Secret", "type": "password", "required": False}
            ],
            "docs_url": "https://developers.facebook.com/docs/marketing-apis/",
            "test_endpoint": "https://graph.facebook.com/v18.0/{ad_account_id}"
        },
        "google": {
            "name": "Google Ads",
            "icon": "google",
            "fields": [
                {"id": "developer_token", "label": "Developer Token", "type": "password", "required": True},
                {"id": "client_id", "label": "OAuth Client ID", "type": "text", "required": True},
                {"id": "client_secret", "label": "OAuth Client Secret", "type": "password", "required": True},
                {"id": "refresh_token", "label": "Refresh Token", "type": "password", "required": True},
                {"id": "customer_id", "label": "Customer ID", "type": "text", "required": True, "placeholder": "123-456-7890"}
            ],
            "docs_url": "https://developers.google.com/google-ads/api/docs/start",
            "test_endpoint": "https://googleads.googleapis.com/v14/customers/{customer_id}"
        },
        "tiktok": {
            "name": "TikTok Ads",
            "icon": "tiktok",
            "fields": [
                {"id": "access_token", "label": "Access Token", "type": "password", "required": True},
                {"id": "advertiser_id", "label": "Advertiser ID", "type": "text", "required": True}
            ],
            "docs_url": "https://ads.tiktok.com/marketing_api/docs",
            "test_endpoint": "https://business-api.tiktok.com/open_api/v1.3/advertiser/info/"
        }
    }
}


class IntegrationCredentials(BaseModel):
    provider_id: str
    credentials: Dict[str, str]
    is_enabled: bool = True


class IntegrationTest(BaseModel):
    provider_id: str
    credentials: Dict[str, str]


def simple_encrypt(text: str) -> str:
    """Simple base64 encoding for credentials (in production, use proper encryption)"""
    return base64.b64encode(text.encode()).decode()


def simple_decrypt(encoded: str) -> str:
    """Simple base64 decoding for credentials"""
    try:
        return base64.b64decode(encoded.encode()).decode()
    except:
        return encoded


@router.get("/integrations/providers")
async def get_integration_providers():
    """Get all available integration providers and their configuration"""
    return {
        "providers": INTEGRATION_PROVIDERS,
        "categories": [
            {"id": "crm", "name": "CRM", "description": "Gestão de Relacionamento com Cliente"},
            {"id": "ads", "name": "Ads", "description": "Plataformas de Anúncios"}
        ]
    }


@router.get("/brands/{brand_id}/integrations")
async def get_brand_integrations(brand_id: str, user: dict = Depends(get_current_user)):
    """Get all integrations configured for a brand"""
    integrations = await db.integrations.find(
        {"brand_id": brand_id},
        {"_id": 0, "credentials": 0}  # Don't expose credentials in list
    ).to_list(50)
    
    # Get summary by category
    summary = {"crm": [], "ads": []}
    for integration in integrations:
        category = integration.get("category")
        if category in summary:
            summary[category].append({
                "provider_id": integration["provider_id"],
                "provider_name": integration.get("provider_name"),
                "is_enabled": integration.get("is_enabled", False),
                "status": integration.get("status", "disconnected"),
                "last_sync": integration.get("last_sync")
            })
    
    return {"integrations": integrations, "summary": summary}


@router.get("/brands/{brand_id}/integrations/{category}/{provider_id}")
async def get_integration_details(
    brand_id: str, 
    category: str, 
    provider_id: str, 
    user: dict = Depends(get_current_user)
):
    """Get details of a specific integration (credentials masked)"""
    integration = await db.integrations.find_one(
        {"brand_id": brand_id, "category": category, "provider_id": provider_id},
        {"_id": 0}
    )
    
    if not integration:
        return {"integration": None, "configured": False}
    
    # Mask credentials
    if integration.get("credentials"):
        masked = {}
        for key, value in integration["credentials"].items():
            if value:
                decrypted = simple_decrypt(value)
                masked[key] = decrypted[:4] + "****" + decrypted[-4:] if len(decrypted) > 8 else "****"
            else:
                masked[key] = ""
        integration["credentials_masked"] = masked
        del integration["credentials"]
    
    return {"integration": integration, "configured": True}


@router.post("/brands/{brand_id}/integrations/{category}")
async def save_integration(
    brand_id: str,
    category: str,
    data: IntegrationCredentials,
    user: dict = Depends(get_current_user)
):
    """Save or update integration credentials"""
    # Validate category and provider
    if category not in INTEGRATION_PROVIDERS:
        raise HTTPException(status_code=400, detail="Categoria inválida")
    
    if data.provider_id not in INTEGRATION_PROVIDERS[category]:
        raise HTTPException(status_code=400, detail="Provedor inválido")
    
    provider_config = INTEGRATION_PROVIDERS[category][data.provider_id]
    
    # Encrypt credentials
    encrypted_credentials = {}
    for key, value in data.credentials.items():
        if value:
            encrypted_credentials[key] = simple_encrypt(value)
    
    integration_doc = {
        "brand_id": brand_id,
        "category": category,
        "provider_id": data.provider_id,
        "provider_name": provider_config["name"],
        "credentials": encrypted_credentials,
        "is_enabled": data.is_enabled,
        "status": "pending_test",
        "configured_at": datetime.now(timezone.utc).isoformat(),
        "configured_by": user["user_id"],
        "last_sync": None,
        "sync_errors": []
    }
    
    await db.integrations.update_one(
        {"brand_id": brand_id, "category": category, "provider_id": data.provider_id},
        {"$set": integration_doc},
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"Integração {provider_config['name']} configurada com sucesso",
        "status": "pending_test"
    }


@router.post("/brands/{brand_id}/integrations/{category}/{provider_id}/test")
async def test_integration(
    brand_id: str,
    category: str,
    provider_id: str,
    user: dict = Depends(get_current_user)
):
    """Test if the integration credentials are valid"""
    integration = await db.integrations.find_one(
        {"brand_id": brand_id, "category": category, "provider_id": provider_id}
    )
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integração não encontrada")
    
    # Decrypt credentials
    credentials = {}
    for key, value in integration.get("credentials", {}).items():
        credentials[key] = simple_decrypt(value)
    
    provider_config = INTEGRATION_PROVIDERS.get(category, {}).get(provider_id, {})
    test_result = await _test_provider_connection(category, provider_id, credentials, provider_config)
    
    # Update status based on test
    new_status = "connected" if test_result["success"] else "error"
    await db.integrations.update_one(
        {"brand_id": brand_id, "category": category, "provider_id": provider_id},
        {"$set": {
            "status": new_status,
            "last_test": datetime.now(timezone.utc).isoformat(),
            "last_test_result": test_result
        }}
    )
    
    return test_result


@router.delete("/brands/{brand_id}/integrations/{category}/{provider_id}")
async def delete_integration(
    brand_id: str,
    category: str,
    provider_id: str,
    user: dict = Depends(get_current_user)
):
    """Remove an integration"""
    result = await db.integrations.delete_one(
        {"brand_id": brand_id, "category": category, "provider_id": provider_id}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Integração não encontrada")
    
    return {"success": True, "message": "Integração removida"}


@router.post("/brands/{brand_id}/integrations/{category}/{provider_id}/sync")
async def sync_integration(
    brand_id: str,
    category: str,
    provider_id: str,
    user: dict = Depends(get_current_user)
):
    """Trigger a sync for the integration"""
    integration = await db.integrations.find_one(
        {"brand_id": brand_id, "category": category, "provider_id": provider_id}
    )
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integração não encontrada")
    
    if integration.get("status") != "connected":
        raise HTTPException(status_code=400, detail="Integração não está conectada. Teste a conexão primeiro.")
    
    # Decrypt credentials
    credentials = {}
    for key, value in integration.get("credentials", {}).items():
        credentials[key] = simple_decrypt(value)
    
    # Perform sync based on category
    sync_result = {"success": False, "message": "Sync não implementado para este provedor"}
    
    if category == "crm":
        sync_result = await _sync_crm_data(brand_id, provider_id, credentials)
    elif category == "ads":
        sync_result = await _sync_ads_data(brand_id, provider_id, credentials)
    
    # Update last sync
    await db.integrations.update_one(
        {"brand_id": brand_id, "category": category, "provider_id": provider_id},
        {"$set": {
            "last_sync": datetime.now(timezone.utc).isoformat(),
            "last_sync_result": sync_result
        }}
    )
    
    return sync_result


async def _test_provider_connection(category: str, provider_id: str, credentials: dict, config: dict) -> dict:
    """Test connection to a provider"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if category == "crm":
                return await _test_crm_connection(provider_id, credentials, client)
            elif category == "ads":
                return await _test_ads_connection(provider_id, credentials, client)
            else:
                return {"success": False, "message": "Categoria não suportada"}
    except httpx.TimeoutException:
        return {"success": False, "message": "Timeout ao conectar com o provedor"}
    except Exception as e:
        return {"success": False, "message": f"Erro ao testar conexão: {str(e)}"}


async def _test_crm_connection(provider_id: str, credentials: dict, client: httpx.AsyncClient) -> dict:
    """Test CRM provider connection"""
    try:
        if provider_id == "rdstation":
            response = await client.get(
                "https://api.rd.services/platform/contacts",
                headers={"Authorization": f"Bearer {credentials.get('api_key', '')}"},
                params={"page": 1, "page_size": 1}
            )
            if response.status_code == 200:
                return {"success": True, "message": "Conexão com RD Station estabelecida com sucesso"}
            elif response.status_code == 401:
                return {"success": False, "message": "API Key inválida ou expirada"}
            else:
                return {"success": False, "message": f"Erro {response.status_code}: {response.text[:200]}"}
        
        elif provider_id == "hubspot":
            response = await client.get(
                "https://api.hubapi.com/crm/v3/objects/contacts",
                headers={"Authorization": f"Bearer {credentials.get('api_key', '')}"},
                params={"limit": 1}
            )
            if response.status_code == 200:
                return {"success": True, "message": "Conexão com HubSpot estabelecida com sucesso"}
            elif response.status_code == 401:
                return {"success": False, "message": "Token inválido ou expirado"}
            else:
                return {"success": False, "message": f"Erro {response.status_code}: {response.text[:200]}"}
        
        elif provider_id == "pipedrive":
            domain = credentials.get("company_domain", "")
            response = await client.get(
                f"https://{domain}.pipedrive.com/api/v1/users/me",
                params={"api_token": credentials.get("api_key", "")}
            )
            if response.status_code == 200:
                return {"success": True, "message": "Conexão com Pipedrive estabelecida com sucesso"}
            elif response.status_code == 401:
                return {"success": False, "message": "API Token inválido"}
            else:
                return {"success": False, "message": f"Erro {response.status_code}: {response.text[:200]}"}
        
        elif provider_id == "kommo":
            subdomain = credentials.get("subdomain", "")
            response = await client.get(
                f"https://{subdomain}.kommo.com/api/v4/account",
                headers={"Authorization": f"Bearer {credentials.get('api_key', '')}"}
            )
            if response.status_code == 200:
                return {"success": True, "message": "Conexão com Kommo estabelecida com sucesso"}
            elif response.status_code == 401:
                return {"success": False, "message": "Access Token inválido"}
            else:
                return {"success": False, "message": f"Erro {response.status_code}: {response.text[:200]}"}
        
        return {"success": False, "message": "Provedor CRM não suportado para teste"}
    
    except Exception as e:
        return {"success": False, "message": f"Erro: {str(e)}"}


async def _test_ads_connection(provider_id: str, credentials: dict, client: httpx.AsyncClient) -> dict:
    """Test Ads provider connection"""
    try:
        if provider_id == "meta":
            ad_account_id = credentials.get("ad_account_id", "")
            response = await client.get(
                f"https://graph.facebook.com/v18.0/{ad_account_id}",
                params={
                    "access_token": credentials.get("access_token", ""),
                    "fields": "name,account_status"
                }
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True, 
                    "message": f"Conexão com Meta Ads estabelecida. Conta: {data.get('name', 'N/A')}"
                }
            elif response.status_code == 400:
                error = response.json().get("error", {})
                return {"success": False, "message": f"Erro Meta: {error.get('message', 'Token ou Account ID inválido')}"}
            else:
                return {"success": False, "message": f"Erro {response.status_code}"}
        
        elif provider_id == "google":
            # Google Ads requires OAuth flow - simplified test
            return {
                "success": True,
                "message": "Credenciais Google Ads salvas. A validação completa requer o fluxo OAuth."
            }
        
        elif provider_id == "tiktok":
            response = await client.get(
                "https://business-api.tiktok.com/open_api/v1.3/advertiser/info/",
                headers={"Access-Token": credentials.get("access_token", "")},
                params={"advertiser_ids": f'["{credentials.get("advertiser_id", "")}"]'}
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("code") == 0:
                    return {"success": True, "message": "Conexão com TikTok Ads estabelecida"}
                else:
                    return {"success": False, "message": data.get("message", "Erro desconhecido")}
            else:
                return {"success": False, "message": f"Erro {response.status_code}"}
        
        return {"success": False, "message": "Provedor Ads não suportado para teste"}
    
    except Exception as e:
        return {"success": False, "message": f"Erro: {str(e)}"}


async def _sync_crm_data(brand_id: str, provider_id: str, credentials: dict) -> dict:
    """Sync CRM data to the platform"""
    try:
        contacts = []
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            if provider_id == "rdstation":
                response = await client.get(
                    "https://api.rd.services/platform/contacts",
                    headers={"Authorization": f"Bearer {credentials.get('api_key', '')}"},
                    params={"page": 1, "page_size": 100}
                )
                if response.status_code == 200:
                    data = response.json()
                    contacts = data.get("contacts", [])
            
            elif provider_id == "hubspot":
                response = await client.get(
                    "https://api.hubapi.com/crm/v3/objects/contacts",
                    headers={"Authorization": f"Bearer {credentials.get('api_key', '')}"},
                    params={"limit": 100}
                )
                if response.status_code == 200:
                    data = response.json()
                    contacts = data.get("results", [])
            
            elif provider_id == "pipedrive":
                domain = credentials.get("company_domain", "")
                response = await client.get(
                    f"https://{domain}.pipedrive.com/api/v1/persons",
                    params={"api_token": credentials.get("api_key", ""), "limit": 100}
                )
                if response.status_code == 200:
                    data = response.json()
                    contacts = data.get("data", []) or []
        
        # Save contacts to database
        if contacts:
            for contact in contacts:
                contact_doc = {
                    "brand_id": brand_id,
                    "source": provider_id,
                    "external_id": str(contact.get("id", contact.get("uuid", ""))),
                    "data": contact,
                    "synced_at": datetime.now(timezone.utc).isoformat()
                }
                await db.crm_contacts.update_one(
                    {"brand_id": brand_id, "source": provider_id, "external_id": contact_doc["external_id"]},
                    {"$set": contact_doc},
                    upsert=True
                )
        
        return {
            "success": True,
            "message": f"Sincronizados {len(contacts)} contatos do {provider_id}",
            "contacts_synced": len(contacts)
        }
    
    except Exception as e:
        return {"success": False, "message": f"Erro na sincronização: {str(e)}"}


async def _sync_ads_data(brand_id: str, provider_id: str, credentials: dict) -> dict:
    """Sync Ads data to the platform"""
    try:
        campaigns = []
        metrics = []
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            if provider_id == "meta":
                ad_account_id = credentials.get("ad_account_id", "")
                
                # Get campaigns
                response = await client.get(
                    f"https://graph.facebook.com/v18.0/{ad_account_id}/campaigns",
                    params={
                        "access_token": credentials.get("access_token", ""),
                        "fields": "id,name,status,objective,daily_budget,lifetime_budget"
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    campaigns = data.get("data", [])
                
                # Get insights
                response = await client.get(
                    f"https://graph.facebook.com/v18.0/{ad_account_id}/insights",
                    params={
                        "access_token": credentials.get("access_token", ""),
                        "fields": "impressions,clicks,spend,reach,cpc,cpm,ctr",
                        "date_preset": "last_30d"
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    metrics = data.get("data", [])
        
        # Save to database
        if campaigns or metrics:
            ads_doc = {
                "brand_id": brand_id,
                "provider": provider_id,
                "campaigns": campaigns,
                "metrics": metrics,
                "synced_at": datetime.now(timezone.utc).isoformat()
            }
            await db.ads_metrics.update_one(
                {"brand_id": brand_id, "provider": provider_id},
                {"$set": ads_doc},
                upsert=True
            )
        
        return {
            "success": True,
            "message": f"Sincronizados {len(campaigns)} campanhas e métricas do {provider_id}",
            "campaigns_synced": len(campaigns)
        }
    
    except Exception as e:
        return {"success": False, "message": f"Erro na sincronização: {str(e)}"}
