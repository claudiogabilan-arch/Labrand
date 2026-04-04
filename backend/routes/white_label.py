"""
LaBrand - White-Label Configuration Routes
Phase 1: Custom logos, primary colors, and accent colors per brand.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from config import db
from utils.helpers import get_current_user
from routes.permissions import require_permission

router = APIRouter(tags=["white-label"])


class WhiteLabelUpdate(BaseModel):
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    sidebar_color: Optional[str] = None
    sidebar_text_color: Optional[str] = None
    header_color: Optional[str] = None
    button_radius: Optional[str] = None
    font_heading: Optional[str] = None
    font_body: Optional[str] = None


@router.get("/brands/{brand_id}/white-label")
async def get_white_label(brand_id: str, user: dict = Depends(get_current_user)):
    """Get white-label settings for a brand"""
    brand = await db.brands.find_one({"brand_id": brand_id}, {"_id": 0, "white_label": 1, "logo_url": 1, "name": 1})
    if not brand:
        raise HTTPException(status_code=404, detail="Marca nao encontrada")

    wl = brand.get("white_label", {})
    return {
        "brand_id": brand_id,
        "logo_url": brand.get("logo_url"),
        "primary_color": wl.get("primary_color"),
        "accent_color": wl.get("accent_color"),
        "sidebar_color": wl.get("sidebar_color"),
        "sidebar_text_color": wl.get("sidebar_text_color"),
        "header_color": wl.get("header_color"),
        "button_radius": wl.get("button_radius", "0.5rem"),
        "font_heading": wl.get("font_heading"),
        "font_body": wl.get("font_body"),
        "enabled": wl.get("enabled", False),
    }


@router.put("/brands/{brand_id}/white-label")
async def update_white_label(
    brand_id: str,
    data: WhiteLabelUpdate,
    user: dict = Depends(get_current_user),
):
    """Update white-label settings for a brand (owner/admin only)"""
    await require_permission(user, brand_id, "white_label", "full")

    update_fields = {k: v for k, v in data.dict().items() if v is not None}
    if not update_fields:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    update_fields["enabled"] = True
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.brands.update_one(
        {"brand_id": brand_id},
        {"$set": {f"white_label.{k}": v for k, v in update_fields.items()}},
    )

    return await get_white_label(brand_id, user)


@router.delete("/brands/{brand_id}/white-label")
async def reset_white_label(brand_id: str, user: dict = Depends(get_current_user)):
    """Reset white-label settings to defaults"""
    await require_permission(user, brand_id, "white_label", "full")

    await db.brands.update_one(
        {"brand_id": brand_id},
        {"$unset": {"white_label": 1}},
    )

    return {"message": "White-label resetado para os padroes", "brand_id": brand_id}
