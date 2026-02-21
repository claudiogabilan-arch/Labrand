"""
Tests for Brand Tools Routes
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
async def test_content_generator_types(client, auth_headers):
    """Test content generator types endpoint"""
    if not auth_headers:
        pytest.skip("Auth not available")
    response = await client.get("/api/content-generator/types", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "types" in data
    assert len(data["types"]) >= 5  # tagline, post_social, bio, manifesto, elevator_pitch

@pytest.mark.asyncio
async def test_naming_archetypes(client, auth_headers):
    """Test naming archetypes endpoint"""
    if not auth_headers:
        pytest.skip("Auth not available")
    response = await client.get("/api/naming/archetypes", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "archetypes" in data
    assert len(data["archetypes"]) == 12

@pytest.mark.asyncio
async def test_naming_criteria(client, auth_headers):
    """Test naming criteria endpoint"""
    if not auth_headers:
        pytest.skip("Auth not available")
    response = await client.get("/api/naming/criteria", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "criteria" in data

@pytest.mark.asyncio
async def test_crm_providers(client, auth_headers):
    """Test CRM providers endpoint"""
    if not auth_headers:
        pytest.skip("Auth not available")
    response = await client.get("/api/crm/providers", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "providers" in data
    providers = [p["id"] for p in data["providers"]]
    assert "rdstation" in providers
    assert "hubspot" in providers

@pytest.mark.asyncio
async def test_templates_sectors(client, auth_headers):
    """Test templates sectors endpoint"""
    if not auth_headers:
        pytest.skip("Auth not available")
    response = await client.get("/api/templates/sectors", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "sectors" in data
    assert len(data["sectors"]) >= 10
