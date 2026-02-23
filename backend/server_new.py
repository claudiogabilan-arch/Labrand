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
from routes.plans import router as plans_router
from routes.stripe import router as stripe_router
from routes.maturity import router as maturity_router
from routes.brand_tools import router as brand_tools_router
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

# Create the main app
app = FastAPI(title="LaBrand - Brand OS API")

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
api_router.include_router(plans_router)
api_router.include_router(stripe_router)
api_router.include_router(maturity_router)
api_router.include_router(brand_tools_router)
api_router.include_router(ads_router)
api_router.include_router(crm_router)
api_router.include_router(touchpoints_router)
api_router.include_router(admin_router)
api_router.include_router(extras_router)
api_router.include_router(naming_router)
api_router.include_router(reports_router)
api_router.include_router(team_router)

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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
