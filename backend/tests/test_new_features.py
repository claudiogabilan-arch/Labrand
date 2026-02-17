"""
Backend API tests for LaBrand new features:
- Onboarding module
- Brand Way (Jeito de Ser) module
- AI Mentor Insights
- AI Brand Way Suggestions
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@labrand.com"
TEST_PASSWORD = "password123"
TEST_BRAND_ID = "brand_92bcc15a44fb"


class TestLoginFlow:
    """Test login flow with demo credentials"""
    
    def test_login_with_demo_credentials(self):
        """Test login with demo@labrand.com / password123"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert data.get("email") == TEST_EMAIL
        assert "user_id" in data
        print(f"Login successful: user_id={data['user_id']}")


class TestOnboardingModule:
    """Test onboarding endpoints"""
    
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
    
    def test_post_onboarding_data(self):
        """Test POST /api/user/onboarding saves data correctly"""
        onboarding_data = {
            "user_type": "estrategista",
            "sector": "tecnologia",
            "revenue_range": "1m_10m",
            "brand_maturity": "estruturada",
            "main_objective": "valuation"
        }
        
        response = self.session.post(f"{BASE_URL}/api/user/onboarding", json=onboarding_data)
        
        assert response.status_code == 200, f"Onboarding POST failed: {response.text}"
        data = response.json()
        assert data.get("onboarding_completed") == True
        print(f"Onboarding POST successful: {data}")
    
    def test_get_onboarding_status(self):
        """Test GET /api/user/onboarding returns status"""
        response = self.session.get(f"{BASE_URL}/api/user/onboarding")
        
        assert response.status_code == 200, f"Onboarding GET failed: {response.text}"
        data = response.json()
        assert "onboarding_completed" in data
        assert "onboarding_data" in data
        print(f"Onboarding GET successful: {data}")
    
    def test_onboarding_data_persistence(self):
        """Test that onboarding data persists after POST"""
        # POST new data
        onboarding_data = {
            "user_type": "agencia",
            "sector": "saude",
            "revenue_range": "10m_50m",
            "brand_maturity": "avancada",
            "main_objective": "estruturacao"
        }
        
        post_response = self.session.post(f"{BASE_URL}/api/user/onboarding", json=onboarding_data)
        assert post_response.status_code == 200
        
        # GET to verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/user/onboarding")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["onboarding_data"]["sector"] == "saude"
        assert data["onboarding_data"]["revenue_range"] == "10m_50m"
        print(f"Onboarding data persisted correctly: {data}")


class TestBrandWayModule:
    """Test Brand Way (Jeito de Ser) endpoints"""
    
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
    
    def test_get_brand_way_empty(self):
        """Test GET /api/brands/{brand_id}/brand-way returns data or empty object"""
        response = self.session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/brand-way")
        
        assert response.status_code == 200, f"Brand Way GET failed: {response.text}"
        data = response.json()
        assert isinstance(data, dict)
        print(f"Brand Way GET successful: {data}")
    
    def test_put_brand_way_proposito(self):
        """Test PUT /api/brands/{brand_id}/brand-way with proposito data"""
        brand_way_data = {
            "proposito": {
                "declaracao": "Transformar vidas através da tecnologia",
                "impacto": "Democratizar o acesso à inovação",
                "evidencias": ["Projetos sociais", "Educação gratuita", "Open source"]
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/brand-way",
            json=brand_way_data
        )
        
        assert response.status_code == 200, f"Brand Way PUT failed: {response.text}"
        data = response.json()
        assert "proposito" in data
        assert data["proposito"]["declaracao"] == "Transformar vidas através da tecnologia"
        print(f"Brand Way PUT proposito successful: {data}")
    
    def test_put_brand_way_valores(self):
        """Test PUT /api/brands/{brand_id}/brand-way with valores data"""
        brand_way_data = {
            "valores": {
                "lista": ["Inovação", "Transparência", "Excelência"],
                "descricoes": {
                    "Inovação": "Buscar sempre novas soluções",
                    "Transparência": "Comunicação clara e honesta",
                    "Excelência": "Entregar o melhor sempre"
                }
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/brand-way",
            json=brand_way_data
        )
        
        assert response.status_code == 200, f"Brand Way PUT failed: {response.text}"
        data = response.json()
        assert "valores" in data
        assert len(data["valores"]["lista"]) == 3
        print(f"Brand Way PUT valores successful: {data}")
    
    def test_put_brand_way_complete(self):
        """Test PUT /api/brands/{brand_id}/brand-way with complete data"""
        brand_way_data = {
            "proposito": {
                "declaracao": "Transformar vidas através da tecnologia",
                "impacto": "Democratizar o acesso à inovação",
                "evidencias": ["Projetos sociais", "Educação gratuita"]
            },
            "valores": {
                "lista": ["Inovação", "Transparência"],
                "descricoes": {"Inovação": "Buscar novas soluções"}
            },
            "personalidade": {
                "arquetipo_principal": "O Sábio",
                "arquetipo_secundario": "O Criador",
                "atributos": ["Confiante", "Inovador", "Acessível"]
            },
            "tom_voz": {
                "estilo": "Profissional mas acessível",
                "exemplos_fazer": ["Usar linguagem simples"],
                "exemplos_evitar": ["Jargões técnicos excessivos"]
            },
            "comportamentos": {
                "internos": ["Feedback constante"],
                "externos": ["Resposta em 24h"],
                "rituais": ["Reunião semanal"]
            },
            "promessa": {
                "declaracao": "Entregar soluções que transformam",
                "funcional": "Software de qualidade",
                "emocional": "Confiança e segurança",
                "aspiracional": "Líder em inovação"
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/brand-way",
            json=brand_way_data
        )
        
        assert response.status_code == 200, f"Brand Way PUT failed: {response.text}"
        data = response.json()
        assert "proposito" in data
        assert "valores" in data
        assert "personalidade" in data
        assert "tom_voz" in data
        assert "comportamentos" in data
        assert "promessa" in data
        print(f"Brand Way PUT complete successful")
    
    def test_brand_way_data_persistence(self):
        """Test that Brand Way data persists after PUT"""
        # PUT data
        brand_way_data = {
            "proposito": {
                "declaracao": "TEST_PERSISTENCE_CHECK",
                "impacto": "Test impact",
                "evidencias": ["ev1"]
            }
        }
        
        put_response = self.session.put(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/brand-way",
            json=brand_way_data
        )
        assert put_response.status_code == 200
        
        # GET to verify persistence
        get_response = self.session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/brand-way")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["proposito"]["declaracao"] == "TEST_PERSISTENCE_CHECK"
        print(f"Brand Way data persisted correctly")


class TestAIBrandWaySuggestions:
    """Test AI Brand Way suggestions endpoint"""
    
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
    
    def test_ai_brand_way_proposito(self):
        """Test POST /api/ai/brand-way generates suggestions for proposito"""
        request_data = {
            "dimension": "proposito",
            "brand_name": "Minha Marca Demo",
            "industry": "tecnologia",
            "current_data": {}
        }
        
        response = self.session.post(f"{BASE_URL}/api/ai/brand-way", json=request_data)
        
        assert response.status_code == 200, f"AI Brand Way failed: {response.text}"
        data = response.json()
        assert "suggestions" in data
        suggestions = data["suggestions"]
        # Check for expected fields in proposito response
        assert "declaracao" in suggestions or "raw" in suggestions
        print(f"AI Brand Way proposito successful: {suggestions}")
    
    def test_ai_brand_way_valores(self):
        """Test POST /api/ai/brand-way generates suggestions for valores"""
        request_data = {
            "dimension": "valores",
            "brand_name": "Minha Marca Demo",
            "industry": "tecnologia",
            "current_data": {}
        }
        
        response = self.session.post(f"{BASE_URL}/api/ai/brand-way", json=request_data)
        
        assert response.status_code == 200, f"AI Brand Way failed: {response.text}"
        data = response.json()
        assert "suggestions" in data
        print(f"AI Brand Way valores successful")
    
    def test_ai_brand_way_personalidade(self):
        """Test POST /api/ai/brand-way generates suggestions for personalidade"""
        request_data = {
            "dimension": "personalidade",
            "brand_name": "Minha Marca Demo",
            "industry": "tecnologia",
            "current_data": {}
        }
        
        response = self.session.post(f"{BASE_URL}/api/ai/brand-way", json=request_data)
        
        assert response.status_code == 200, f"AI Brand Way failed: {response.text}"
        data = response.json()
        assert "suggestions" in data
        print(f"AI Brand Way personalidade successful")


class TestAIMentorInsights:
    """Test AI Mentor insights endpoint"""
    
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
    
    def test_ai_mentor_generates_insights(self):
        """Test POST /api/ai/mentor generates insights"""
        request_data = {
            "brand_id": TEST_BRAND_ID,
            "brand_name": "Minha Marca Demo",
            "industry": "tecnologia"
        }
        
        response = self.session.post(f"{BASE_URL}/api/ai/mentor", json=request_data)
        
        assert response.status_code == 200, f"AI Mentor failed: {response.text}"
        data = response.json()
        assert "insights" in data
        insights = data["insights"]
        assert len(insights) > 100  # Should have substantial content
        print(f"AI Mentor successful, insights length: {len(insights)}")
    
    def test_ai_mentor_unauthorized(self):
        """Test AI Mentor requires authentication"""
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        request_data = {
            "brand_id": TEST_BRAND_ID,
            "brand_name": "Test",
            "industry": "tech"
        }
        
        response = unauth_session.post(f"{BASE_URL}/api/ai/mentor", json=request_data)
        assert response.status_code == 401
        print(f"AI Mentor unauthorized correctly rejected")


class TestBrandWayUnauthorized:
    """Test Brand Way endpoints require authentication"""
    
    def test_brand_way_get_unauthorized(self):
        """Test GET /api/brands/{brand_id}/brand-way requires auth"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/brand-way")
        assert response.status_code == 401
        print(f"Brand Way GET unauthorized correctly rejected")
    
    def test_brand_way_put_unauthorized(self):
        """Test PUT /api/brands/{brand_id}/brand-way requires auth"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.put(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/brand-way",
            json={"proposito": {"declaracao": "test"}}
        )
        assert response.status_code == 401
        print(f"Brand Way PUT unauthorized correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
