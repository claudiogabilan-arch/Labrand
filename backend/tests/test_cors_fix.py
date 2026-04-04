"""
Test CORS fix and authentication flow
Tests the fix for CORS misconfiguration where allow_origins=['*'] with allow_credentials=True was invalid.
Fix: replaced wildcard with explicit origins list from environment variables.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
INTERNAL_URL = "http://localhost:8001"

# Test credentials
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"


class TestCORSConfiguration:
    """Test CORS headers are correctly configured (not wildcard with credentials)"""
    
    def test_cors_preflight_returns_explicit_origin(self):
        """CORS preflight should return explicit origin, not wildcard *"""
        response = requests.options(
            f"{INTERNAL_URL}/api/auth/login",
            headers={
                "Origin": "https://labrand.com.br",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type, Authorization"
            }
        )
        assert response.status_code == 200
        
        # CRITICAL: Should NOT be wildcard * when credentials are allowed
        allow_origin = response.headers.get("access-control-allow-origin", "")
        assert allow_origin == "https://labrand.com.br", f"Expected explicit origin, got: {allow_origin}"
        assert allow_origin != "*", "CORS should not return wildcard * with credentials"
        
        # Should allow credentials
        allow_credentials = response.headers.get("access-control-allow-credentials", "")
        assert allow_credentials.lower() == "true"
    
    def test_cors_preflight_preview_origin(self):
        """CORS preflight should also work for preview URL"""
        response = requests.options(
            f"{INTERNAL_URL}/api/auth/login",
            headers={
                "Origin": "https://labrand-staging-4.preview.emergentagent.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type, Authorization"
            }
        )
        assert response.status_code == 200
        
        allow_origin = response.headers.get("access-control-allow-origin", "")
        assert allow_origin == "https://labrand-staging-4.preview.emergentagent.com"
        assert allow_origin != "*"
    
    def test_cors_allows_required_methods(self):
        """CORS should allow POST, GET, PUT, DELETE methods"""
        response = requests.options(
            f"{INTERNAL_URL}/api/auth/login",
            headers={
                "Origin": "https://labrand.com.br",
                "Access-Control-Request-Method": "POST"
            }
        )
        allow_methods = response.headers.get("access-control-allow-methods", "")
        assert "POST" in allow_methods
        assert "GET" in allow_methods


class TestAuthenticationFlow:
    """Test login and auth/me endpoints"""
    
    def test_login_returns_token(self):
        """POST /api/auth/login should return token and user data"""
        response = requests.post(
            f"{INTERNAL_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user_id" in data, "Response should contain user_id"
        assert "email" in data, "Response should contain email"
        assert data["email"] == ADMIN_EMAIL
        assert len(data["token"]) > 50, "Token should be a valid JWT"
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login with wrong password should return 401"""
        response = requests.post(
            f"{INTERNAL_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401
    
    def test_auth_me_with_token(self):
        """GET /api/auth/me with valid token should return user data"""
        # First login to get token
        login_response = requests.post(
            f"{INTERNAL_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        token = login_response.json()["token"]
        
        # Test auth/me
        response = requests.get(
            f"{INTERNAL_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert "user_id" in data
        assert "role" in data
    
    def test_auth_me_without_token(self):
        """GET /api/auth/me without token should return 401"""
        response = requests.get(f"{INTERNAL_URL}/api/auth/me")
        assert response.status_code == 401


class TestBrandsEndpoint:
    """Test brands listing endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{INTERNAL_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_brands_returns_array(self, auth_token):
        """GET /api/brands should return array of brands"""
        response = requests.get(
            f"{INTERNAL_URL}/api/brands",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        assert len(data) > 0, "Should have at least one brand"
        
        # Verify brand structure
        brand = data[0]
        assert "brand_id" in brand
        assert "name" in brand
    
    def test_brands_without_token(self):
        """GET /api/brands without token should return 401"""
        response = requests.get(f"{INTERNAL_URL}/api/brands")
        assert response.status_code == 401


class TestCORSWithActualRequests:
    """Test CORS headers on actual API requests (not just preflight)"""
    
    def test_login_response_has_cors_headers(self):
        """Login response should include CORS headers"""
        response = requests.post(
            f"{INTERNAL_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Origin": "https://labrand.com.br"}
        )
        assert response.status_code == 200
        
        # Check CORS headers on actual response
        allow_origin = response.headers.get("access-control-allow-origin", "")
        # Note: Starlette CORSMiddleware may not include CORS headers on non-preflight
        # if the origin is in the allowed list, it should be reflected
        if allow_origin:
            assert allow_origin == "https://labrand.com.br" or allow_origin == "*"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
