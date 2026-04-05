"""
Test Push Notifications and Pagination APIs - Iteration 30
Tests:
1. Push notification endpoints (VAPID key, subscribe, unsubscribe)
2. Pagination on brands, campaigns, naming endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"
BRAND_ID = "brand_0902ead1b80c"


class TestPushNotificationAPIs:
    """Test Push Notification endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_get_vapid_key(self):
        """Test GET /api/push/vapid-key returns public key"""
        response = self.session.get(f"{BASE_URL}/api/push/vapid-key")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "publicKey" in data, "Response should contain publicKey"
        assert isinstance(data["publicKey"], str), "publicKey should be a string"
        assert len(data["publicKey"]) > 0, "publicKey should not be empty"
        print(f"✓ VAPID public key returned: {data['publicKey'][:30]}...")
    
    def test_subscribe_push_requires_auth(self):
        """Test POST /api/push/subscribe requires authentication"""
        # Create a new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.post(f"{BASE_URL}/api/push/subscribe", json={
            "endpoint": "https://test.example.com/push",
            "keys": {"p256dh": "test_key", "auth": "test_auth"}
        })
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Subscribe endpoint requires authentication")
    
    def test_subscribe_push_with_auth(self):
        """Test POST /api/push/subscribe stores subscription"""
        test_subscription = {
            "endpoint": "https://test.example.com/push/TEST_subscription_123",
            "keys": {
                "p256dh": "TEST_p256dh_key_value",
                "auth": "TEST_auth_key_value"
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/push/subscribe", json=test_subscription)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "subscribed", f"Expected status 'subscribed', got {data}"
        print("✓ Push subscription created successfully")
    
    def test_unsubscribe_push_requires_auth(self):
        """Test DELETE /api/push/unsubscribe requires authentication"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.delete(f"{BASE_URL}/api/push/unsubscribe")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Unsubscribe endpoint requires authentication")
    
    def test_unsubscribe_push_with_auth(self):
        """Test DELETE /api/push/unsubscribe removes subscriptions"""
        # First subscribe
        test_subscription = {
            "endpoint": "https://test.example.com/push/TEST_to_unsubscribe",
            "keys": {"p256dh": "TEST_key", "auth": "TEST_auth"}
        }
        self.session.post(f"{BASE_URL}/api/push/subscribe", json=test_subscription)
        
        # Then unsubscribe
        response = self.session.delete(f"{BASE_URL}/api/push/unsubscribe")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "unsubscribed", f"Expected status 'unsubscribed', got {data}"
        print("✓ Push unsubscribe successful")


class TestPaginationAPIs:
    """Test pagination on brands, campaigns, naming endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_brands_pagination_default(self):
        """Test GET /api/brands returns brands (default pagination)"""
        response = self.session.get(f"{BASE_URL}/api/brands")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of brands"
        print(f"✓ Brands endpoint returned {len(data)} brands (default pagination)")
    
    def test_brands_pagination_with_params(self):
        """Test GET /api/brands?page=1&limit=2 returns paginated results"""
        response = self.session.get(f"{BASE_URL}/api/brands?page=1&limit=2")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 2, f"Expected max 2 brands with limit=2, got {len(data)}"
        print(f"✓ Brands pagination with limit=2 returned {len(data)} brands")
    
    def test_brands_pagination_page_2(self):
        """Test GET /api/brands?page=2&limit=1 returns second page"""
        response = self.session.get(f"{BASE_URL}/api/brands?page=2&limit=1")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Brands page 2 with limit=1 returned {len(data)} brands")
    
    def test_campaigns_pagination_default(self):
        """Test GET /api/brands/{brand_id}/campaigns returns campaigns"""
        response = self.session.get(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of campaigns"
        print(f"✓ Campaigns endpoint returned {len(data)} campaigns")
    
    def test_campaigns_pagination_with_params(self):
        """Test GET /api/brands/{brand_id}/campaigns?page=1&limit=10 returns paginated results"""
        response = self.session.get(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns?page=1&limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 10, f"Expected max 10 campaigns with limit=10, got {len(data)}"
        print(f"✓ Campaigns pagination with limit=10 returned {len(data)} campaigns")
    
    def test_naming_pagination_default(self):
        """Test GET /api/brands/{brand_id}/naming returns naming projects"""
        response = self.session.get(f"{BASE_URL}/api/brands/{BRAND_ID}/naming")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "projects" in data, "Response should contain 'projects' key"
        assert isinstance(data["projects"], list), "projects should be a list"
        print(f"✓ Naming endpoint returned {len(data['projects'])} projects")
    
    def test_naming_pagination_with_params(self):
        """Test GET /api/brands/{brand_id}/naming?page=1&limit=10 returns paginated results"""
        response = self.session.get(f"{BASE_URL}/api/brands/{BRAND_ID}/naming?page=1&limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "projects" in data, "Response should contain 'projects' key"
        assert len(data["projects"]) <= 10, f"Expected max 10 projects with limit=10, got {len(data['projects'])}"
        print(f"✓ Naming pagination with limit=10 returned {len(data['projects'])} projects")


class TestServiceWorkerAccess:
    """Test service worker file accessibility"""
    
    def test_sw_push_js_accessible(self):
        """Test that /sw-push.js is accessible at the frontend URL"""
        # Service worker should be accessible without auth
        response = requests.get(f"{BASE_URL}/sw-push.js")
        # Should return 200 or redirect to the file
        assert response.status_code in [200, 304], f"Expected 200/304 for sw-push.js, got {response.status_code}"
        
        # Check content contains service worker code
        if response.status_code == 200:
            content = response.text
            assert "push" in content.lower() or "self.addEventListener" in content, \
                "Service worker should contain push-related code"
        print("✓ Service worker sw-push.js is accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
