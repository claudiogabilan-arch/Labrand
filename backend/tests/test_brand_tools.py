"""
Test suite for 6 Brand Tools features:
1. Brand Score Unificado
2. Relatório PDF Executivo  
3. Alertas por Email
4. Social Listening Light
5. Análise de Concorrentes com IA
6. Gerador de Conteúdo de Marca
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials from previous iterations
TEST_EMAIL = "demo@labrand.com"
TEST_PASSWORD = "password123"
TEST_BRAND_ID = "brand_92bcc15a44fb"


class TestBrandToolsSetup:
    """Setup tests - login and verify auth"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_login_success(self, session, auth_token):
        """Verify login works and returns token"""
        assert auth_token is not None
        assert len(auth_token) > 10
        print(f"Login successful - token received")


class TestBrandScore:
    """1. Brand Score Unificado - GET /api/brands/{brand_id}/brand-score"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_brand_score(self, session, headers):
        """Test brand score endpoint returns score and dimensions"""
        response = session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/brand-score", headers=headers)
        assert response.status_code == 200, f"Brand score failed: {response.text}"
        
        data = response.json()
        assert "unified_score" in data, "Missing unified_score"
        assert "level" in data, "Missing level"
        assert "status" in data, "Missing status"
        assert "dimensions" in data, "Missing dimensions"
        
        # Validate score range
        assert 0 <= data["unified_score"] <= 100, f"Invalid score: {data['unified_score']}"
        
        # Validate dimensions structure
        dims = data["dimensions"]
        expected_dims = ["estrategia", "experiencia", "maturidade", "consistencia"]
        for dim in expected_dims:
            assert dim in dims, f"Missing dimension: {dim}"
            assert "score" in dims[dim]
            assert "weight" in dims[dim]
            assert "label" in dims[dim]
        
        print(f"Brand Score: {data['unified_score']} - Level: {data['level']}")
    
    def test_brand_score_recommendations(self, session, headers):
        """Verify recommendations are included"""
        response = session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/brand-score", headers=headers)
        data = response.json()
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)
        print(f"Recommendations: {[r for r in data['recommendations'] if r]}")
    
    def test_brand_score_unauthorized(self, session):
        """Test 401 when no auth"""
        response = session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/brand-score")
        assert response.status_code == 401
    
    def test_brand_score_not_found(self, session, headers):
        """Test 404 for invalid brand"""
        response = session.get(f"{BASE_URL}/api/brands/invalid_brand_xyz/brand-score", headers=headers)
        assert response.status_code == 404


class TestPDFReport:
    """2. Relatório PDF Executivo - POST /api/brands/{brand_id}/reports/executive-pdf"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_generate_pdf_report(self, session, headers):
        """Test generating executive PDF report"""
        response = session.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/reports/executive-pdf",
            headers=headers,
            json={"sections": ["score", "pillars", "recommendations"]}
        )
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        
        data = response.json()
        assert "report_id" in data
        assert "brand_id" in data
        assert "generated_at" in data
        assert "executive_summary" in data
        assert data["download_ready"] == True
        
        # Verify executive summary structure
        summary = data["executive_summary"]
        assert "overall_health" in summary
        assert "key_strengths" in summary
        assert "areas_for_improvement" in summary
        
        print(f"Report generated: {data['report_id']}")
    
    def test_get_report_history(self, session, headers):
        """Test report history endpoint"""
        response = session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/reports/history", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "reports" in data
        assert "total" in data
        assert isinstance(data["reports"], list)
        
        print(f"Report history: {data['total']} reports found")


class TestEmailAlerts:
    """3. Alertas por Email"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_alert_config(self, session, headers):
        """Test getting alert configuration"""
        response = session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/alerts/config", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "brand_id" in data
        assert "alert_types" in data
        assert "frequency" in data
        
        print(f"Alert config: frequency={data.get('frequency')}, types={data.get('alert_types')}")
    
    def test_save_alert_config(self, session, headers):
        """Test saving alert configuration"""
        config = {
            "alert_types": ["consistency", "risk", "opportunities"],
            "frequency": "weekly",
            "recipients": [TEST_EMAIL]
        }
        response = session.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/alerts/config",
            headers=headers,
            json=config
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "config" in data
        assert data["config"]["frequency"] == "weekly"
        
        print(f"Alert config saved successfully")
    
    def test_send_test_alert(self, session, headers):
        """Test sending test alert (MOCK)"""
        response = session.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/alerts/send-test",
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "message" in data
        assert "MOCK" in data["message"]  # Verify it's mocked
        assert "preview" in data
        
        print(f"Test alert sent (MOCK): {data['message']}")


class TestSocialListening:
    """4. Social Listening Light - GET /api/brands/{brand_id}/social-listening/mentions"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_social_mentions(self, session, headers):
        """Test social listening mentions endpoint (MOCK)"""
        response = session.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/social-listening/mentions?days=30",
            headers=headers
        )
        assert response.status_code == 200, f"Social listening failed: {response.text}"
        
        data = response.json()
        assert "brand_id" in data
        assert "total_mentions" in data
        assert "sentiment_summary" in data
        assert "sentiment_score" in data
        assert "mentions" in data
        assert "reach_total" in data
        
        # Verify mentions structure
        assert isinstance(data["mentions"], list)
        if data["mentions"]:
            mention = data["mentions"][0]
            assert "source" in mention
            assert "text" in mention
            assert "sentiment" in mention
        
        # Verify MOCK indicator
        assert "note" in data
        assert "MOCK" in data["note"]
        
        print(f"Social mentions: {data['total_mentions']} total, sentiment score: {data['sentiment_score']}")
    
    def test_social_mentions_with_days_param(self, session, headers):
        """Test days parameter works"""
        response = session.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/social-listening/mentions?days=7",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["period_days"] == 7
    
    def test_social_mentions_trending_topics(self, session, headers):
        """Verify trending topics included"""
        response = session.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/social-listening/mentions",
            headers=headers
        )
        data = response.json()
        assert "trending_topics" in data
        assert isinstance(data["trending_topics"], list)
        print(f"Trending topics: {data['trending_topics']}")


class TestCompetitorAnalysis:
    """5. Análise de Concorrentes com IA - POST /api/brands/{brand_id}/competitors/analyze-ai"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class") 
    def headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def user_id(self, session, headers):
        """Get user_id for checking credits"""
        response = session.get(f"{BASE_URL}/api/auth/me", headers=headers)
        return response.json().get("user_id")
    
    def test_analyze_competitors_basic(self, session, headers):
        """Test competitor analysis with basic depth"""
        response = session.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/competitors/analyze-ai",
            headers=headers,
            json={
                "competitors": ["Competitor A", "Competitor B"],
                "analysis_depth": "basic"
            }
        )
        
        # Check for 200 or 402 (insufficient credits)
        if response.status_code == 402:
            print("Competitor analysis: Insufficient credits (expected for basic test)")
            pytest.skip("Insufficient credits for competitor analysis")
        
        assert response.status_code == 200, f"Analysis failed: {response.text}"
        
        data = response.json()
        assert "brand_id" in data
        assert "competitors_analyzed" in data
        assert "analysis" in data
        assert "strategic_recommendations" in data
        assert "credits_used" in data
        
        # Verify credits used (2 for basic)
        assert data["credits_used"] == 2
        
        # Verify analysis structure
        for comp_analysis in data["analysis"]:
            assert "competitor" in comp_analysis
            assert "positioning" in comp_analysis
            assert "strengths" in comp_analysis
            assert "weaknesses" in comp_analysis
            assert "threat_level" in comp_analysis
        
        print(f"Competitors analyzed: {data['competitors_analyzed']}, credits used: {data['credits_used']}")
    
    def test_competitor_analysis_insufficient_credits(self, session, headers):
        """Test 402 when insufficient credits"""
        # This may pass or skip depending on credits balance
        response = session.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/competitors/analyze-ai",
            headers=headers,
            json={"competitors": ["Test"], "analysis_depth": "detailed"}  # 4 credits
        )
        
        if response.status_code == 402:
            data = response.json()
            assert "Créditos insuficientes" in data.get("detail", "")
            print("402 returned for insufficient credits - correct behavior")
        else:
            print(f"Analysis succeeded with status {response.status_code}")


class TestContentGenerator:
    """6. Gerador de Conteúdo de Marca"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def headers(self, session):
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_content_types(self, session, headers):
        """Test listing available content types"""
        response = session.get(f"{BASE_URL}/api/content-generator/types", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "types" in data
        
        types = data["types"]
        expected_types = ["tagline", "post_social", "bio", "manifesto", "elevator_pitch"]
        
        for expected in expected_types:
            found = any(t["id"] == expected for t in types)
            assert found, f"Missing content type: {expected}"
        
        # Verify structure
        for t in types:
            assert "id" in t
            assert "name" in t
            assert "credits" in t
        
        print(f"Content types available: {[t['id'] for t in types]}")
    
    def test_generate_tagline(self, session, headers):
        """Test generating tagline content"""
        response = session.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/content-generator/generate",
            headers=headers,
            json={"content_type": "tagline", "tone": "professional"}
        )
        
        if response.status_code == 402:
            print("Content generation: Insufficient credits")
            pytest.skip("Insufficient credits for content generation")
        
        assert response.status_code == 200, f"Generation failed: {response.text}"
        
        data = response.json()
        assert "content_type" in data
        assert "suggestions" in data
        assert "credits_used" in data
        assert data["credits_used"] == 1  # tagline costs 1 credit
        
        assert isinstance(data["suggestions"], list)
        assert len(data["suggestions"]) > 0
        
        print(f"Generated taglines: {data['suggestions']}")
    
    def test_generate_post_social(self, session, headers):
        """Test generating social post content"""
        response = session.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/content-generator/generate",
            headers=headers,
            json={"content_type": "post_social", "tone": "casual"}
        )
        
        if response.status_code == 402:
            pytest.skip("Insufficient credits")
        
        assert response.status_code == 200
        data = response.json()
        assert data["content_type"] == "post_social"
        assert data["credits_used"] == 1
    
    def test_invalid_content_type(self, session, headers):
        """Test 400 for invalid content type"""
        response = session.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/content-generator/generate",
            headers=headers,
            json={"content_type": "invalid_type", "tone": "professional"}
        )
        assert response.status_code == 400
        assert "inválido" in response.json().get("detail", "").lower()
    
    def test_content_history(self, session, headers):
        """Test content generation history"""
        response = session.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/content-generator/history",
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "contents" in data
        assert "total" in data
        print(f"Content history: {data['total']} items")


class TestUnauthorizedAccess:
    """Test unauthorized access to all endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    def test_brand_score_unauthorized(self, session):
        response = session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/brand-score")
        assert response.status_code == 401
    
    def test_pdf_report_unauthorized(self, session):
        response = session.post(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/reports/executive-pdf", json={})
        assert response.status_code == 401
    
    def test_alerts_config_unauthorized(self, session):
        response = session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/alerts/config")
        assert response.status_code == 401
    
    def test_social_listening_unauthorized(self, session):
        response = session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/social-listening/mentions")
        assert response.status_code == 401
    
    def test_competitor_analysis_unauthorized(self, session):
        response = session.post(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/competitors/analyze-ai", json={"competitors": []})
        assert response.status_code == 401
    
    def test_content_generator_unauthorized(self, session):
        response = session.post(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/content-generator/generate", json={})
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
