"""
LaBrand - Brand Valuation Routes
Adapted from Flask to FastAPI + MongoDB.
Hybrid methodology: financial multiples + brand contribution (RBI) + brand strength (BS).
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["valuation"])

# ── Sector base multiples ──
BASE_MULTIPLES = {
    "servicos":  {"b": 4.8, "min": 3.8, "max": 6.2},
    "saas":      {"b": 5.5, "min": 4.0, "max": 8.0},
    "varejo":    {"b": 3.8, "min": 3.0, "max": 4.8},
    "industria": {"b": 4.5, "min": 3.5, "max": 5.8},
    "saude":     {"b": 7.0, "min": 5.5, "max": 9.5},
    "agro":      {"b": 7.5, "min": 6.0, "max": 10.0},
    "educacao":  {"b": 5.0, "min": 4.0, "max": 6.5},
    "outro":     {"b": 4.5, "min": 3.5, "max": 5.8},
}
CRESC_ADJ  = {-1: -0.8, 0: 0.0, 1: 0.0, 2: 0.6, 3: 1.0}
RECORR_ADJ = {0: -0.5, 1: -0.2, 2: 0.0, 3: 0.5, 4: 1.0}


def compute_valuation(data: dict) -> dict:
    """Core valuation calculation – kept identical to the original logic."""
    receita  = float(data.get("receita", 0) or 0)
    ebitda   = float(data.get("ebitda", 0) or 0)
    divida   = float(data.get("divida", 0) or 0)
    setor    = data.get("setor", "outro")
    cresc    = int(data.get("crescimento", 1) or 1)
    recorr   = int(data.get("recorrencia", 2) or 2)

    base = BASE_MULTIPLES.get(setor, BASE_MULTIPLES["outro"])
    adj = 0.0

    # Profit margin adjustment
    margem = ebitda / receita if receita > 0 else 0
    if margem < 0.08:
        adj -= 1.2
    elif margem < 0.12:
        adj -= 0.4
    elif margem >= 0.28:
        adj += 1.5
    elif margem >= 0.20:
        adj += 0.8

    adj += CRESC_ADJ.get(cresc, 0)
    adj += RECORR_ADJ.get(recorr, 0)

    # Debt / EBITDA
    dl_ratio = divida / ebitda if ebitda > 0 else 0
    if dl_ratio > 2.5:
        adj -= 0.8
    elif dl_ratio < 1.0:
        adj += 0.3

    mult_final = max(1.5, base["b"] + adj)
    mult_min   = max(1.0, base["min"] + adj - 0.5)
    mult_max   = base["max"] + adj + 0.5

    ev_min = max(0, ebitda * mult_min - divida)
    ev_mid = max(0, ebitda * mult_final - divida)
    ev_max = max(0, ebitda * mult_max - divida)

    # RBI (Brand Contribution) – 5 questions
    rbi_qs = [int(data.get(f"rbi_q{i}", 35) or 35) for i in range(1, 6)]
    rbi_score = round(sum(rbi_qs) / 5)

    # BS (Brand Strength) – 10 Interbrand factors
    bs_fields = ["clareza", "comprom", "governa", "respons", "autent",
                 "relev", "diferenc", "consist", "presenca", "engaj"]
    bs_vals = [int(data.get(f"bs_{f}", 50) or 50) for f in bs_fields]
    bs_score = round(sum(bs_vals) / len(bs_fields))

    rbi_pct = rbi_score / 100
    bs_mult = 0.5 + (bs_score / 100) * 1.5

    brand_min = max(0, ev_min * rbi_pct * (bs_mult * 0.85))
    brand_mid = max(0, ev_mid * rbi_pct * bs_mult)
    brand_max = max(0, ev_max * rbi_pct * (bs_mult * 1.15))
    brand_share_pct = round(brand_mid / ev_mid * 100) if ev_mid > 0 else 0

    return {
        "multiplo_final":  round(mult_final, 2),
        "ev_min":          round(ev_min, 2),
        "ev_mid":          round(ev_mid, 2),
        "ev_max":          round(ev_max, 2),
        "rbi_score":       rbi_score,
        "bs_score":        bs_score,
        "brand_min":       round(brand_min, 2),
        "brand_mid":       round(brand_mid, 2),
        "brand_max":       round(brand_max, 2),
        "brand_share_pct": brand_share_pct,
    }


class ValuationCreate(BaseModel):
    brand_id: str
    marca: str
    setor: Optional[str] = "outro"
    receita: Optional[float] = 0
    ebitda: Optional[float] = 0
    divida: Optional[float] = 0
    crescimento: Optional[int] = 1
    recorrencia: Optional[int] = 2
    metodo: Optional[str] = "mult"
    rbi_q1: Optional[int] = 35
    rbi_q2: Optional[int] = 35
    rbi_q3: Optional[int] = 35
    rbi_q4: Optional[int] = 35
    rbi_q5: Optional[int] = 35
    bs_clareza: Optional[int] = 50
    bs_comprom: Optional[int] = 50
    bs_governa: Optional[int] = 50
    bs_respons: Optional[int] = 50
    bs_autent: Optional[int] = 50
    bs_relev: Optional[int] = 50
    bs_diferenc: Optional[int] = 50
    bs_consist: Optional[int] = 50
    bs_presenca: Optional[int] = 50
    bs_engaj: Optional[int] = 50


@router.get("/brands/{brand_id}/valuations")
async def list_valuations(brand_id: str, user: dict = Depends(get_current_user)):
    vals = await db.brand_valuations.find(
        {"brand_id": brand_id}, {"_id": 0}
    ).sort("updated_at", -1).to_list(50)
    return vals


@router.get("/brands/{brand_id}/valuations/{valuation_id}")
async def get_valuation(brand_id: str, valuation_id: str, user: dict = Depends(get_current_user)):
    val = await db.brand_valuations.find_one(
        {"brand_id": brand_id, "valuation_id": valuation_id}, {"_id": 0}
    )
    if not val:
        raise HTTPException(status_code=404, detail="Valuation nao encontrada")
    return val


@router.post("/brands/{brand_id}/valuations")
async def create_valuation(brand_id: str, data: ValuationCreate, user: dict = Depends(get_current_user)):
    calc = compute_valuation(data.dict())
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "valuation_id": f"val_{uuid.uuid4().hex[:12]}",
        "brand_id": brand_id,
        "user_id": user["user_id"],
        **data.dict(),
        **calc,
        "created_at": now,
        "updated_at": now,
    }
    await db.brand_valuations.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/brands/{brand_id}/valuations/{valuation_id}")
async def update_valuation(brand_id: str, valuation_id: str, data: ValuationCreate, user: dict = Depends(get_current_user)):
    existing = await db.brand_valuations.find_one(
        {"brand_id": brand_id, "valuation_id": valuation_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Valuation nao encontrada")

    calc = compute_valuation(data.dict())
    now = datetime.now(timezone.utc).isoformat()

    update = {**data.dict(), **calc, "updated_at": now}
    await db.brand_valuations.update_one(
        {"valuation_id": valuation_id},
        {"$set": update},
    )

    result = await db.brand_valuations.find_one(
        {"valuation_id": valuation_id}, {"_id": 0}
    )
    return result


@router.delete("/brands/{brand_id}/valuations/{valuation_id}")
async def delete_valuation(brand_id: str, valuation_id: str, user: dict = Depends(get_current_user)):
    result = await db.brand_valuations.delete_one(
        {"brand_id": brand_id, "valuation_id": valuation_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Valuation nao encontrada")
    return {"deleted": True, "valuation_id": valuation_id}


@router.get("/valuation/sectors")
async def get_sectors():
    """Return available sectors and their base multiples"""
    return {
        "sectors": [
            {"key": "servicos",  "label": "Servicos",   "mult": BASE_MULTIPLES["servicos"]},
            {"key": "saas",      "label": "SaaS/Tech",  "mult": BASE_MULTIPLES["saas"]},
            {"key": "varejo",    "label": "Varejo",      "mult": BASE_MULTIPLES["varejo"]},
            {"key": "industria", "label": "Industria",   "mult": BASE_MULTIPLES["industria"]},
            {"key": "saude",     "label": "Saude",       "mult": BASE_MULTIPLES["saude"]},
            {"key": "agro",      "label": "Agro",        "mult": BASE_MULTIPLES["agro"]},
            {"key": "educacao",  "label": "Educacao",    "mult": BASE_MULTIPLES["educacao"]},
            {"key": "outro",     "label": "Outro",       "mult": BASE_MULTIPLES["outro"]},
        ]
    }
