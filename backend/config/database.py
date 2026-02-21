from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'labrand_secret_key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168

PLANS = {
    "free": {"name": "Grátis", "max_brands": 1, "ai_requests_per_month": 5, "features": ["1 marca", "7 pilares básicos", "Dashboard"], "price_monthly": 0},
    "founder": {"name": "Founder", "max_brands": 1, "ai_requests_per_month": 20, "features": ["1 marca", "Todos os pilares", "Valuation básico", "20 requisições IA/mês"], "price_monthly": 59.90},
    "pro": {"name": "Pro", "max_brands": 3, "ai_requests_per_month": 50, "features": ["3 marcas", "Todos os pilares", "Exportação PDF", "Integração Google", "50 requisições IA/mês"], "price_monthly": 97},
    "consultor": {"name": "Consultor", "max_brands": 5, "ai_requests_per_month": 100, "features": ["5 marcas", "Todos os pilares", "Valuation completo", "Benchmark setorial", "Exportação PDF", "100 requisições IA/mês"], "price_monthly": 197},
    "enterprise": {"name": "Enterprise", "max_brands": -1, "ai_requests_per_month": -1, "features": ["Marcas ilimitadas", "Dashboard executivo", "API access", "Suporte prioritário", "White label", "IA ilimitada"], "price_monthly": 497}
}

TRIAL_DAYS = 7

AI_COSTS = {
    "insight": 1, "mentor": 2, "risk_analysis": 3, "consistency_analysis": 2,
    "brand_way": 3, "valuation": 5, "maturity_recommendations": 1,
    "touchpoint_persona_analysis": 2, "touchpoint_heatmap": 1, "touchpoint_roi_analysis": 2,
    "naming_semantic_map": 1, "naming_generation": 3, "naming_phonetic": 1, "naming_global_friction": 2,
    "competitor_analysis_basic": 2, "competitor_analysis_detailed": 4,
    "content_tagline": 1, "content_post": 1, "content_bio": 1, "content_manifesto": 2, "content_pitch": 1
}
