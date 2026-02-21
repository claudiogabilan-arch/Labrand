"""
Tests for Brand Routes
"""
import pytest
from httpx import AsyncClient, ASGITransport
import sys
sys.path.insert(0, '/app/backend')

from server import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def auth_headers(client):
    """Get auth token for protected routes"""
    response = await client.post("/api/auth/login", json={
        "email": "demo@labrand.com",
        "password": "password123"
    })
    if response.status_code == 200:
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    return {}

@pytest.mark.asyncio
async def test_get_brands(client, auth_headers):
    """Test get brands list"""
    if not auth_headers:
        pytest.skip("Auth not available")
    response = await client.get("/api/brands", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

@pytest.mark.asyncio
async def test_get_brand_score(client, auth_headers):
    """Test brand score endpoint"""
    if not auth_headers:
        pytest.skip("Auth not available")
    
    # First get a brand
    brands_response = await client.get("/api/brands", headers=auth_headers)
    if brands_response.status_code != 200:
        pytest.skip("Cannot get brands")
    
    brands = brands_response.json()
    if not brands:
        pytest.skip("No brands available")
    
    brand_id = brands[0]["brand_id"]
    response = await client.get(f"/api/brands/{brand_id}/brand-score", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "unified_score" in data
    assert "dimensions" in data
    assert "level" in data

@pytest.mark.asyncio
async def test_get_brand_equity(client, auth_headers):
    """Test brand equity endpoint"""
    if not auth_headers:
        pytest.skip("Auth not available")
    
    brands_response = await client.get("/api/brands", headers=auth_headers)
    if brands_response.status_code != 200:
        pytest.skip("Cannot get brands")
    
    brands = brands_response.json()
    if not brands:
        pytest.skip("No brands available")
    
    brand_id = brands[0]["brand_id"]
    response = await client.get(f"/api/brands/{brand_id}/brand-equity", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "equity_score" in data
    assert "dimensions" in data
    assert "benchmark" in data
    assert len(data["dimensions"]) == 5  # 5 Aaker dimensions

@pytest.mark.asyncio
async def test_social_listening(client, auth_headers):
    """Test social listening endpoint"""
    if not auth_headers:
        pytest.skip("Auth not available")
    
    brands_response = await client.get("/api/brands", headers=auth_headers)
    brands = brands_response.json()
    if not brands:
        pytest.skip("No brands available")
    
    brand_id = brands[0]["brand_id"]
    response = await client.get(f"/api/brands/{brand_id}/social-listening/mentions", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "mentions" in data
    assert "sentiment_summary" in data

@pytest.mark.asyncio
async def test_ads_providers(client, auth_headers):
    """Test ads providers endpoint"""
    if not auth_headers:
        pytest.skip("Auth not available")
    
    brands_response = await client.get("/api/brands", headers=auth_headers)
    brands = brands_response.json()
    if not brands:
        pytest.skip("No brands available")
    
    brand_id = brands[0]["brand_id"]
    response = await client.get(f"/api/brands/{brand_id}/ads/providers", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "providers" in data
    providers = [p["id"] for p in data["providers"]]
    assert "meta" in providers
    assert "google" in providers
