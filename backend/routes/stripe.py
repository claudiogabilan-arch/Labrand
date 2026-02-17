"""
LaBrand - Stripe Payment Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
import os
import logging

from config import db
from utils.helpers import get_current_user, add_ai_credits

router = APIRouter(tags=["Payments"])

# Plan definitions with Stripe Price IDs
SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Grátis",
        "price": 0,
        "currency": "brl",
        "stripe_price_id": None,
        "features": ["1 marca", "Pilares básicos", "Dashboard simplificado"],
        "trial_days": 0
    },
    "essencial": {
        "name": "Essencial",
        "price": 997.00,
        "currency": "brl",
        "stripe_price_id": "price_1T1hUG5XQ1KrllP27JJftGwi",
        "features": ["1 marca", "Todos os pilares", "Brand Strength Score", "Valuation básico", "Relatório PDF"],
        "trial_days": 7
    },
    "executivo": {
        "name": "Executivo", 
        "price": 1997.00,
        "currency": "brl",
        "stripe_price_id": "price_1T1hWU5XQ1KrllP2yLGkblqv",
        "features": ["Até 5 marcas", "Dashboard Executivo", "Benchmark Setorial", "Simulador Estratégico", "Módulo de Risco", "Suporte prioritário"],
        "trial_days": 7
    },
    "enterprise": {
        "name": "Enterprise",
        "price": None,
        "currency": "brl",
        "stripe_price_id": None,
        "features": ["Marcas ilimitadas", "API access", "White label", "Onboarding dedicado", "SLA garantido"],
        "trial_days": 0
    }
}


@router.post("/payments/create-checkout")
async def create_checkout_session(request: Request, data: dict, user: dict = Depends(get_current_user)):
    """Create Stripe checkout session for subscription"""
    from emergentintegrations.payments.stripe import StripeCheckout, CheckoutSessionRequest
    
    plan_id = data.get("plan_id")
    origin_url = data.get("origin_url")
    
    if not plan_id or plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Plano inválido")
    
    plan = SUBSCRIPTION_PLANS[plan_id]
    
    if plan["price"] is None or plan["price"] == 0:
        raise HTTPException(status_code=400, detail="Este plano não requer pagamento")
    
    try:
        stripe_api_key = os.environ.get("STRIPE_API_KEY")
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        success_url = f"{origin_url}/plans?session_id={{CHECKOUT_SESSION_ID}}&success=true"
        cancel_url = f"{origin_url}/plans?canceled=true"
        
        checkout_request = CheckoutSessionRequest(
            amount=plan["price"],
            currency=plan["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user["user_id"],
                "plan_id": plan_id,
                "plan_name": plan["name"]
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        await db.payment_transactions.insert_one({
            "user_id": user["user_id"],
            "session_id": session.session_id,
            "plan_id": plan_id,
            "amount": plan["price"],
            "currency": plan["currency"],
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"checkout_url": session.url, "session_id": session.session_id}
        
    except Exception as e:
        logging.error(f"Checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    from emergentintegrations.payments.stripe import StripeCheckout
    
    try:
        stripe_api_key = os.environ.get("STRIPE_API_KEY")
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logging.info(f"Stripe webhook received: {webhook_response.event_type}")
        
        # Handle checkout.session.completed event
        if webhook_response.event_type == "checkout.session.completed":
            session_id = webhook_response.session_id
            metadata = webhook_response.metadata
            
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "webhook_received_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update user plan or add credits
            if metadata:
                user_id = metadata.get("user_id")
                
                # Check if it's a subscription payment
                plan_id = metadata.get("plan_id")
                if user_id and plan_id and plan_id in SUBSCRIPTION_PLANS:
                    trial_end = datetime.now(timezone.utc) + timedelta(days=SUBSCRIPTION_PLANS[plan_id]["trial_days"])
                    
                    await db.users.update_one(
                        {"user_id": user_id},
                        {"$set": {
                            "plan": plan_id,
                            "plan_name": SUBSCRIPTION_PLANS[plan_id]["name"],
                            "subscription_status": "active",
                            "trial_ends_at": trial_end.isoformat(),
                            "plan_updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                
                # Check if it's a credits purchase
                credits_type = metadata.get("type")
                if credits_type == "ai_credits":
                    credits = int(metadata.get("credits", 0))
                    package_id = metadata.get("package_id", "unknown")
                    if credits > 0:
                        await add_ai_credits(user_id, credits, f"purchase_{package_id}")
        
        return {"status": "success"}
        
    except Exception as e:
        logging.error(f"Stripe webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


@router.get("/payments/history")
async def get_payment_history(user: dict = Depends(get_current_user)):
    """Get user's payment history"""
    transactions = await db.payment_transactions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"transactions": transactions}


@router.get("/subscription/status")
async def get_subscription_status(user: dict = Depends(get_current_user)):
    """Get current subscription status"""
    user_data = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    return {
        "plan": user_data.get("plan", "free"),
        "plan_name": user_data.get("plan_name", "Grátis"),
        "subscription_status": user_data.get("subscription_status", "inactive"),
        "trial_ends_at": user_data.get("trial_ends_at")
    }


@router.get("/subscription/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    plans = []
    for plan_id, plan_data in SUBSCRIPTION_PLANS.items():
        plans.append({
            "id": plan_id,
            "name": plan_data["name"],
            "price": plan_data["price"],
            "currency": plan_data["currency"],
            "features": plan_data["features"],
            "trial_days": plan_data["trial_days"]
        })
    return {"plans": plans}
