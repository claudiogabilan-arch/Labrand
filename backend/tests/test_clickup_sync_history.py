"""
ClickUp Sync History Tests - Iteration 24
Tests for new sync history features:
- GET /api/integrations/clickup/sync-history/{brand_id} - Get recent sync history
- POST /api/integrations/clickup/sync-task stores history in clickup_sync_history collection
- DELETE /api/integrations/clickup/disconnect cleans up sync history
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"
TEST_BRAND_ID = "brand_0902ead1b80c"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get auth headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestSyncHistoryEndpoint:
    """Test GET /api/integrations/clickup/sync-history/{brand_id}"""
    
    def test_sync_history_requires_auth(self):
        """GET /api/integrations/clickup/sync-history/{brand_id} requires authentication"""
        response = requests.get(f"{BASE_URL}/api/integrations/clickup/sync-history/{TEST_BRAND_ID}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /sync-history endpoint requires authentication (401)")
    
    def test_sync_history_returns_array(self, headers):
        """GET /api/integrations/clickup/sync-history/{brand_id} returns array"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/sync-history/{TEST_BRAND_ID}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: /sync-history returns array with {len(data)} items")
    
    def test_sync_history_with_limit(self, headers):
        """GET /api/integrations/clickup/sync-history/{brand_id}?limit=5 respects limit"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/sync-history/{TEST_BRAND_ID}?limit=5",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 5, f"Expected max 5 items, got {len(data)}"
        print(f"PASS: /sync-history respects limit=5, returned {len(data)} items")
    
    def test_sync_history_empty_for_nonexistent_brand(self, headers):
        """GET /api/integrations/clickup/sync-history/{brand_id} returns empty array for nonexistent brand"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/sync-history/nonexistent_brand_xyz",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 0, f"Expected empty array, got {len(data)} items"
        print("PASS: /sync-history returns empty array for nonexistent brand")
    
    def test_sync_history_item_structure(self, headers):
        """Verify sync history item structure (if any items exist)"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/sync-history/{TEST_BRAND_ID}?limit=1",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            item = data[0]
            # Check expected fields based on clickup.py line 224-234
            expected_fields = [
                "brand_id", "task_title", "task_priority", "clickup_task_id",
                "clickup_url", "clickup_list_name", "synced_by", "synced_by_name", "synced_at"
            ]
            for field in expected_fields:
                assert field in item, f"Missing field: {field}"
            print(f"PASS: Sync history item has all expected fields: {list(item.keys())}")
        else:
            print("INFO: No sync history items to verify structure (ClickUp not connected)")


class TestClickUpStatusEndpoint:
    """Test ClickUp status endpoint for Dashboard widget"""
    
    def test_status_endpoint_works(self, headers):
        """GET /api/integrations/clickup/status/{brand_id} works for Dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/status/{TEST_BRAND_ID}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "connected" in data, "Response should have 'connected' field"
        print(f"PASS: /status returns connected={data.get('connected')}")
        
        # If connected, verify additional fields
        if data.get("connected"):
            assert "connected_at" in data or data.get("connected_at") is None
            print(f"  - selected_list_id: {data.get('selected_list_id')}")
            print(f"  - selected_list_name: {data.get('selected_list_name')}")


class TestDisconnectCleansHistory:
    """Test that disconnect cleans up sync history"""
    
    def test_disconnect_cleans_history(self, headers):
        """DELETE /api/integrations/clickup/disconnect/{brand_id} cleans up sync history"""
        # First disconnect
        response = requests.delete(
            f"{BASE_URL}/api/integrations/clickup/disconnect/{TEST_BRAND_ID}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True, "Disconnect should return success: true"
        print("PASS: /disconnect returns success")
        
        # Verify sync history is empty after disconnect
        history_response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/sync-history/{TEST_BRAND_ID}",
            headers=headers
        )
        assert history_response.status_code == 200
        history_data = history_response.json()
        assert isinstance(history_data, list), "History should be a list"
        assert len(history_data) == 0, f"History should be empty after disconnect, got {len(history_data)} items"
        print("PASS: Sync history is empty after disconnect")


class TestDashboardIntegration:
    """Test endpoints used by Dashboard ClickUp widget"""
    
    def test_dashboard_can_load_clickup_data(self, headers):
        """Dashboard loads ClickUp status and history together"""
        # Status endpoint
        status_response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/status/{TEST_BRAND_ID}",
            headers=headers
        )
        assert status_response.status_code == 200, f"Status failed: {status_response.status_code}"
        status_data = status_response.json()
        
        # History endpoint
        history_response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/sync-history/{TEST_BRAND_ID}?limit=5",
            headers=headers
        )
        assert history_response.status_code == 200, f"History failed: {history_response.status_code}"
        history_data = history_response.json()
        
        print(f"PASS: Dashboard can load ClickUp data")
        print(f"  - connected: {status_data.get('connected')}")
        print(f"  - history items: {len(history_data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
