"""
Tests for Auth Routes
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

@pytest.mark.asyncio
async def test_health_endpoint(client):
    """Test health check endpoint"""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

@pytest.mark.asyncio
async def test_register_user(client):
    """Test user registration"""
    import uuid
    user_data = {
        "email": f"test_pytest_{uuid.uuid4().hex[:8]}@labrand.com",
        "password": "TestPass123!",
        "name": "Pytest User",
        "role": "estrategista"
    }
    response = await client.post("/api/auth/register", json=user_data)
    assert response.status_code == 200
    data = response.json()
    assert "user_id" in data
    assert data["requires_verification"] == True

@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    """Test login with invalid credentials"""
    response = await client.post("/api/auth/login", json={
        "email": "nonexistent@test.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_login_valid_credentials(client):
    """Test login with valid demo credentials"""
    response = await client.post("/api/auth/login", json={
        "email": "demo@labrand.com",
        "password": "password123"
    })
    # May be 200 or 403 depending on email verification
    assert response.status_code in [200, 403]
    if response.status_code == 200:
        data = response.json()
        assert "token" in data

@pytest.mark.asyncio
async def test_get_plans(client):
    """Test get plans endpoint (public)"""
    response = await client.get("/api/plans")
    assert response.status_code == 200
    data = response.json()
    assert "plans" in data
    assert len(data["plans"]) > 0

@pytest.mark.asyncio
async def test_protected_route_without_auth(client):
    """Test protected route without authentication"""
    response = await client.get("/api/brands")
    assert response.status_code == 401
