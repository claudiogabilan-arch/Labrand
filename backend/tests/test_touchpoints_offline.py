"""
Touchpoints Offline Business Rules Tests
Tests for the detailed offline touchpoint types: Palestra, Imersao, Midia, Mentoria
Including guidance messages, default funnel phases, and needs_update detection
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
BRAND_ID = "brand_29aafd2d6125"

# Test credentials
TEST_EMAIL = "admin@labrand.com"
TEST_PASSWORD = "LaBrand@2024!"

# Test touchpoint IDs for cleanup
created_touchpoint_ids = []


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test session"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Auth failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated API client"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestOfflineTypesEndpoint:
    """Tests for GET /api/touchpoints/offline-types endpoint"""
    
    def test_get_offline_types_returns_4_types(self, api_client):
        """Verify 4 offline types are returned with correct metadata"""
        response = api_client.get(f"{BASE_URL}/api/touchpoints/offline-types")
        assert response.status_code == 200
        
        data = response.json()
        assert "types" in data
        types = data["types"]
        
        # Verify exactly 4 types
        assert len(types) == 4
        
        # Verify type IDs
        type_ids = [t["id"] for t in types]
        assert "palestra" in type_ids
        assert "imersao" in type_ids
        assert "midia" in type_ids
        assert "mentoria" in type_ids
        print("✓ GET /api/touchpoints/offline-types returns 4 types")
    
    def test_palestra_type_metadata(self, api_client):
        """Verify Palestra type has correct default funnel phase and orientation"""
        response = api_client.get(f"{BASE_URL}/api/touchpoints/offline-types")
        types = response.json()["types"]
        
        palestra = next(t for t in types if t["id"] == "palestra")
        assert palestra["label"] == "Palestra ou Keynote"
        assert palestra["default_fase_funil"] == "Topo de Funil"
        assert "orientacao" in palestra
        assert len(palestra["orientacao"]) > 10  # Has meaningful text
        assert "metricas_obrigatorias" in palestra
        print("✓ Palestra type has correct metadata and default_fase_funil=Topo de Funil")
    
    def test_imersao_type_metadata(self, api_client):
        """Verify Imersao type has correct default funnel phase (Meio de Funil)"""
        response = api_client.get(f"{BASE_URL}/api/touchpoints/offline-types")
        types = response.json()["types"]
        
        imersao = next(t for t in types if t["id"] == "imersao")
        assert imersao["label"] == "Imersao Presencial"
        assert imersao["default_fase_funil"] == "Meio de Funil"
        assert "nome_exemplo" in imersao
        print("✓ Imersao type has correct metadata and default_fase_funil=Meio de Funil")
    
    def test_mentoria_type_metadata(self, api_client):
        """Verify Mentoria type has correct default funnel phase (Fundo de Funil)"""
        response = api_client.get(f"{BASE_URL}/api/touchpoints/offline-types")
        types = response.json()["types"]
        
        mentoria = next(t for t in types if t["id"] == "mentoria")
        assert mentoria["label"] == "Mentoria ou Reuniao Estrategica"
        assert mentoria["default_fase_funil"] == "Fundo de Funil"
        print("✓ Mentoria type has correct metadata and default_fase_funil=Fundo de Funil")
    
    def test_all_types_have_dicas(self, api_client):
        """Verify all offline types have contextual tips (dicas)"""
        response = api_client.get(f"{BASE_URL}/api/touchpoints/offline-types")
        types = response.json()["types"]
        
        for t in types:
            assert "dicas" in t, f"Type {t['id']} missing dicas"
            assert "custo_mensal" in t["dicas"], f"Type {t['id']} missing dicas.custo_mensal"
            assert "receita_gerada" in t["dicas"], f"Type {t['id']} missing dicas.receita_gerada"
        print("✓ All 4 offline types have contextual tips (dicas)")


class TestCreateOfflineTouchpoint:
    """Tests for POST /api/brands/{brand_id}/touchpoints with offline types"""
    
    def test_create_offline_touchpoint_with_tipo_offline(self, api_client):
        """Create offline touchpoint and verify tipo_offline is saved"""
        payload = {
            "nome": "TEST_Palestra Marketing Digital - Jan 2025",
            "descricao": "Palestra sobre branding digital",
            "ambiente": "Offline",
            "tipo_offline": "palestra",
            "fase_funil": "Topo de Funil",
            "sentimento": "Feliz",
            "nota": 8,
            "persona": "Geral",
            "custo_mensal": 500,
            "receita_gerada": 0,
            "conversoes": 5
        }
        
        response = api_client.post(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "touchpoint" in data
        tp = data["touchpoint"]
        
        # Verify tipo_offline is saved
        assert tp["tipo_offline"] == "palestra"
        assert tp["ambiente"] == "Offline"
        assert tp["nome"] == payload["nome"]
        
        # Store for cleanup
        created_touchpoint_ids.append(tp["touchpoint_id"])
        print(f"✓ Created offline touchpoint with tipo_offline=palestra (id={tp['touchpoint_id']})")
    
    def test_create_offline_touchpoint_returns_guidance(self, api_client):
        """Verify POST response includes guidance messages array"""
        payload = {
            "nome": "TEST_Imersao Brand Equity - Jan 2025",
            "ambiente": "Offline",
            "tipo_offline": "imersao",
            "nota": 0,  # Will trigger guidance message
            "custo_mensal": 1000,
            "receita_gerada": 0,
            "conversoes": 3
        }
        
        response = api_client.post(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "guidance" in data
        # With nota=0 and conversoes>0 but receita=0, we expect guidance messages
        print(f"✓ POST /touchpoints returns {{touchpoint, guidance}} structure. Guidance count: {len(data['guidance'])}")
        
        created_touchpoint_ids.append(data["touchpoint"]["touchpoint_id"])
    
    def test_guidance_for_nota_zero(self, api_client):
        """Verify guidance message appears when nota=0"""
        payload = {
            "nome": "TEST_Mentoria Sem NPS - Jan 2025",
            "ambiente": "Offline",
            "tipo_offline": "mentoria",
            "nota": 0,  # This should trigger warning guidance
            "custo_mensal": 500
        }
        
        response = api_client.post(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints", json=payload)
        assert response.status_code == 200
        
        guidance = response.json().get("guidance", [])
        warning_found = any(g["type"] == "warning" and "Nota de Avaliacao" in g["message"] for g in guidance)
        assert warning_found, "Expected warning guidance for nota=0"
        print("✓ Guidance message for nota=0 is correctly generated")
        
        created_touchpoint_ids.append(response.json()["touchpoint"]["touchpoint_id"])
    
    def test_guidance_for_receita_zero_with_conversoes(self, api_client):
        """Verify guidance message when receita=0 but conversoes>0"""
        payload = {
            "nome": "TEST_Podcast Sem Receita - Jan 2025",
            "ambiente": "Offline",
            "tipo_offline": "midia",
            "nota": 7,
            "receita_gerada": 0,
            "conversoes": 10  # Has conversions but no revenue
        }
        
        response = api_client.post(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints", json=payload)
        assert response.status_code == 200
        
        guidance = response.json().get("guidance", [])
        info_found = any(g["type"] == "info" and "receita atribuida" in g["message"] for g in guidance)
        assert info_found, "Expected info guidance for receita=0 with conversoes>0"
        print("✓ Guidance message for receita=0 with conversoes>0 is correctly generated")
        
        created_touchpoint_ids.append(response.json()["touchpoint"]["touchpoint_id"])


class TestGetTouchpointsWithOfflineStats:
    """Tests for GET /api/brands/{brand_id}/touchpoints with offline statistics"""
    
    def test_touchpoints_response_includes_offline_stats(self, api_client):
        """Verify GET touchpoints includes total_offline and total_online in stats"""
        response = api_client.get(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints")
        assert response.status_code == 200
        
        data = response.json()
        stats = data.get("stats", {})
        
        assert "total_offline" in stats, "Missing total_offline in stats"
        assert "total_online" in stats, "Missing total_online in stats"
        print(f"✓ GET /touchpoints returns offline stats: total_offline={stats['total_offline']}, total_online={stats['total_online']}")
    
    def test_touchpoints_response_includes_page_guidance(self, api_client):
        """Verify GET touchpoints includes page_guidance array"""
        response = api_client.get(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints")
        assert response.status_code == 200
        
        data = response.json()
        assert "page_guidance" in data
        assert isinstance(data["page_guidance"], list)
        print(f"✓ GET /touchpoints includes page_guidance array (length={len(data['page_guidance'])})")
    
    def test_touchpoints_response_includes_needs_update(self, api_client):
        """Verify GET touchpoints includes needs_update array for touchpoints needing attention"""
        response = api_client.get(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints")
        assert response.status_code == 200
        
        data = response.json()
        assert "needs_update" in data
        assert isinstance(data["needs_update"], list)
        
        # Each needs_update item should have touchpoint_id, nome, and messages
        for item in data["needs_update"]:
            assert "touchpoint_id" in item
            assert "nome" in item
            assert "messages" in item
        
        print(f"✓ GET /touchpoints includes needs_update array with {len(data['needs_update'])} touchpoints needing attention")


class TestGetPersonas:
    """Tests for GET /api/brands/{brand_id}/personas"""
    
    def test_personas_returns_persona_names(self, api_client):
        """Verify GET personas includes persona_names array with 'Geral' default"""
        response = api_client.get(f"{BASE_URL}/api/brands/{BRAND_ID}/personas")
        assert response.status_code == 200
        
        data = response.json()
        assert "personas" in data
        assert "persona_names" in data
        assert isinstance(data["persona_names"], list)
        assert "Geral" in data["persona_names"], "persona_names should include 'Geral'"
        print(f"✓ GET /personas returns persona_names array: {data['persona_names']}")


class TestUpdateTouchpointReturnsGuidance:
    """Tests for PUT /api/brands/{brand_id}/touchpoints/{touchpoint_id}"""
    
    def test_update_touchpoint_returns_guidance(self, api_client):
        """Verify PUT touchpoint returns updated guidance messages"""
        # First create a touchpoint
        payload = {
            "nome": "TEST_Update Guidance Test",
            "ambiente": "Offline",
            "tipo_offline": "palestra",
            "nota": 7,
            "custo_mensal": 1000,
            "receita_gerada": 5000,
            "conversoes": 10
        }
        
        create_res = api_client.post(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints", json=payload)
        assert create_res.status_code == 200
        tp_id = create_res.json()["touchpoint"]["touchpoint_id"]
        created_touchpoint_ids.append(tp_id)
        
        # Update it to nota=0 which should trigger guidance
        update_payload = {"nota": 0, "nome": "TEST_Update Guidance Test - Updated"}
        update_res = api_client.put(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints/{tp_id}", json=update_payload)
        
        assert update_res.status_code == 200
        data = update_res.json()
        assert "guidance" in data
        print(f"✓ PUT /touchpoints returns guidance array (length={len(data.get('guidance', []))})")


class TestTouchpointOptions:
    """Tests for GET /api/touchpoints/options"""
    
    def test_options_includes_offline_types(self, api_client):
        """Verify GET /touchpoints/options includes offline_types"""
        response = api_client.get(f"{BASE_URL}/api/touchpoints/options")
        assert response.status_code == 200
        
        data = response.json()
        assert "funnel_phases" in data
        assert "environments" in data
        assert "sentiments" in data
        assert "offline_types" in data
        assert len(data["offline_types"]) == 4
        print("✓ GET /touchpoints/options includes offline_types with 4 types")


class TestCleanup:
    """Cleanup test-created touchpoints"""
    
    def test_cleanup_test_touchpoints(self, api_client):
        """Remove all TEST_ prefixed touchpoints created during tests"""
        for tp_id in created_touchpoint_ids:
            try:
                response = api_client.delete(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints/{tp_id}")
                if response.status_code == 200:
                    print(f"  Cleaned up touchpoint: {tp_id}")
            except Exception as e:
                print(f"  Failed to cleanup {tp_id}: {e}")
        
        print(f"✓ Cleaned up {len(created_touchpoint_ids)} test touchpoints")
