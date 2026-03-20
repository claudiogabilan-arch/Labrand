"""
LaBrand - Authentication Login Tests
Tests for login, auth/me, and logout endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"


class TestAuthLogin:
    """Authentication login endpoint tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "token" in data, "Response should contain token"
        assert "user_id" in data, "Response should contain user_id"
        assert "email" in data, "Response should contain email"
        assert "name" in data, "Response should contain name"
        assert "role" in data, "Response should contain role"
        assert "onboarding_completed" in data, "Response should contain onboarding_completed"
        
        # Verify data values
        assert data["email"] == ADMIN_EMAIL
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0
        
    def test_login_invalid_password(self):
        """Test login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        
    def test_login_invalid_email(self):
        """Test login with non-existent email returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "anypassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
    def test_login_missing_fields(self):
        """Test login with missing fields returns 422"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL
            # missing password
        })
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"


class TestAuthMe:
    """Tests for GET /auth/me endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_get_me_with_valid_token(self, auth_token):
        """Test GET /auth/me returns user info with valid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        assert "role" in data
        assert "onboarding_completed" in data
        
        # Verify data values
        assert data["email"] == ADMIN_EMAIL
        
    def test_get_me_without_token(self):
        """Test GET /auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
    def test_get_me_with_invalid_token(self):
        """Test GET /auth/me with invalid token returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestAuthLogout:
    """Tests for POST /auth/logout endpoint"""
    
    def test_logout_success(self):
        """Test logout endpoint returns success"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
