"""
LaBrand - Auth Password Change and Brand Loading Tests
Tests for:
1. POST /api/auth/change-password - password change endpoint
2. GET /api/auth/me - returns is_admin field
3. GET /api/brands - returns brands for authenticated admin user
4. Login flow with brand loading
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"
TEST_NEW_PASSWORD = "TestNewPass123!"


class TestAuthLogin:
    """Test login and token retrieval"""
    
    def test_login_returns_token_and_user_data(self):
        """Login with valid credentials returns token and user data"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response missing token"
        assert "user_id" in data, "Response missing user_id"
        assert "email" in data, "Response missing email"
        assert "name" in data, "Response missing name"
        assert data["email"] == ADMIN_EMAIL
        print(f"Login successful for {data['name']}")
        
    def test_login_returns_is_admin_field(self):
        """Login response includes is_admin field"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "is_admin" in data, "Response missing is_admin field"
        print(f"is_admin value: {data['is_admin']}")


class TestAuthMe:
    """Test GET /api/auth/me endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_auth_me_returns_user_info(self, auth_token):
        """GET /api/auth/me returns user info with valid token"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        assert data["email"] == ADMIN_EMAIL
        print(f"Auth/me returned user: {data['name']}")
        
    def test_auth_me_returns_is_admin_field(self, auth_token):
        """GET /api/auth/me returns is_admin field"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "is_admin" in data, "Response missing is_admin field"
        print(f"is_admin from /auth/me: {data['is_admin']}")
        
    def test_auth_me_without_token_returns_401(self):
        """GET /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401


class TestBrandsEndpoint:
    """Test GET /api/brands endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_brands_returns_list_for_authenticated_user(self, auth_token):
        """GET /api/brands returns brands list for authenticated user"""
        response = requests.get(f"{BASE_URL}/api/brands", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} brands")
        
        if len(data) > 0:
            brand = data[0]
            assert "brand_id" in brand, "Brand missing brand_id"
            assert "name" in brand, "Brand missing name"
            print(f"First brand: {brand['name']}")
            
    def test_brands_without_token_returns_401(self):
        """GET /api/brands without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/brands")
        assert response.status_code == 401


class TestPasswordChange:
    """Test POST /api/auth/change-password endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_change_password_with_wrong_current_password_returns_401(self, auth_token):
        """POST /api/auth/change-password with wrong current password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/change-password", 
            json={
                "current_password": "WrongPassword123!",
                "new_password": TEST_NEW_PASSWORD
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("Correctly rejected wrong current password")
        
    def test_change_password_without_token_returns_401(self):
        """POST /api/auth/change-password without token returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/change-password", 
            json={
                "current_password": ADMIN_PASSWORD,
                "new_password": TEST_NEW_PASSWORD
            }
        )
        assert response.status_code == 401
        print("Correctly rejected request without token")
        
    def test_change_password_with_short_password_returns_400(self, auth_token):
        """POST /api/auth/change-password with short new password returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/change-password", 
            json={
                "current_password": ADMIN_PASSWORD,
                "new_password": "12345"  # Too short
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("Correctly rejected short password")
        
    def test_change_password_success_and_revert(self, auth_token):
        """POST /api/auth/change-password with valid data changes password, then revert"""
        # Step 1: Change password to new password
        response = requests.post(f"{BASE_URL}/api/auth/change-password", 
            json={
                "current_password": ADMIN_PASSWORD,
                "new_password": TEST_NEW_PASSWORD
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Password change failed: {response.text}"
        print("Password changed successfully")
        
        # Step 2: Login with new password
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": TEST_NEW_PASSWORD
        })
        assert login_response.status_code == 200, f"Login with new password failed: {login_response.text}"
        new_token = login_response.json().get("token")
        print("Login with new password successful")
        
        # Step 3: Verify brands are still accessible after password change
        brands_response = requests.get(f"{BASE_URL}/api/brands", headers={
            "Authorization": f"Bearer {new_token}"
        })
        assert brands_response.status_code == 200, f"Brands fetch failed: {brands_response.text}"
        print(f"Brands still accessible after password change: {len(brands_response.json())} brands")
        
        # Step 4: Revert password back to original
        revert_response = requests.post(f"{BASE_URL}/api/auth/change-password", 
            json={
                "current_password": TEST_NEW_PASSWORD,
                "new_password": ADMIN_PASSWORD
            },
            headers={"Authorization": f"Bearer {new_token}"}
        )
        assert revert_response.status_code == 200, f"Password revert failed: {revert_response.text}"
        print("Password reverted to original")
        
        # Step 5: Verify login with original password works
        final_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert final_login.status_code == 200, f"Login with original password failed: {final_login.text}"
        print("Login with original password successful - test complete")


class TestLogout:
    """Test logout clears session"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_logout_returns_success(self, auth_token):
        """POST /api/auth/logout returns success"""
        response = requests.post(f"{BASE_URL}/api/auth/logout", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        print("Logout successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
