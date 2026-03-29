"""ClickUp OAuth 2.0 Integration Routes"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone
import httpx
import os
import logging

from config import db
from utils.helpers import get_current_user

router = APIRouter(prefix="/integrations/clickup", tags=["ClickUp"])
logger = logging.getLogger(__name__)

CLICKUP_CLIENT_ID = os.environ.get("CLICKUP_CLIENT_ID")
CLICKUP_CLIENT_SECRET = os.environ.get("CLICKUP_CLIENT_SECRET")
CLICKUP_API = "https://api.clickup.com/api/v2"


def _get_redirect_uri(request: Request) -> str:
    origin = request.headers.get("origin", "")
    referer = request.headers.get("referer", "")
    if origin:
        base = origin.rstrip("/")
    elif referer:
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        base = f"{parsed.scheme}://{parsed.netloc}"
    else:
        base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    return f"{base}/integracoes/clickup/callback"


@router.get("/auth-url")
async def get_clickup_auth_url(brand_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Generate ClickUp OAuth authorization URL"""
    if not CLICKUP_CLIENT_ID:
        raise HTTPException(status_code=500, detail="ClickUp não configurado no servidor")
    redirect_uri = _get_redirect_uri(request)
    auth_url = (
        f"https://app.clickup.com/api?client_id={CLICKUP_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&state={brand_id}"
    )
    return {"auth_url": auth_url, "redirect_uri": redirect_uri}


@router.post("/callback")
async def clickup_oauth_callback(data: dict, request: Request, user: dict = Depends(get_current_user)):
    """Exchange authorization code for access token"""
    code = data.get("code")
    brand_id = data.get("brand_id")
    if not code or not brand_id:
        raise HTTPException(status_code=400, detail="code e brand_id são obrigatórios")

    redirect_uri = _get_redirect_uri(request)

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(f"{CLICKUP_API}/oauth/token", params={
            "client_id": CLICKUP_CLIENT_ID,
            "client_secret": CLICKUP_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
        })

    if resp.status_code != 200:
        logger.error(f"ClickUp token exchange failed: {resp.status_code} {resp.text}")
        raise HTTPException(status_code=400, detail=f"Erro ao obter token ClickUp: {resp.text}")

    token_data = resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="Token não recebido do ClickUp")

    await db.clickup_integrations.update_one(
        {"brand_id": brand_id},
        {"$set": {
            "brand_id": brand_id,
            "access_token": access_token,
            "connected_by": user["user_id"],
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "status": "connected",
            "selected_list_id": None,
            "selected_list_name": None,
        }},
        upsert=True,
    )
    return {"success": True, "message": "ClickUp conectado com sucesso!"}


@router.get("/status/{brand_id}")
async def get_clickup_status(brand_id: str, user: dict = Depends(get_current_user)):
    """Check if ClickUp is connected for a brand"""
    integration = await db.clickup_integrations.find_one(
        {"brand_id": brand_id},
        {"_id": 0, "access_token": 0},
    )
    if not integration or integration.get("status") != "connected":
        return {"connected": False}
    return {
        "connected": True,
        "connected_at": integration.get("connected_at"),
        "selected_list_id": integration.get("selected_list_id"),
        "selected_list_name": integration.get("selected_list_name"),
    }


async def _clickup_get(brand_id: str, path: str):
    """Helper to make authenticated GET requests to ClickUp API"""
    integration = await db.clickup_integrations.find_one({"brand_id": brand_id})
    if not integration or not integration.get("access_token"):
        raise HTTPException(status_code=400, detail="ClickUp não conectado")
    token = integration["access_token"]
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{CLICKUP_API}{path}",
            headers={"Authorization": token},
        )
    if resp.status_code == 401:
        await db.clickup_integrations.update_one(
            {"brand_id": brand_id}, {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=401, detail="Token ClickUp expirado. Reconecte.")
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])
    return resp.json()


@router.get("/workspaces/{brand_id}")
async def get_workspaces(brand_id: str, user: dict = Depends(get_current_user)):
    """Get ClickUp workspaces (teams)"""
    data = await _clickup_get(brand_id, "/team")
    teams = data.get("teams", [])
    return [{"id": t["id"], "name": t["name"]} for t in teams]


@router.get("/spaces/{brand_id}/{team_id}")
async def get_spaces(brand_id: str, team_id: str, user: dict = Depends(get_current_user)):
    """Get spaces in a workspace"""
    data = await _clickup_get(brand_id, f"/team/{team_id}/space?archived=false")
    spaces = data.get("spaces", [])
    return [{"id": s["id"], "name": s["name"]} for s in spaces]


@router.get("/folders/{brand_id}/{space_id}")
async def get_folders(brand_id: str, space_id: str, user: dict = Depends(get_current_user)):
    """Get folders in a space"""
    data = await _clickup_get(brand_id, f"/space/{space_id}/folder?archived=false")
    folders = data.get("folders", [])
    result = []
    for f in folders:
        lists = [{"id": l["id"], "name": l["name"]} for l in f.get("lists", [])]
        result.append({"id": f["id"], "name": f["name"], "lists": lists})
    return result


@router.get("/lists/{brand_id}/{space_id}")
async def get_folderless_lists(brand_id: str, space_id: str, user: dict = Depends(get_current_user)):
    """Get folderless lists in a space"""
    data = await _clickup_get(brand_id, f"/space/{space_id}/list?archived=false")
    lists = data.get("lists", [])
    return [{"id": l["id"], "name": l["name"]} for l in lists]


@router.post("/select-list/{brand_id}")
async def select_list(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Save the selected ClickUp list for task sync"""
    list_id = data.get("list_id")
    list_name = data.get("list_name", "")
    if not list_id:
        raise HTTPException(status_code=400, detail="list_id obrigatório")
    await db.clickup_integrations.update_one(
        {"brand_id": brand_id},
        {"$set": {
            "selected_list_id": list_id,
            "selected_list_name": list_name,
        }},
    )
    return {"success": True, "message": f"Lista '{list_name}' selecionada para sincronização"}


@router.post("/sync-task/{brand_id}")
async def sync_task_to_clickup(brand_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Create a task in the selected ClickUp list"""
    integration = await db.clickup_integrations.find_one({"brand_id": brand_id})
    if not integration or integration.get("status") != "connected":
        raise HTTPException(status_code=400, detail="ClickUp não conectado")

    list_id = integration.get("selected_list_id")
    if not list_id:
        raise HTTPException(status_code=400, detail="Nenhuma lista selecionada no ClickUp")

    token = integration["access_token"]
    priority_map = {"low": 4, "medium": 3, "high": 2, "urgent": 1}

    task_payload = {
        "name": data.get("title", "Tarefa LABrand"),
        "description": data.get("description", ""),
        "priority": priority_map.get(data.get("priority", "medium"), 3),
    }
    if data.get("due_date"):
        try:
            from datetime import datetime as dt
            d = dt.fromisoformat(data["due_date"])
            task_payload["due_date"] = int(d.timestamp() * 1000)
            task_payload["due_date_time"] = False
        except Exception:
            pass

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{CLICKUP_API}/list/{list_id}/task",
            headers={"Authorization": token, "Content-Type": "application/json"},
            json=task_payload,
        )

    if resp.status_code not in (200, 201):
        logger.error(f"ClickUp create task failed: {resp.status_code} {resp.text}")
        raise HTTPException(status_code=resp.status_code, detail="Erro ao criar tarefa no ClickUp")

    clickup_task = resp.json()
    return {
        "success": True,
        "clickup_task_id": clickup_task.get("id"),
        "clickup_url": clickup_task.get("url"),
        "message": "Tarefa sincronizada com ClickUp!",
    }


@router.delete("/disconnect/{brand_id}")
async def disconnect_clickup(brand_id: str, user: dict = Depends(get_current_user)):
    """Disconnect ClickUp integration"""
    await db.clickup_integrations.delete_one({"brand_id": brand_id})
    return {"success": True, "message": "ClickUp desconectado"}
