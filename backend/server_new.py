"""
LaBrand - Brand OS API
Main Application Entry Point

This file has been refactored from a 3000+ line monolithic file into modular routers.
"""
from fastapi import FastAPI, APIRouter
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
import logging

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
