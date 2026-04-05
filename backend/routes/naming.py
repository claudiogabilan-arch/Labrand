"""Naming Module Routes - Ferramenta de Naming (Local Generation)"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Naming"])


class NamingProjectCreate(BaseModel):
    project_name: str
    state: Optional[Dict[str, Any]] = None


class NamingProjectStateUpdate(BaseModel):
    state: Dict[str, Any]
    project_name: Optional[str] = None


@router.get("/brands/{brand_id}/naming")
async def get_naming_projects(brand_id: str, page: int = 1, limit: int = 50, user: dict = Depends(get_current_user)):
    skip = (page - 1) * limit
    projects = await db.naming_projects.find(
        {"brand_id": brand_id},
        {"_id": 0}
    ).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"projects": projects}


@router.get("/brands/{brand_id}/naming/{project_id}")
async def get_naming_project(brand_id: str, project_id: str, user: dict = Depends(get_current_user)):
    project = await db.naming_projects.find_one(
        {"brand_id": brand_id, "project_id": project_id},
        {"_id": 0}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return {"project": project}


@router.post("/brands/{brand_id}/naming")
async def create_naming_project(brand_id: str, data: NamingProjectCreate, user: dict = Depends(get_current_user)):
    project_id = f"naming_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    project_doc = {
        "project_id": project_id,
        "brand_id": brand_id,
        "project_name": data.project_name,
        "state": data.state or {},
        "created_at": now,
        "updated_at": now
    }
    await db.naming_projects.insert_one(project_doc)
    project_doc.pop("_id", None)
    return project_doc


@router.put("/brands/{brand_id}/naming/{project_id}/state")
async def update_naming_state(brand_id: str, project_id: str, data: NamingProjectStateUpdate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    update_fields = {"state": data.state, "updated_at": now}
    if data.project_name:
        update_fields["project_name"] = data.project_name
    result = await db.naming_projects.update_one(
        {"project_id": project_id, "brand_id": brand_id},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return {"success": True}


@router.delete("/brands/{brand_id}/naming/{project_id}")
async def delete_naming_project(brand_id: str, project_id: str, user: dict = Depends(get_current_user)):
    await db.naming_projects.delete_one({"project_id": project_id, "brand_id": brand_id})
    # Clean up old naming_names if any exist from previous version
    await db.naming_names.delete_many({"project_id": project_id})
    return {"message": "Projeto removido"}
