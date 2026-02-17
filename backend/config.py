"""
LaBrand - Configuration and Database Setup
"""
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'labrand_secret_key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

# Trial Configuration
TRIAL_DAYS = 7

# Plan Definitions
PLANS = {
    "free": {
        "name": "Grátis",
        "max_brands": 1,
        "ai_requests_per_month": 5,
        "features": ["1 marca", "7 pilares básicos", "Dashboard"],
        "price_monthly": 0
    },
    "founder": {
        "name": "Founder",
        "max_brands": 1,
        "ai_requests_per_month": 20,
        "features": ["1 marca", "Todos os pilares", "Valuation básico", "20 requisições IA/mês"],
        "price_monthly": 59.90
    },
    "pro": {
        "name": "Pro",
        "max_brands": 3,
        "ai_requests_per_month": 50,
        "features": ["3 marcas", "Todos os pilares", "Exportação PDF", "Integração Google", "50 requisições IA/mês"],
        "price_monthly": 97
    },
    "consultor": {
        "name": "Consultor", 
        "max_brands": 5,
        "ai_requests_per_month": 100,
        "features": ["5 marcas", "Todos os pilares", "Valuation completo", "Benchmark setorial", "Exportação PDF", "100 requisições IA/mês"],
        "price_monthly": 197
    },
    "enterprise": {
        "name": "Enterprise",
        "max_brands": -1,
        "ai_requests_per_month": -1,
        "features": ["Marcas ilimitadas", "Dashboard executivo", "API access", "Suporte prioritário", "White label", "IA ilimitada"],
        "price_monthly": 497
    }
}

# AI Credit Costs
AI_CREDIT_COSTS = {
    "suggestion": 1,
    "risk_analysis": 5,
    "consistency_analysis": 5,
    "mentor_insight": 3,
    "brand_way_suggestion": 2
}

# Credit Packages for Purchase
CREDIT_PACKAGES = {
    "starter": {"credits": 100, "price": 49.00, "stripe_price_id": "price_1T1hYh5XQ1KrllP22NrrLqVr"},
    "pro": {"credits": 500, "price": 199.00, "stripe_price_id": "price_1T1hZo5XQ1KrllP2xuz1zoD9"},
    "enterprise": {"credits": 2000, "price": 699.00, "stripe_price_id": "price_1T1has5XQ1KrllP2yTEaGs5A"}
}

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
