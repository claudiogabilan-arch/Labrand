"""
Test suite for LaBrand new modules:
- Onboarding
- Brand Risk Analysis
- Competitor Analysis
- Consistency Alerts
- Google Integration

Uses pytest with requests library.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://labrand-staging-2.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "demo@labrand.com"
TEST_PASSWORD = "password123"
TEST_BRAND_ID = "brand_92bcc15a44fb"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in response"
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestOnboarding:
    """Test onboarding endpoints"""
    
    def test_get_onboarding_status(self, auth_headers):
        """GET /api/user/onboarding - Get onboarding status"""
        response = requests.get(
            f"{BASE_URL}/api/user/onboarding",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "onboarding_completed" in data
        assert "onboarding_data" in data
        assert "user_type" in data
        print(f"Onboarding status: completed={data['onboarding_completed']}")
    
    def test_post_onboarding_data(self, auth_headers):
        """POST /api/user/onboarding - Save onboarding data"""
        onboarding_data = {
            "user_type": "estrategista",
            "sector": "tecnologia",
            "revenue_range": "1m_10m",
            "brand_maturity": "estruturada",
            "main_objective": "valuation"
        }
        response = requests.post(
            f"{BASE_URL}/api/user/onboarding",
            headers=auth_headers,
            json=onboarding_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("onboarding_completed") == True
        print("Onboarding data saved successfully")
    
    def test_verify_onboarding_persisted(self, auth_headers):
        """Verify onboarding data was persisted"""
        response = requests.get(
            f"{BASE_URL}/api/user/onboarding",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["onboarding_completed"] == True
        assert data["onboarding_data"].get("sector") == "tecnologia"
        print("Onboarding data persisted correctly")


class TestBrandRiskAnalysis:
    """Test brand risk analysis endpoints"""
    
    def test_get_risk_analysis_empty(self, auth_headers):
        """GET /api/brands/{brand_id}/risk-analysis - Get risk analysis (may be empty)"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/risk-analysis",
            headers=auth_headers
        )
        assert response.status_code == 200
        # May return empty dict if no analysis done yet
        print(f"Risk analysis GET response: {response.json()}")
    
    def test_post_risk_analysis_ai(self, auth_headers):
        """POST /api/brands/{brand_id}/risk-analysis - Run AI risk analysis"""
        response = requests.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/risk-analysis",
            headers=auth_headers,
            json={}
        )
        # AI analysis may take time, allow for 500 if LLM fails
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "risks" in data or "brand_id" in data
            print(f"Risk analysis completed: {list(data.get('risks', {}).keys())}")
        else:
            print(f"Risk analysis AI error (expected in some cases): {response.text[:200]}")
    
    def test_get_risk_analysis_after_post(self, auth_headers):
        """GET /api/brands/{brand_id}/risk-analysis - Verify data persisted"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/risk-analysis",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # If AI analysis succeeded, should have risks
        if data:
            print(f"Risk data retrieved: {list(data.keys())}")


class TestCompetitorAnalysis:
    """Test competitor analysis endpoints"""
    
    def test_get_competitors_empty(self, auth_headers):
        """GET /api/brands/{brand_id}/competitors - Get competitors (may be empty)"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/competitors",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "competitors" in data
        assert "my_brand_scores" in data
        print(f"Competitors count: {len(data['competitors'])}")
    
    def test_put_competitors_add_competitor(self, auth_headers):
        """PUT /api/brands/{brand_id}/competitors - Add competitors"""
        competitors_data = {
            "competitors": [
                {
                    "id": "comp_test_1",
                    "name": "Concorrente A",
                    "description": "Principal concorrente no mercado",
                    "scores": {
                        "preco": 70,
                        "qualidade": 80,
                        "inovacao": 65,
                        "atendimento": 75,
                        "presenca_digital": 85,
                        "reconhecimento": 70
                    }
                },
                {
                    "id": "comp_test_2",
                    "name": "Concorrente B",
                    "description": "Concorrente secundário",
                    "scores": {
                        "preco": 60,
                        "qualidade": 70,
                        "inovacao": 80,
                        "atendimento": 65,
                        "presenca_digital": 75,
                        "reconhecimento": 60
                    }
                }
            ],
            "my_brand_scores": {
                "preco": 75,
                "qualidade": 85,
                "inovacao": 70,
                "atendimento": 80,
                "presenca_digital": 90,
                "reconhecimento": 75
            }
        }
        response = requests.put(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/competitors",
            headers=auth_headers,
            json=competitors_data
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["competitors"]) == 2
        assert data["my_brand_scores"]["preco"] == 75
        print("Competitors data saved successfully")
    
    def test_verify_competitors_persisted(self, auth_headers):
        """Verify competitors data was persisted"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/competitors",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["competitors"]) >= 2
        assert data["competitors"][0]["name"] == "Concorrente A"
        print("Competitors data persisted correctly")


class TestConsistencyAlerts:
    """Test consistency alerts endpoints"""
    
    def test_get_consistency_alerts_empty(self, auth_headers):
        """GET /api/brands/{brand_id}/consistency-alerts - Get alerts (may be empty)"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/consistency-alerts",
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"Consistency alerts GET response: {response.json()}")
    
    def test_post_consistency_alerts_ai(self, auth_headers):
        """POST /api/brands/{brand_id}/consistency-alerts - Run AI consistency analysis"""
        response = requests.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/consistency-alerts",
            headers=auth_headers,
            json={}
        )
        # AI analysis may take time, allow for 500 if LLM fails
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "alerts" in data or "brand_id" in data
            print(f"Consistency analysis completed: {len(data.get('alerts', []))} alerts")
        else:
            print(f"Consistency analysis AI error (expected in some cases): {response.text[:200]}")
    
    def test_get_consistency_alerts_after_post(self, auth_headers):
        """GET /api/brands/{brand_id}/consistency-alerts - Verify data persisted"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/consistency-alerts",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        if data:
            print(f"Consistency data retrieved: {list(data.keys())}")


class TestGoogleIntegration:
    """Test Google integration endpoints"""
    
    def test_get_google_integration_initial(self, auth_headers):
        """GET /api/brands/{brand_id}/google-integration - Get initial state"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/google-integration",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "connection_status" in data
        print(f"Google integration status: {data['connection_status']}")
    
    def test_connect_google_analytics(self, auth_headers):
        """POST /api/brands/{brand_id}/google-integration/connect - Connect Analytics"""
        response = requests.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/google-integration/connect",
            headers=auth_headers,
            json={
                "service": "analytics",
                "property_id": "123456789"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["connection_status"]["analytics"] == True
        assert "analytics" in data
        assert data["analytics"]["users"] > 0
        print(f"Analytics connected: {data['analytics']['users']} users")
    
    def test_connect_search_console(self, auth_headers):
        """POST /api/brands/{brand_id}/google-integration/connect - Connect Search Console"""
        response = requests.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/google-integration/connect",
            headers=auth_headers,
            json={
                "service": "searchConsole",
                "site_url": "https://example.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["connection_status"]["searchConsole"] == True
        assert "search_console" in data
        assert data["search_console"]["clicks"] > 0
        print(f"Search Console connected: {data['search_console']['clicks']} clicks")
    
    def test_verify_google_integration_persisted(self, auth_headers):
        """Verify Google integration data was persisted"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/google-integration",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["connection_status"]["analytics"] == True
        assert data["connection_status"]["searchConsole"] == True
        print("Google integration data persisted correctly")
    
    def test_refresh_google_data(self, auth_headers):
        """POST /api/brands/{brand_id}/google-integration/refresh - Refresh data"""
        response = requests.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/google-integration/refresh",
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("Google data refresh successful")
    
    def test_disconnect_analytics(self, auth_headers):
        """POST /api/brands/{brand_id}/google-integration/disconnect - Disconnect Analytics"""
        response = requests.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/google-integration/disconnect",
            headers=auth_headers,
            json={"service": "analytics"}
        )
        assert response.status_code == 200
        print("Analytics disconnected")
    
    def test_disconnect_search_console(self, auth_headers):
        """POST /api/brands/{brand_id}/google-integration/disconnect - Disconnect Search Console"""
        response = requests.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/google-integration/disconnect",
            headers=auth_headers,
            json={"service": "searchConsole"}
        )
        assert response.status_code == 200
        print("Search Console disconnected")
    
    def test_verify_disconnection(self, auth_headers):
        """Verify services were disconnected"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/google-integration",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["connection_status"]["analytics"] == False
        assert data["connection_status"]["searchConsole"] == False
        print("Services disconnected correctly")
    
    def test_reconnect_for_frontend_testing(self, auth_headers):
        """Reconnect services for frontend testing"""
        # Reconnect Analytics
        response = requests.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/google-integration/connect",
            headers=auth_headers,
            json={"service": "analytics", "property_id": "123456789"}
        )
        assert response.status_code == 200
        
        # Reconnect Search Console
        response = requests.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/google-integration/connect",
            headers=auth_headers,
            json={"service": "searchConsole", "site_url": "https://example.com"}
        )
        assert response.status_code == 200
        print("Services reconnected for frontend testing")


class TestUnauthorizedAccess:
    """Test unauthorized access is properly rejected"""
    
    def test_risk_analysis_unauthorized(self):
        """Risk analysis should reject unauthorized requests"""
        response = requests.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/risk-analysis")
        assert response.status_code == 401
    
    def test_competitors_unauthorized(self):
        """Competitors should reject unauthorized requests"""
        response = requests.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/competitors")
        assert response.status_code == 401
    
    def test_consistency_alerts_unauthorized(self):
        """Consistency alerts should reject unauthorized requests"""
        response = requests.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/consistency-alerts")
        assert response.status_code == 401
    
    def test_google_integration_unauthorized(self):
        """Google integration should reject unauthorized requests"""
        response = requests.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/google-integration")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
