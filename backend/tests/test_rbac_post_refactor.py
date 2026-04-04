"""
Test suite for RBAC implementation and App.js refactor validation
Tests the permissions API endpoints and key protected routes after the massive refactor
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"
TEST_BRAND_ID = "brand_0902ead1b80c"


class TestHealthAndBasics:
    """Basic health check and API availability tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")
    
    def test_root_health(self):
        """Test root health endpoint for Kubernetes (via /api/health since ingress routes /health to frontend)"""
        # Note: /health without /api prefix goes to frontend through ingress
        # The actual backend health is at /api/health
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Root health check passed (via /api/health)")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_login_success(self):
        """Test successful login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user_id" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["is_admin"] == True
        print(f"✓ Login successful for {ADMIN_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400]
        print("✓ Invalid login correctly rejected")


class TestRBACPermissions:
    """RBAC permissions API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_roles_requires_auth(self):
        """Test that GET /api/permissions/roles requires authentication"""
        response = requests.get(f"{BASE_URL}/api/permissions/roles")
        assert response.status_code == 401
        print("✓ GET /api/permissions/roles correctly requires auth")
    
    def test_get_roles_returns_role_list(self):
        """Test GET /api/permissions/roles returns list of roles"""
        response = requests.get(
            f"{BASE_URL}/api/permissions/roles",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "roles" in data
        assert isinstance(data["roles"], list)
        assert len(data["roles"]) > 0
        
        # Verify role structure
        role = data["roles"][0]
        assert "value" in role
        assert "label" in role
        assert "group" in role
        assert "description" in role
        assert "level" in role
        
        # Verify expected roles exist
        role_values = [r["value"] for r in data["roles"]]
        expected_roles = ["lider_projeto", "editor", "colaborador", "visualizador", "cliente_admin", "aprovador", "convidado"]
        for expected in expected_roles:
            assert expected in role_values, f"Missing role: {expected}"
        
        print(f"✓ GET /api/permissions/roles returned {len(data['roles'])} roles")
    
    def test_get_my_role_requires_auth(self):
        """Test that GET /api/permissions/my-role/{brand_id} requires authentication"""
        response = requests.get(f"{BASE_URL}/api/permissions/my-role/{TEST_BRAND_ID}")
        assert response.status_code == 401
        print("✓ GET /api/permissions/my-role requires auth")
    
    def test_get_my_role_returns_permissions(self):
        """Test GET /api/permissions/my-role/{brand_id} returns user role and permissions"""
        response = requests.get(
            f"{BASE_URL}/api/permissions/my-role/{TEST_BRAND_ID}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "role" in data
        assert "label" in data
        assert "group" in data
        assert "level" in data
        assert "permissions" in data
        assert "is_platform_admin" in data
        
        # Admin should have owner role or be platform admin
        assert data["role"] == "owner" or data["is_platform_admin"] == True
        
        # Verify permissions structure
        permissions = data["permissions"]
        expected_modules = ["pillars", "naming", "planning", "campaigns", "social", "reports", "team", "integrations", "settings", "dashboard"]
        for module in expected_modules:
            assert module in permissions, f"Missing permission module: {module}"
        
        print(f"✓ GET /api/permissions/my-role returned role: {data['role']}, is_admin: {data['is_platform_admin']}")
    
    def test_get_my_role_invalid_brand(self):
        """Test GET /api/permissions/my-role with invalid brand_id"""
        response = requests.get(
            f"{BASE_URL}/api/permissions/my-role/invalid_brand_id",
            headers=self.headers
        )
        # Admin should still get access (as owner) or 403 for non-existent brand
        # Based on implementation, admin gets owner role for any brand
        assert response.status_code in [200, 403]
        print("✓ GET /api/permissions/my-role handles invalid brand correctly")


class TestProtectedRoutes:
    """Test key protected routes that use the AppPage wrapper"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_brands_endpoint(self):
        """Test GET /api/brands returns user's brands"""
        response = requests.get(
            f"{BASE_URL}/api/brands",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/brands returned {len(data)} brands")
    
    def test_campaigns_endpoint(self):
        """Test GET /api/brands/{brand_id}/campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/campaigns",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/brands/{TEST_BRAND_ID}/campaigns returned {len(data)} campaigns")
    
    def test_social_listening_endpoint(self):
        """Test GET /api/brands/{brand_id}/social-mentions"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/social-mentions",
            headers=self.headers
        )
        # May return 200 with empty list or 404 if not configured
        assert response.status_code in [200, 404]
        print(f"✓ GET /api/brands/{TEST_BRAND_ID}/social-mentions status: {response.status_code}")
    
    def test_naming_endpoint(self):
        """Test GET /api/brands/{brand_id}/naming"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/naming",
            headers=self.headers
        )
        assert response.status_code in [200, 404]
        print(f"✓ GET /api/brands/{TEST_BRAND_ID}/naming status: {response.status_code}")
    
    def test_reports_endpoint(self):
        """Test GET /api/brands/{brand_id}/reports"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/reports",
            headers=self.headers
        )
        assert response.status_code in [200, 404]
        print(f"✓ GET /api/brands/{TEST_BRAND_ID}/reports status: {response.status_code}")
    
    def test_planning_endpoint(self):
        """Test GET /api/brands/{brand_id}/planning"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/planning",
            headers=self.headers
        )
        assert response.status_code in [200, 404]
        print(f"✓ GET /api/brands/{TEST_BRAND_ID}/planning status: {response.status_code}")


class TestUnauthorizedAccess:
    """Test that protected endpoints reject unauthorized requests"""
    
    def test_brands_requires_auth(self):
        """Test GET /api/brands requires authentication"""
        response = requests.get(f"{BASE_URL}/api/brands")
        assert response.status_code == 401
        print("✓ GET /api/brands correctly requires auth")
    
    def test_campaigns_requires_auth(self):
        """Test GET /api/brands/{brand_id}/campaigns requires authentication"""
        response = requests.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/campaigns")
        assert response.status_code == 401
        print("✓ GET /api/brands/{brand_id}/campaigns correctly requires auth")
    
    def test_permissions_my_role_requires_auth(self):
        """Test GET /api/permissions/my-role requires authentication"""
        response = requests.get(f"{BASE_URL}/api/permissions/my-role/{TEST_BRAND_ID}")
        assert response.status_code == 401
        print("✓ GET /api/permissions/my-role correctly requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
