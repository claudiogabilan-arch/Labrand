"""
Test suite for modular refactoring verification
Tests all endpoints from the refactored routes after migration from monolithic server.py
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_check(self):
        """GET /api/health - Health check endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "labrand-api"
        print("PASS: Health check returns healthy status")
    
    def test_login_success_demo_user(self):
        """POST /api/auth/login - Demo user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@labrand.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == "demo@labrand.com"
        assert "user_id" in data
        print(f"PASS: Demo user login successful, user_id: {data['user_id']}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login - Invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("PASS: Invalid login returns 401")
    
    def test_admin_login(self):
        """POST /api/auth/login - Admin user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@labrand.com",
            "password": "LaBrand@2024!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["email"] == "admin@labrand.com"
        print("PASS: Admin user login successful")


class TestBrandsRoutes:
    """Test brands.py routes"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@labrand.com",
            "password": "password123"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_brands(self):
        """GET /api/brands - List user's brands"""
        response = requests.get(f"{BASE_URL}/api/brands", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/brands returns {len(data)} brands")
        
        # Store brand_id for other tests
        if data:
            self.__class__.brand_id = data[0].get("brand_id")
            print(f"Using brand_id: {self.__class__.brand_id}")


class TestBrandToolsRoutes:
    """Test brand_tools.py routes - Brand Score and related features"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth and brand_id"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@labrand.com",
            "password": "password123"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
        
        # Get brand_id
        brands_response = requests.get(f"{BASE_URL}/api/brands", headers=self.headers)
        if brands_response.status_code == 200 and brands_response.json():
            self.brand_id = brands_response.json()[0].get("brand_id")
        else:
            pytest.skip("No brands found")
    
    def test_get_brand_score(self):
        """GET /api/brands/{brand_id}/brand-score - Unified Brand Score"""
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/brand-score", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "unified_score" in data
        assert "level" in data
        assert "status" in data
        assert "dimensions" in data
        
        # Verify dimensions
        dimensions = data["dimensions"]
        assert "estrategia" in dimensions
        assert "experiencia" in dimensions
        assert "maturidade" in dimensions
        assert "consistencia" in dimensions
        
        print(f"PASS: Brand Score = {data['unified_score']}, Level: {data['level']}")
    
    def test_get_report_history(self):
        """GET /api/brands/{brand_id}/reports/history - Report history"""
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/reports/history", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "reports" in data
        print(f"PASS: Reports history returned {data.get('total', 0)} reports")
    
    def test_get_alert_config(self):
        """GET /api/brands/{brand_id}/alerts/config - Alert configuration"""
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/alerts/config", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "brand_id" in data
        print("PASS: Alert config retrieved successfully")


class TestAdsRoutes:
    """Test ads.py routes - Meta & Google Ads integration"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth and brand_id"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@labrand.com",
            "password": "password123"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
        
        brands_response = requests.get(f"{BASE_URL}/api/brands", headers=self.headers)
        if brands_response.status_code == 200 and brands_response.json():
            self.brand_id = brands_response.json()[0].get("brand_id")
        else:
            pytest.skip("No brands found")
    
    def test_get_ads_providers(self):
        """GET /api/brands/{brand_id}/ads/providers - List Ads providers"""
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/ads/providers", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "providers" in data
        providers = data["providers"]
        provider_ids = [p["id"] for p in providers]
        assert "meta" in provider_ids
        assert "google" in provider_ids
        print(f"PASS: Ads providers returned: {provider_ids}")
    
    def test_get_intelligence_summary(self):
        """GET /api/brands/{brand_id}/intelligence/summary - Marketing intelligence"""
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/intelligence/summary", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "brand_health" in data
        assert "marketing" in data
        assert "crm" in data
        assert "sources_connected" in data
        print(f"PASS: Intelligence summary returned, brand_health completeness: {data['brand_health'].get('completeness')}%")


class TestCRMRoutes:
    """Test crm.py routes - CRM integration"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth and brand_id"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@labrand.com",
            "password": "password123"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
        
        brands_response = requests.get(f"{BASE_URL}/api/brands", headers=self.headers)
        if brands_response.status_code == 200 and brands_response.json():
            self.brand_id = brands_response.json()[0].get("brand_id")
        else:
            pytest.skip("No brands found")
    
    def test_get_crm_providers(self):
        """GET /api/crm/providers - List CRM providers (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/crm/providers")
        assert response.status_code == 200
        data = response.json()
        
        assert "providers" in data
        providers = data["providers"]
        provider_ids = [p["id"] for p in providers]
        assert "rdstation" in provider_ids or "hubspot" in provider_ids
        print(f"PASS: CRM providers returned: {provider_ids}")
    
    def test_get_brand_crm_integrations(self):
        """GET /api/brands/{brand_id}/crm - Get CRM integrations for brand"""
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/crm", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "integrations" in data
        assert "stats" in data
        print(f"PASS: CRM integrations returned, stats: {data['stats']}")


class TestTouchpointsRoutes:
    """Test touchpoints.py routes"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth and brand_id"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@labrand.com",
            "password": "password123"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
        
        brands_response = requests.get(f"{BASE_URL}/api/brands", headers=self.headers)
        if brands_response.status_code == 200 and brands_response.json():
            self.brand_id = brands_response.json()[0].get("brand_id")
        else:
            pytest.skip("No brands found")
    
    def test_get_touchpoints(self):
        """GET /api/brands/{brand_id}/touchpoints - Get brand touchpoints"""
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/touchpoints", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "touchpoints" in data
        assert "by_phase" in data
        assert "stats" in data
        assert "financial" in data
        print(f"PASS: Touchpoints returned, total: {data['stats'].get('total', 0)}")


class TestNamingRoutes:
    """Test naming.py routes - Estúdio Onomástico"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth and brand_id"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@labrand.com",
            "password": "password123"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
        
        brands_response = requests.get(f"{BASE_URL}/api/brands", headers=self.headers)
        if brands_response.status_code == 200 and brands_response.json():
            self.brand_id = brands_response.json()[0].get("brand_id")
        else:
            pytest.skip("No brands found")
    
    def test_get_naming_archetypes(self):
        """GET /api/naming/archetypes - Get archetypes for naming"""
        response = requests.get(f"{BASE_URL}/api/naming/archetypes")
        assert response.status_code == 200
        data = response.json()
        
        assert "archetypes" in data
        archetypes = data["archetypes"]
        assert len(archetypes) >= 10  # Should have 12 archetypes
        
        archetype_ids = [a["id"] for a in archetypes]
        assert "heroi" in archetype_ids
        assert "mago" in archetype_ids
        print(f"PASS: Naming archetypes returned: {len(archetypes)} archetypes")
    
    def test_get_naming_criteria(self):
        """GET /api/naming/criteria - Get naming evaluation criteria"""
        response = requests.get(f"{BASE_URL}/api/naming/criteria")
        assert response.status_code == 200
        data = response.json()
        
        assert "criteria" in data
        criteria = data["criteria"]
        assert len(criteria) >= 5
        print(f"PASS: Naming criteria returned: {len(criteria)} criteria")
    
    def test_get_naming_projects(self):
        """GET /api/brands/{brand_id}/naming - Get naming projects"""
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/naming", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "projects" in data
        print(f"PASS: Naming projects returned: {len(data['projects'])} projects")


class TestExtrasRoutes:
    """Test extras.py routes - Templates, Competitor Groups, etc."""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth and brand_id"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@labrand.com",
            "password": "password123"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
        
        brands_response = requests.get(f"{BASE_URL}/api/brands", headers=self.headers)
        if brands_response.status_code == 200 and brands_response.json():
            self.brand_id = brands_response.json()[0].get("brand_id")
        else:
            pytest.skip("No brands found")
    
    def test_get_template_sectors(self):
        """GET /api/templates/sectors - Get available sectors"""
        response = requests.get(f"{BASE_URL}/api/templates/sectors")
        assert response.status_code == 200
        data = response.json()
        
        assert "sectors" in data
        sectors = data["sectors"]
        assert len(sectors) >= 5
        print(f"PASS: Template sectors returned: {sectors[:5]}...")
    
    def test_get_competitor_groups(self):
        """GET /api/brands/{brand_id}/competitor-groups - Get competitor groups"""
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/competitor-groups", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "groups" in data
        print(f"PASS: Competitor groups returned: {len(data['groups'])} groups")
    
    def test_get_dashboard_metrics(self):
        """GET /api/brands/{brand_id}/dashboard-metrics - Dashboard metrics"""
        response = requests.get(f"{BASE_URL}/api/brands/{self.brand_id}/dashboard-metrics", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "brand" in data
        assert "pillars" in data
        assert "completion_rate" in data
        print(f"PASS: Dashboard metrics returned, completion: {data['completion_rate']}%")


class TestUnauthorizedAccess:
    """Test endpoints require authentication"""
    
    def test_brands_unauthorized(self):
        """GET /api/brands - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/brands")
        assert response.status_code in [401, 403]
        print("PASS: /api/brands requires authentication")
    
    def test_brand_score_unauthorized(self):
        """GET /api/brands/{id}/brand-score - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/brands/fake_brand/brand-score")
        assert response.status_code in [401, 403]
        print("PASS: /api/brands/{id}/brand-score requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
