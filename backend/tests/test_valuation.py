"""
Backend API tests for LaBrand Brand Valuation feature
Tests the valuation pillar endpoints: GET and PUT /api/brands/{brand_id}/pillars/valuation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@labrand.com"
TEST_PASSWORD = "demo123"
TEST_BRAND_ID = "brand_92bcc15a44fb"

class TestValuationAPI:
    """Test valuation pillar API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
            print(f"Login successful, token obtained")
        else:
            pytest.skip(f"Login failed with status {login_response.status_code}: {login_response.text}")
    
    def test_api_root(self):
        """Test API root endpoint is accessible"""
        response = self.session.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API root response: {data}")
    
    def test_get_valuation_pillar_empty(self):
        """Test GET valuation pillar returns empty object or existing data"""
        response = self.session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/pillars/valuation")
        assert response.status_code == 200
        data = response.json()
        # Should return empty dict {} or existing data
        assert isinstance(data, dict)
        print(f"GET valuation response: {data}")
    
    def test_put_valuation_pillar_financial_data(self):
        """Test PUT valuation pillar with financial analysis data"""
        valuation_data = {
            "receita_anual": "10000000",
            "lucro_operacional": "2000000",
            "margem_operacional": "20",
            "custo_capital": "10"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/pillars/valuation",
            json=valuation_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("receita_anual") == "10000000"
        assert data.get("lucro_operacional") == "2000000"
        assert data.get("margem_operacional") == "20"
        assert data.get("custo_capital") == "10"
        print(f"PUT financial data response: {data}")
    
    def test_put_valuation_pillar_role_of_brand(self):
        """Test PUT valuation pillar with Role of Brand Index data"""
        valuation_data = {
            "role_of_brand": 65,
            "rbi_justificativa": "A marca tem forte influência na decisão de compra devido ao posicionamento premium"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/pillars/valuation",
            json=valuation_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("role_of_brand") == 65
        assert "influência" in data.get("rbi_justificativa", "")
        print(f"PUT RBI data response: {data}")
    
    def test_put_valuation_pillar_brand_strength(self):
        """Test PUT valuation pillar with Brand Strength scores (10 factors)"""
        brand_strength_data = {
            "brand_strength": {
                "clarity": 75,
                "commitment": 80,
                "governance": 70,
                "responsiveness": 65,
                "authenticity": 85,
                "relevance": 70,
                "differentiation": 60,
                "consistency": 75,
                "presence": 80,
                "engagement": 70
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/pillars/valuation",
            json=brand_strength_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "brand_strength" in data
        assert data["brand_strength"]["clarity"] == 75
        assert data["brand_strength"]["authenticity"] == 85
        print(f"PUT brand strength response: {data}")
    
    def test_put_valuation_pillar_complete_data(self):
        """Test PUT valuation pillar with complete valuation data"""
        complete_data = {
            "receita_anual": "15000000",
            "lucro_operacional": "3000000",
            "margem_operacional": "20",
            "custo_capital": "8",
            "lucro_economico": "1800000",
            "role_of_brand": 70,
            "rbi_justificativa": "Marca premium com forte diferenciação",
            "brand_strength": {
                "clarity": 80,
                "commitment": 75,
                "governance": 70,
                "responsiveness": 65,
                "authenticity": 85,
                "relevance": 75,
                "differentiation": 70,
                "consistency": 80,
                "presence": 75,
                "engagement": 70
            },
            "brand_value": "9450000.00",
            "pe_category": "consistent_over",
            "pe_ratio": "18.5",
            "pe_volatility": "15",
            "sector_pe_average": "15"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/pillars/valuation",
            json=complete_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all fields persisted
        assert data.get("receita_anual") == "15000000"
        assert data.get("lucro_operacional") == "3000000"
        assert data.get("role_of_brand") == 70
        assert data.get("brand_value") == "9450000.00"
        assert data.get("pe_category") == "consistent_over"
        assert "brand_strength" in data
        print(f"PUT complete data response: {data}")
    
    def test_get_valuation_pillar_verify_persistence(self):
        """Test GET valuation pillar to verify data persistence after PUT"""
        # First PUT some data
        test_data = {
            "receita_anual": "20000000",
            "lucro_operacional": "4000000",
            "role_of_brand": 75
        }
        
        put_response = self.session.put(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/pillars/valuation",
            json=test_data
        )
        assert put_response.status_code == 200
        
        # Then GET to verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/pillars/valuation")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data.get("receita_anual") == "20000000"
        assert data.get("lucro_operacional") == "4000000"
        assert data.get("role_of_brand") == 75
        print(f"GET after PUT - data persisted correctly: {data}")
    
    def test_valuation_pillar_unauthorized(self):
        """Test valuation pillar endpoints require authentication"""
        # Create new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        response = unauth_session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/pillars/valuation")
        assert response.status_code == 401
        print(f"Unauthorized access correctly rejected: {response.status_code}")
    
    def test_valuation_pillar_with_recommendations(self):
        """Test PUT valuation pillar with recommendations array"""
        data_with_recommendations = {
            "recommendations": [
                "Aumentar investimento em brand awareness",
                "Melhorar consistência da comunicação visual"
            ]
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/pillars/valuation",
            json=data_with_recommendations
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data
        assert len(data["recommendations"]) >= 2
        print(f"PUT recommendations response: {data}")


class TestAuthenticationFlow:
    """Test authentication for valuation feature"""
    
    def test_login_with_demo_credentials(self):
        """Test login with demo@labrand.com / demo123"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("email") == TEST_EMAIL
        print(f"Login successful: {data}")
    
    def test_get_current_user(self):
        """Test /api/auth/me endpoint"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login first
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Login failed")
        
        token = login_response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get current user
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data.get("email") == TEST_EMAIL
        print(f"Current user: {data}")


class TestBrandAccess:
    """Test brand access for valuation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Login failed")
    
    def test_get_brands_list(self):
        """Test getting list of brands"""
        response = self.session.get(f"{BASE_URL}/api/brands")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Brands list: {data}")
    
    def test_get_specific_brand(self):
        """Test getting specific brand by ID"""
        response = self.session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}")
        # May return 404 if brand doesn't exist for this user
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert data.get("brand_id") == TEST_BRAND_ID
            print(f"Brand data: {data}")
        else:
            print(f"Brand {TEST_BRAND_ID} not found (may need to create)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
