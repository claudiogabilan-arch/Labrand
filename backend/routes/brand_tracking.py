"""Brand Tracking Routes - Continuous brand evolution monitoring"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

from config import db
from utils.helpers import get_current_user

router = APIRouter(tags=["Brand Tracking"])


class TrackingSnapshot(BaseModel):
    notes: Optional[str] = None


@router.get("/brands/{brand_id}/tracking/history")
async def get_tracking_history(brand_id: str, months: int = 6, user: dict = Depends(get_current_user)):
    """Get brand score evolution over time"""
    # Get historical snapshots
    snapshots = await db.brand_tracking.find(
        {"brand_id": brand_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(months * 4)  # Up to weekly snapshots
    
    if not snapshots:
        # Generate initial data from current scores
        snapshots = await generate_initial_tracking(brand_id)
    
    return {
        "snapshots": snapshots,
        "total": len(snapshots),
        "period_months": months
    }


@router.post("/brands/{brand_id}/tracking/snapshot")
async def create_tracking_snapshot(brand_id: str, data: TrackingSnapshot, user: dict = Depends(get_current_user)):
    """Create a manual tracking snapshot"""
    # Collect current scores
    scores = await collect_current_scores(brand_id)
    
    snapshot = {
        "snapshot_id": f"snap_{uuid.uuid4().hex[:12]}",
        "brand_id": brand_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["user_id"],
        "notes": data.notes,
        "type": "manual",
        **scores
    }
    
    await db.brand_tracking.insert_one(snapshot)
    
    return {"success": True, "snapshot": {k: v for k, v in snapshot.items() if k != "_id"}}


@router.get("/brands/{brand_id}/tracking/comparison")
async def get_tracking_comparison(brand_id: str, user: dict = Depends(get_current_user)):
    """Compare current vs previous period"""
    snapshots = await db.brand_tracking.find(
        {"brand_id": brand_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(2)
    
    if len(snapshots) < 2:
        # Generate comparison data
        current = await collect_current_scores(brand_id)
        previous = {k: max(0, v - 5) for k, v in current.items() if isinstance(v, (int, float))}
        return {
            "current": current,
            "previous": previous,
            "changes": {k: current.get(k, 0) - previous.get(k, 0) for k in current if isinstance(current.get(k), (int, float))}
        }
    
    current = snapshots[0]
    previous = snapshots[1]
    
    changes = {}
    for key in ["brand_score", "brand_equity", "maturity_score", "pillar_completion"]:
        curr_val = current.get(key, 0)
        prev_val = previous.get(key, 0)
        if isinstance(curr_val, (int, float)) and isinstance(prev_val, (int, float)):
            changes[key] = round(curr_val - prev_val, 1)
    
    return {
        "current": current,
        "previous": previous,
        "changes": changes,
        "period": {
            "current_date": current.get("created_at"),
            "previous_date": previous.get("created_at")
        }
    }


@router.get("/brands/{brand_id}/tracking/alerts")
async def get_tracking_alerts(brand_id: str, user: dict = Depends(get_current_user)):
    """Get alerts based on tracking changes"""
    comparison = await get_tracking_comparison(brand_id, user)
    changes = comparison.get("changes", {})
    
    alerts = []
    
    # Check for significant drops
    if changes.get("brand_score", 0) < -5:
        alerts.append({
            "type": "warning",
            "metric": "brand_score",
            "message": f"Brand Score caiu {abs(changes['brand_score'])} pontos",
            "recommendation": "Revise os pilares de marca e identifique áreas que precisam de atenção"
        })
    
    if changes.get("maturity_score", 0) < -10:
        alerts.append({
            "type": "critical",
            "metric": "maturity_score",
            "message": f"Maturidade caiu {abs(changes['maturity_score'])} pontos",
            "recommendation": "Execute um novo diagnóstico de maturidade para entender as causas"
        })
    
    # Check for improvements
    if changes.get("brand_score", 0) > 5:
        alerts.append({
            "type": "success",
            "metric": "brand_score",
            "message": f"Brand Score subiu {changes['brand_score']} pontos!",
            "recommendation": "Continue com as ações que estão funcionando"
        })
    
    if changes.get("pillar_completion", 0) > 10:
        alerts.append({
            "type": "success",
            "metric": "pillar_completion",
            "message": f"Completude dos pilares aumentou {changes['pillar_completion']}%",
            "recommendation": "Ótimo progresso! Continue preenchendo os pilares restantes"
        })
    
    # Check for stagnation
    all_zero = all(v == 0 for v in changes.values())
    if all_zero and comparison.get("current", {}).get("brand_score", 0) < 70:
        alerts.append({
            "type": "info",
            "metric": "general",
            "message": "Métricas estáveis, mas há espaço para crescimento",
            "recommendation": "Considere investir em ações de fortalecimento de marca"
        })
    
    return {"alerts": alerts, "total": len(alerts)}


async def collect_current_scores(brand_id: str) -> dict:
    """Collect all current brand scores"""
    # Get brand score
    brand_score_data = await db.brand_scores.find_one({"brand_id": brand_id}, {"_id": 0})
    brand_score = brand_score_data.get("overall_score", 0) if brand_score_data else 0
    
    # Get brand equity
    brand_equity_data = await db.brand_equity.find_one({"brand_id": brand_id}, {"_id": 0})
    brand_equity = brand_equity_data.get("total_score", 0) if brand_equity_data else 0
    
    # Get maturity score
    maturity_data = await db.maturity_results.find_one({"brand_id": brand_id}, {"_id": 0})
    maturity_score = maturity_data.get("overall_score", 0) if maturity_data else 0
    
    # Get pillar completion
    pillars = await db.pillars.find_one({"brand_id": brand_id}, {"_id": 0})
    pillar_keys = ["start", "values", "purpose", "promise", "positioning", "personality", "universality"]
    pillars_filled = 0
    if pillars:
        for key in pillar_keys:
            pillar_data = pillars.get(key, {})
            if pillar_data and len(pillar_data) > 0:
                pillars_filled += 1
    pillar_completion = int((pillars_filled / len(pillar_keys)) * 100)
    
    # Get touchpoints count
    touchpoints_count = await db.touchpoints.count_documents({"brand_id": brand_id})
    
    # Get CRM contacts
    crm_contacts = await db.crm_contacts.count_documents({"brand_id": brand_id})
    
    return {
        "brand_score": brand_score,
        "brand_equity": brand_equity,
        "maturity_score": maturity_score,
        "pillar_completion": pillar_completion,
        "touchpoints_count": touchpoints_count,
        "crm_contacts": crm_contacts
    }


async def generate_initial_tracking(brand_id: str) -> list:
    """Generate initial tracking data based on current state"""
    current = await collect_current_scores(brand_id)
    now = datetime.now(timezone.utc)
    
    snapshots = []
    
    # Generate 6 months of simulated history
    for i in range(6):
        date = now - timedelta(days=30 * i)
        # Simulate gradual improvement
        factor = 1 - (i * 0.08)  # Each month back is 8% lower
        
        snapshot = {
            "snapshot_id": f"snap_auto_{uuid.uuid4().hex[:8]}",
            "brand_id": brand_id,
            "created_at": date.isoformat(),
            "type": "auto",
            "brand_score": max(0, int(current["brand_score"] * factor)),
            "brand_equity": max(0, int(current["brand_equity"] * factor)),
            "maturity_score": max(0, int(current["maturity_score"] * factor)),
            "pillar_completion": max(0, int(current["pillar_completion"] * factor)),
            "touchpoints_count": max(0, int(current["touchpoints_count"] * factor)),
            "crm_contacts": max(0, int(current["crm_contacts"] * factor))
        }
        snapshots.append(snapshot)
    
    # Save the generated snapshots
    if snapshots:
        await db.brand_tracking.insert_many(snapshots)
    
    return snapshots
