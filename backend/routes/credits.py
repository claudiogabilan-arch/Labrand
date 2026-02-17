"""
LaBrand - AI Credits Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
import os
import logging

from config import db, CREDIT_PACKAGES
from utils.helpers import get_current_user, add_ai_credits

router = APIRouter(tags=["AI Credits"])


@router.get("/ai-credits/balance")
async def get_ai_credits_balance(user: dict = Depends(get_current_user)):
    """Get user's AI credits balance"""
    credits_data = await db.ai_credits.find_one({"user_id": user["user_id"]})
    
    if not credits_data:
        # Initialize with 50 free credits for new users
        credits_data = {
            "user_id": user["user_id"],
            "total_credits": 50,
            "used_credits": 0,
            "available_credits": 50,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.ai_credits.insert_one(credits_data)
    
    return {
        "total_credits": credits_data.get("total_credits", 0),
        "used_credits": credits_data.get("used_credits", 0),
        "available_credits": credits_data.get("available_credits", 0)
    }


@router.get("/ai-credits/history")
async def get_ai_credits_history(user: dict = Depends(get_current_user)):
    """Get AI credits usage history"""
    history = await db.ai_credits_history.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"history": history}


@router.post("/ai-credits/purchase")
async def purchase_ai_credits(request: Request, data: dict, user: dict = Depends(get_current_user)):
    """Purchase AI credits via Stripe"""
    from emergentintegrations.payments.stripe import StripeCheckout, CheckoutSessionRequest
    
    package_id = data.get("package_id")
    origin_url = data.get("origin_url", os.environ.get("FRONTEND_URL"))
    
    if package_id not in CREDIT_PACKAGES:
        raise HTTPException(status_code=400, detail="Pacote inválido")
    
    package = CREDIT_PACKAGES[package_id]
    
    try:
        stripe_api_key = os.environ.get("STRIPE_API_KEY")
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        success_url = f"{origin_url}/ai-credits?session_id={{CHECKOUT_SESSION_ID}}&success=true"
        cancel_url = f"{origin_url}/ai-credits?canceled=true"
        
        checkout_request = CheckoutSessionRequest(
            amount=package["price"],
            currency="brl",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user["user_id"],
                "type": "ai_credits",
                "package_id": package_id,
                "credits": str(package["credits"])
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        return {"checkout_url": session.url, "session_id": session.session_id}
        
    except Exception as e:
        logging.error(f"AI credits purchase error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
