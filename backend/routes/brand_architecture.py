"""
LaBrand - Brand Architecture Routes
Manages brand architecture types and product/sub-brand portfolio.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["architecture"])


class ProductCreate(BaseModel):
    name: str
    type: Optional[str] = "produto"        # produto | servico | sub_marca
    relation: Optional[str] = "extensao"   # extensao | endossada | independente | parceria
    ticket_medio: Optional[float] = 0
    channel: Optional[str] = "ambos"       # online | offline | ambos
    markets: Optional[List[str]] = []


class ArchitectureUpdate(BaseModel):
    arch_type: Optional[str] = None        # mono | endo | ind
    hq_country: Optional[str] = None
    global_ops: Optional[bool] = None
    intl_countries: Optional[List[str]] = None
    products: Optional[List[ProductCreate]] = None


@router.get("/brands/{brand_id}/architecture")
async def get_architecture(brand_id: str, user: dict = Depends(get_current_user)):
    arch = await db.brand_architecture.find_one(
        {"brand_id": brand_id}, {"_id": 0}
    )
    if not arch:
        return {
            "brand_id": brand_id,
            "arch_type": None,
            "hq_country": None,
            "global_ops": False,
            "intl_countries": [],
            "products": [],
        }
    return arch


@router.put("/brands/{brand_id}/architecture")
async def update_architecture(brand_id: str, data: ArchitectureUpdate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    update_fields = {}

    for key, val in data.dict(exclude_none=True).items():
        if key == "products":
            update_fields["products"] = [
                {**p, "product_id": f"prod_{uuid.uuid4().hex[:8]}"} for p in val
            ]
        else:
            update_fields[key] = val

    update_fields["updated_at"] = now

    await db.brand_architecture.update_one(
        {"brand_id": brand_id},
        {"$set": update_fields, "$setOnInsert": {"brand_id": brand_id, "created_at": now}},
        upsert=True,
    )

    return await get_architecture(brand_id, user)


@router.post("/brands/{brand_id}/architecture/products")
async def add_product(brand_id: str, data: ProductCreate, user: dict = Depends(get_current_user)):
    product = {**data.dict(), "product_id": f"prod_{uuid.uuid4().hex[:8]}"}
    now = datetime.now(timezone.utc).isoformat()

    await db.brand_architecture.update_one(
        {"brand_id": brand_id},
        {
            "$push": {"products": product},
            "$set": {"updated_at": now},
            "$setOnInsert": {"brand_id": brand_id, "created_at": now},
        },
        upsert=True,
    )
    return product


@router.delete("/brands/{brand_id}/architecture/products/{product_id}")
async def remove_product(brand_id: str, product_id: str, user: dict = Depends(get_current_user)):
    result = await db.brand_architecture.update_one(
        {"brand_id": brand_id},
        {"$pull": {"products": {"product_id": product_id}}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    return {"deleted": True, "product_id": product_id}
