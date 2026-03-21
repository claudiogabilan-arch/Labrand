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
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    package_id = data.get("package_id")
    origin_url = data.get("origin_url")
    
    if not origin_url:
        raise HTTPException(status_code=400, detail="origin_url é obrigatório")
    
    if package_id not in CREDIT_PACKAGES:
        raise HTTPException(status_code=400, detail="Pacote inválido")
    
    package = CREDIT_PACKAGES[package_id]
    
    try:
        stripe_api_key = os.environ.get("STRIPE_API_KEY")
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Stripe não configurado")
        
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        success_url = f"{origin_url}/ai-credits?session_id={{CHECKOUT_SESSION_ID}}&success=true"
        cancel_url = f"{origin_url}/ai-credits?canceled=true"
        
        checkout_request = CheckoutSessionRequest(
            amount=float(package["price"]),
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
        
        # Record the transaction as pending
        await db.payment_transactions.insert_one({
            "session_id": session.session_id,
            "user_id": user["user_id"],
            "email": user.get("email", ""),
            "package_id": package_id,
            "credits": package["credits"],
            "amount": float(package["price"]),
            "currency": "brl",
            "payment_status": "pending",
            "status": "initiated",
            "metadata": {
                "type": "ai_credits",
                "package_id": package_id,
                "credits": str(package["credits"])
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"checkout_url": session.url, "session_id": session.session_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"AI credits purchase error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar sessão de pagamento: {str(e)}")


@router.get("/ai-credits/checkout-status/{session_id}")
async def check_checkout_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Check the status of a Stripe checkout session and fulfill if paid"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe não configurado")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Check if already fulfilled to prevent double-crediting
        existing = await db.payment_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        
        already_fulfilled = existing and existing.get("status") == "fulfilled"
        
        if status.payment_status == "paid" and not already_fulfilled:
            # Fulfill the order - add credits
            credits_to_add = int(status.metadata.get("credits", "0"))
            target_user_id = status.metadata.get("user_id", user["user_id"])
            
            if credits_to_add > 0:
                await add_ai_credits(target_user_id, credits_to_add, "purchase", f"Compra de {credits_to_add} créditos")
            
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "status": "fulfilled",
                    "fulfilled_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        elif existing and status.payment_status != "paid":
            # Update status if changed
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": status.payment_status,
                    "status": status.status
                }}
            )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "fulfilled": already_fulfilled or status.payment_status == "paid"
        }
        
    except Exception as e:
        logging.error(f"Checkout status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature", "")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            # Check if already fulfilled
            existing = await db.payment_transactions.find_one(
                {"session_id": webhook_response.session_id},
                {"_id": 0}
            )
            
            if existing and existing.get("status") != "fulfilled":
                credits_to_add = int(webhook_response.metadata.get("credits", "0"))
                target_user_id = webhook_response.metadata.get("user_id", "")
                
                if credits_to_add > 0 and target_user_id:
                    await add_ai_credits(target_user_id, credits_to_add, "purchase", f"Compra de {credits_to_add} créditos (webhook)")
                
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "status": "fulfilled",
                        "fulfilled_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        return {"received": True}
        
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        return {"received": True, "error": str(e)}
