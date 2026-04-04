"""
LaBrand Backend Tests - All tests using sync requests
Run with: pytest tests/test_api.py -v
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://labrand-staging-4.preview.emergentagent.com')

class TestLaBrandAPI:
    """Complete test suite for LaBrand API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@labrand.com",
            "password": "password123"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
            # Get first brand
            brands = requests.get(f"{BASE_URL}/api/brands", headers=self.headers).json()
            self.brand_id = brands[0]["brand_id"] if brands else None
        else:
            self.token = None
            self.headers = {}
            self.brand_id = None
    
    # ==================== AUTH TESTS ====================
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_get_plans(self):
        """Test plans endpoint (public)"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        assert len(data["plans"]) >= 4
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
    
    def test_protected_route_without_auth(self):
        """Test that protected routes require auth"""
        response = requests.get(f"{BASE_URL}/api/brands")
        assert response.status_code == 401
    
    # ==================== BRAND TESTS ====================
    
    def test_get_brands(self):
        """Test get brands list"""
        if not self.token:
            pytest.skip("Auth not available")
        response = requests.get(f"{BASE_URL}/api/brands", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_brand_score(self):
        """Test brand score endpoint"""
        if not self.brand_id:
            pytest.skip("No brand available")
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/brand-score", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "unified_score" in data
        assert "dimensions" in data
        assert "level" in data
    
    def test_brand_equity(self):
        """Test brand equity (Aaker model)"""
        if not self.brand_id:
            pytest.skip("No brand available")
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/brand-equity", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "equity_score" in data
        assert "dimensions" in data
        assert len(data["dimensions"]) == 5  # 5 Aaker dimensions
        assert "benchmark" in data
    
    # ==================== BRAND TOOLS TESTS ====================
    
    def test_content_generator_types(self):
        """Test content types endpoint"""
        if not self.token:
            pytest.skip("Auth not available")
        response = requests.get(f"{BASE_URL}/api/content-generator/types", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "types" in data
        assert len(data["types"]) >= 5
    
    def test_social_listening(self):
        """Test social listening (MOCK)"""
        if not self.brand_id:
            pytest.skip("No brand available")
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/social-listening/mentions", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "mentions" in data
        assert "sentiment_summary" in data
    
    def test_alerts_config(self):
        """Test alerts config endpoint"""
        if not self.brand_id:
            pytest.skip("No brand available")
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/alerts/config", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "brand_id" in data
        assert "frequency" in data
    
    # ==================== NAMING TESTS ====================
    
    def test_naming_archetypes(self):
        """Test naming archetypes"""
        if not self.token:
            pytest.skip("Auth not available")
        response = requests.get(f"{BASE_URL}/api/naming/archetypes", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "archetypes" in data
        assert len(data["archetypes"]) == 12
    
    def test_naming_criteria(self):
        """Test naming criteria"""
        if not self.token:
            pytest.skip("Auth not available")
        response = requests.get(f"{BASE_URL}/api/naming/criteria", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "criteria" in data
    
    # ==================== CRM TESTS ====================
    
    def test_crm_providers(self):
        """Test CRM providers"""
        if not self.token:
            pytest.skip("Auth not available")
        response = requests.get(f"{BASE_URL}/api/crm/providers", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        provider_ids = [p["id"] for p in data["providers"]]
        assert "rdstation" in provider_ids
        assert "hubspot" in provider_ids
    
    # ==================== ADS TESTS ====================
    
    def test_ads_providers(self):
        """Test ads providers"""
        if not self.brand_id:
            pytest.skip("No brand available")
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/ads/providers", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        provider_ids = [p["id"] for p in data["providers"]]
        assert "meta" in provider_ids
        assert "google" in provider_ids
    
    # ==================== EXTRAS TESTS ====================
    
    def test_templates_sectors(self):
        """Test templates sectors"""
        if not self.token:
            pytest.skip("Auth not available")
        response = requests.get(f"{BASE_URL}/api/templates/sectors", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "sectors" in data
        assert len(data["sectors"]) >= 10
    
    def test_touchpoints(self):
        """Test touchpoints endpoint"""
        if not self.brand_id:
            pytest.skip("No brand available")
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/touchpoints", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "touchpoints" in data
        assert "stats" in data
    
    def test_intelligence_summary(self):
        """Test intelligence summary"""
        if not self.brand_id:
            pytest.skip("No brand available")
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/intelligence/summary", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "brand_health" in data
        assert "marketing" in data
