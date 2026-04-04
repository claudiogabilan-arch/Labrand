"""
LaBrand - Brand OS API
Main Application Entry Point

This file has been refactored from a 3000+ line monolithic file into modular routers.
"""
from fastapi import FastAPI, APIRouter
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import logging
import os

from config import db, client, logger

# Import routers
from routes.auth import router as auth_router
from routes.brands import router as brands_router
from routes.pillars import router as pillars_router
from routes.ai import router as ai_router
from routes.credits import router as credits_router
from routes.maturity import router as maturity_router
from routes.brand_tools import router as brand_tools_router
from routes.brand_equity import router as brand_equity_router
from routes.email_alerts import router as email_alerts_router
from routes.culture import router as culture_router
from routes.academy import router as academy_router
from routes.ads import router as ads_router
from routes.crm import router as crm_router
from routes.touchpoints import router as touchpoints_router
from routes.admin import router as admin_router
from routes.extras import router as extras_router
from routes.naming import router as naming_router
from routes.reports import router as reports_router
from routes.team import router as team_router
from routes.brand_tracking import router as brand_tracking_router
from routes.disaster_check import router as disaster_check_router
from routes.value_waves import router as value_waves_router
from routes.brand_funnel import router as brand_funnel_router
from routes.integrations import router as integrations_router
from routes.social_listening import router as social_listening_router
from routes.share_of_voice import router as share_of_voice_router
from routes.conversion_attributes import router as conversion_attributes_router
from routes.bvs import router as bvs_router
from routes.brand_health import router as brand_health_router
from routes.admin_emails import router as admin_emails_router
from routes.collaboration import router as collaboration_router
from routes.notifications import router as notifications_router
from routes.clickup import router as clickup_router
from routes.social_fetcher import router as social_fetcher_router
from routes.campaigns import router as campaigns_router
from routes.permissions import router as permissions_router
from routes.white_label import router as white_label_router

# Create the main app
app = FastAPI(title="LaBrand - Brand OS API")


# Root health check - Required for Kubernetes health probes
@app.get("/health")
async def root_health_check():
    """Health check endpoint for Kubernetes probes"""
    return {"status": "healthy", "service": "labrand-api"}


# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Health check endpoint
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "labrand-api"}


@api_router.get("/")
async def root():
    return {"message": "LaBrand API", "version": "2.0", "status": "refactored"}


# Include all routers
api_router.include_router(auth_router)
api_router.include_router(brands_router)
api_router.include_router(pillars_router)
api_router.include_router(ai_router)
api_router.include_router(credits_router)
api_router.include_router(maturity_router)
api_router.include_router(brand_tools_router)
api_router.include_router(brand_equity_router)
api_router.include_router(email_alerts_router)
api_router.include_router(culture_router)
api_router.include_router(academy_router)
api_router.include_router(ads_router)
api_router.include_router(crm_router)
api_router.include_router(touchpoints_router)
api_router.include_router(admin_router)
api_router.include_router(extras_router)
api_router.include_router(naming_router)
api_router.include_router(reports_router)
api_router.include_router(team_router)
api_router.include_router(brand_tracking_router)
api_router.include_router(disaster_check_router)
api_router.include_router(value_waves_router)
api_router.include_router(brand_funnel_router)
api_router.include_router(integrations_router)
api_router.include_router(social_listening_router)
api_router.include_router(share_of_voice_router)
api_router.include_router(conversion_attributes_router)
api_router.include_router(bvs_router)
api_router.include_router(brand_health_router)
api_router.include_router(admin_emails_router)
api_router.include_router(collaboration_router)
api_router.include_router(notifications_router)
api_router.include_router(clickup_router)
api_router.include_router(social_fetcher_router)
api_router.include_router(campaigns_router)
api_router.include_router(permissions_router)
api_router.include_router(white_label_router)

# Serve uploaded files (avatars)
@api_router.get("/uploads/avatars/{filename}")
async def serve_avatar(filename: str):
    filepath = f"/app/backend/uploads/avatars/{filename}"
    if os.path.exists(filepath):
        return FileResponse(filepath)
    return JSONResponse({"error": "File not found"}, status_code=404)

# Serve uploaded files (logos)
@api_router.get("/uploads/logos/{filename}")
async def serve_logo(filename: str):
    filepath = f"/app/backend/uploads/logos/{filename}"
    if os.path.exists(filepath):
        return FileResponse(filepath)
    return JSONResponse({"error": "File not found"}, status_code=404)

# Include the main API router
app.include_router(api_router)

# CORS middleware - explicit origins required when allow_credentials=True
cors_origins_env = os.environ.get("CORS_ORIGINS", "")
frontend_url = os.environ.get("FRONTEND_URL", "")

allowed_origins = []
if cors_origins_env and cors_origins_env.strip() != "*":
    allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
    if frontend_url and frontend_url not in allowed_origins:
        allowed_origins.append(frontend_url)

# Fallback: if no explicit origins configured, allow all via dynamic origin matching
if not allowed_origins:
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.requests import Request
    from starlette.responses import Response

    class DynamicCORSMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            origin = request.headers.get("origin", "")
            if request.method == "OPTIONS":
                response = Response(status_code=200)
            else:
                response = await call_next(request)
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
                response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
            return response

    app.add_middleware(DynamicCORSMiddleware)
    logger.info("CORS: Dynamic origin matching enabled (no explicit origins configured)")
else:
    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=allowed_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info(f"CORS: Allowed origins = {allowed_origins}")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
