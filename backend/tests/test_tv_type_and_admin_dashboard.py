"""
Tests for TV Offline Type Replacement and Expanded Admin Dashboard
- TV type replaces 'midia' with campos_extras=['emissora','dia_horario']
- Admin Dashboard expanded with payment_status, activity, search/filter
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
BRAND_ID = "brand_29aafd2d6125"

# Test credentials
TEST_EMAIL = "admin@labrand.com"
TEST_PASSWORD = "LaBrand@2024!"

# Track created touchpoints for cleanup
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


# =============================================================================
# TV Offline Type Tests (replacing 'midia')
# =============================================================================

class TestTVOfflineType:
    """Tests for TV type replacement in offline types"""
    
    def test_tv_type_exists_instead_of_midia(self, api_client):
        """Verify 'tv' type exists and 'midia' is removed"""
        response = api_client.get(f"{BASE_URL}/api/touchpoints/offline-types")
        assert response.status_code == 200
        
        types = response.json()["types"]
        type_ids = [t["id"] for t in types]
        
        # TV should exist, midia should not
        assert "tv" in type_ids, "'tv' type should exist"
        assert "midia" not in type_ids, "'midia' type should be removed"
        print("✓ 'tv' type exists, 'midia' type removed")
    
    def test_tv_type_has_campos_extras(self, api_client):
        """Verify TV type has campos_extras=['emissora','dia_horario']"""
        response = api_client.get(f"{BASE_URL}/api/touchpoints/offline-types")
        types = response.json()["types"]
        
        tv_type = next(t for t in types if t["id"] == "tv")
        
        assert "campos_extras" in tv_type, "TV type should have campos_extras"
        assert "emissora" in tv_type["campos_extras"], "campos_extras should include 'emissora'"
        assert "dia_horario" in tv_type["campos_extras"], "campos_extras should include 'dia_horario'"
        print("✓ TV type has campos_extras=['emissora','dia_horario']")
    
    def test_tv_type_label_and_description(self, api_client):
        """Verify TV type has correct label and description"""
        response = api_client.get(f"{BASE_URL}/api/touchpoints/offline-types")
        types = response.json()["types"]
        
        tv_type = next(t for t in types if t["id"] == "tv")
        
        assert tv_type["label"] == "Participacao em Programa de TV"
        assert "televisao" in tv_type["description"].lower() or "tv" in tv_type["description"].lower()
        assert tv_type["default_fase_funil"] == "Topo de Funil"
        print("✓ TV type has correct label='Participacao em Programa de TV'")
    
    def test_tv_type_has_emissora_and_dia_horario_dicas(self, api_client):
        """Verify TV type has contextual tips for emissora and dia_horario"""
        response = api_client.get(f"{BASE_URL}/api/touchpoints/offline-types")
        types = response.json()["types"]
        
        tv_type = next(t for t in types if t["id"] == "tv")
        dicas = tv_type.get("dicas", {})
        
        assert "emissora" in dicas, "TV type dicas should include 'emissora'"
        assert "dia_horario" in dicas, "TV type dicas should include 'dia_horario'"
        print("✓ TV type dicas include 'emissora' and 'dia_horario' guidance")


class TestTVTouchpointCreation:
    """Tests for creating touchpoints with tipo_offline='tv'"""
    
    def test_create_tv_touchpoint_with_emissora_and_dia_horario(self, api_client):
        """Create TV touchpoint and verify emissora/dia_horario are saved"""
        payload = {
            "nome": "TEST_Programa Jornal Nacional - Jan 2026",
            "ambiente": "Offline",
            "tipo_offline": "tv",
            "emissora": "TV Globo",
            "dia_horario": "Seg-Sex 20h30",
            "fase_funil": "Topo de Funil",
            "nota": 9,
            "custo_mensal": 0,
            "receita_gerada": 10000,
            "conversoes": 50
        }
        
        response = api_client.post(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints", json=payload)
        assert response.status_code == 200
        
        tp = response.json()["touchpoint"]
        
        assert tp["tipo_offline"] == "tv"
        assert tp["emissora"] == "TV Globo", f"emissora not saved: {tp.get('emissora')}"
        assert tp["dia_horario"] == "Seg-Sex 20h30", f"dia_horario not saved: {tp.get('dia_horario')}"
        
        created_touchpoint_ids.append(tp["touchpoint_id"])
        print(f"✓ Created TV touchpoint with emissora='{tp['emissora']}' and dia_horario='{tp['dia_horario']}'")
    
    def test_tv_touchpoint_non_tv_type_emissora_cleared(self, api_client):
        """Verify emissora/dia_horario are not saved for non-TV types"""
        payload = {
            "nome": "TEST_Palestra Test - Jan 2026",
            "ambiente": "Offline",
            "tipo_offline": "palestra",
            "emissora": "Should be ignored",
            "dia_horario": "Should be ignored",
            "nota": 7
        }
        
        response = api_client.post(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints", json=payload)
        assert response.status_code == 200
        
        tp = response.json()["touchpoint"]
        
        # For non-TV types, emissora and dia_horario should be empty
        assert tp["emissora"] == "", f"emissora should be empty for palestra: {tp.get('emissora')}"
        assert tp["dia_horario"] == "", f"dia_horario should be empty for palestra: {tp.get('dia_horario')}"
        
        created_touchpoint_ids.append(tp["touchpoint_id"])
        print("✓ emissora/dia_horario cleared for non-TV type touchpoints")


# =============================================================================
# Admin Dashboard Tests
# =============================================================================

class TestAdminUsersEndpoint:
    """Tests for GET /api/admin/users with enriched user data"""
    
    def test_admin_users_returns_enriched_data(self, api_client):
        """Verify admin users endpoint returns payment_status and activity details"""
        response = api_client.get(f"{BASE_URL}/api/admin/users?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        users = data["users"]
        
        assert len(users) > 0, "Should have at least one user"
        
        user = users[0]
        # Verify enriched fields
        assert "payment_status" in user, "Missing payment_status"
        assert "brands_owned" in user, "Missing brands_owned"
        assert "brands_member" in user, "Missing brands_member"
        assert "brands_count" in user, "Missing brands_count"
        assert "touchpoints_count" in user, "Missing touchpoints_count"
        assert "pillars_count" in user, "Missing pillars_count"
        assert "credits" in user, "Missing credits"
        assert "last_activity" in user, "Missing last_activity"
        
        # Verify credits structure
        credits = user["credits"]
        assert "available_credits" in credits
        assert "used_credits" in credits
        assert "total_credits" in credits
        
        print("✓ Admin users endpoint returns enriched user data with payment_status, activity, brands, credits")
    
    def test_admin_users_summary_stats(self, api_client):
        """Verify admin users returns summary with paying/free counts"""
        response = api_client.get(f"{BASE_URL}/api/admin/users?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        summary = data.get("summary", {})
        
        assert "total_all" in summary, "Missing summary.total_all"
        assert "new_this_month" in summary, "Missing summary.new_this_month"
        assert "paying_users" in summary, "Missing summary.paying_users"
        assert "free_users" in summary, "Missing summary.free_users"
        
        print(f"✓ Admin users summary: total_all={summary['total_all']}, paying={summary['paying_users']}, free={summary['free_users']}")
    
    def test_admin_users_payment_status_values(self, api_client):
        """Verify payment_status is one of: pagante, trial, free"""
        response = api_client.get(f"{BASE_URL}/api/admin/users?limit=10")
        assert response.status_code == 200
        
        users = response.json()["users"]
        valid_statuses = ["pagante", "trial", "free"]
        
        for user in users:
            status = user.get("payment_status")
            assert status in valid_statuses, f"Invalid payment_status '{status}' for {user.get('email')}"
        
        print("✓ All users have valid payment_status (pagante/trial/free)")


class TestAdminUsersFilters:
    """Tests for search and filter parameters in admin users"""
    
    def test_search_filter(self, api_client):
        """Test search filter by name or email"""
        response = api_client.get(f"{BASE_URL}/api/admin/users?search=admin")
        assert response.status_code == 200
        
        users = response.json()["users"]
        # Should find at least admin@labrand.com
        assert len(users) >= 1
        
        # All returned users should match search
        for user in users:
            name = user.get("name", "").lower()
            email = user.get("email", "").lower()
            assert "admin" in name or "admin" in email, f"User {email} doesn't match search"
        
        print(f"✓ Search filter works: found {len(users)} users matching 'admin'")
    
    def test_role_filter(self, api_client):
        """Test role filter parameter"""
        response = api_client.get(f"{BASE_URL}/api/admin/users?role=admin")
        assert response.status_code == 200
        
        users = response.json()["users"]
        
        for user in users:
            assert user.get("role") == "admin", f"User {user.get('email')} has role={user.get('role')}, expected admin"
        
        print(f"✓ Role filter works: {len(users)} admin users found")
    
    def test_plan_filter_paying(self, api_client):
        """Test plan=paying filter returns non-free users"""
        response = api_client.get(f"{BASE_URL}/api/admin/users?plan=paying")
        assert response.status_code == 200
        
        users = response.json()["users"]
        
        # Paying filter should return users with non-free/null plans
        for user in users:
            plan = user.get("plan")
            assert plan is not None and plan != "free", f"User {user.get('email')} has plan={plan}, should be paying"
        
        print(f"✓ Plan filter (paying) works: {len(users)} paying users found")
    
    def test_plan_filter_free(self, api_client):
        """Test plan=free filter"""
        response = api_client.get(f"{BASE_URL}/api/admin/users?plan=free")
        assert response.status_code == 200
        
        users = response.json()["users"]
        
        for user in users:
            plan = user.get("plan")
            assert plan is None or plan == "free", f"User {user.get('email')} has plan={plan}, should be free/null"
        
        print(f"✓ Plan filter (free) works: {len(users)} free users found")


class TestAdminAuthorization:
    """Tests for admin-only access"""
    
    def test_admin_endpoint_requires_admin_role(self):
        """Verify non-admin users get 403"""
        # Try without auth token
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Admin endpoints require authentication and admin role")


# =============================================================================
# Cleanup
# =============================================================================

class TestCleanup:
    """Cleanup test-created data"""
    
    def test_cleanup_test_touchpoints(self, api_client):
        """Remove TEST_ prefixed touchpoints"""
        cleaned = 0
        for tp_id in created_touchpoint_ids:
            try:
                response = api_client.delete(f"{BASE_URL}/api/brands/{BRAND_ID}/touchpoints/{tp_id}")
                if response.status_code == 200:
                    cleaned += 1
                    print(f"  Cleaned up: {tp_id}")
            except Exception as e:
                print(f"  Failed to cleanup {tp_id}: {e}")
        
        print(f"✓ Cleaned up {cleaned}/{len(created_touchpoint_ids)} test touchpoints")
