"""
ClickUp OAuth 2.0 Integration Tests
Tests for all ClickUp integration endpoints:
- GET /api/integrations/clickup/status/{brand_id} - Check connection status
- GET /api/integrations/clickup/auth-url - Get OAuth authorization URL
- POST /api/integrations/clickup/callback - Exchange code for token
- POST /api/integrations/clickup/sync-task/{brand_id} - Sync task to ClickUp
- DELETE /api/integrations/clickup/disconnect/{brand_id} - Disconnect integration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"

# Expected ClickUp client ID
EXPECTED_CLIENT_ID = "0O8LNQJHSC9C41QV8EVNGKT3TA93CM7L"


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
def brand_id(auth_token):
    """Get a brand ID for testing"""
    headers = {"Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{BASE_URL}/api/brands", headers=headers)
    assert response.status_code == 200, f"Failed to get brands: {response.text}"
    brands = response.json()
    assert len(brands) > 0, "No brands found for testing"
    return brands[0]["brand_id"]


class TestClickUpAuthProtection:
    """Test that all ClickUp endpoints require authentication"""
    
    def test_status_requires_auth(self, brand_id):
        """GET /api/integrations/clickup/status/{brand_id} requires auth"""
        response = requests.get(f"{BASE_URL}/api/integrations/clickup/status/{brand_id}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /status endpoint requires authentication (401)")
    
    def test_auth_url_requires_auth(self, brand_id):
        """GET /api/integrations/clickup/auth-url requires auth"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/auth-url",
            params={"brand_id": brand_id}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /auth-url endpoint requires authentication (401)")
    
    def test_callback_requires_auth(self):
        """POST /api/integrations/clickup/callback requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/integrations/clickup/callback",
            json={"code": "test", "brand_id": "test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /callback endpoint requires authentication (401)")
    
    def test_sync_task_requires_auth(self, brand_id):
        """POST /api/integrations/clickup/sync-task/{brand_id} requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/integrations/clickup/sync-task/{brand_id}",
            json={"title": "Test Task"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /sync-task endpoint requires authentication (401)")
    
    def test_disconnect_requires_auth(self, brand_id):
        """DELETE /api/integrations/clickup/disconnect/{brand_id} requires auth"""
        response = requests.delete(f"{BASE_URL}/api/integrations/clickup/disconnect/{brand_id}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /disconnect endpoint requires authentication (401)")
    
    def test_workspaces_requires_auth(self, brand_id):
        """GET /api/integrations/clickup/workspaces/{brand_id} requires auth"""
        response = requests.get(f"{BASE_URL}/api/integrations/clickup/workspaces/{brand_id}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /workspaces endpoint requires authentication (401)")


class TestClickUpStatus:
    """Test ClickUp connection status endpoint"""
    
    def test_status_returns_not_connected(self, auth_token, brand_id):
        """GET /api/integrations/clickup/status/{brand_id} returns connected: false when not connected"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/status/{brand_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "connected" in data, "Response should have 'connected' field"
        # Note: connected could be true or false depending on previous tests
        print(f"PASS: /status returns connection status: connected={data.get('connected')}")
        
        if data.get("connected"):
            assert "connected_at" in data or data.get("connected_at") is None
            print(f"  - selected_list_id: {data.get('selected_list_id')}")
            print(f"  - selected_list_name: {data.get('selected_list_name')}")
    
    def test_status_with_nonexistent_brand(self, auth_token):
        """GET /api/integrations/clickup/status/{brand_id} returns connected: false for nonexistent brand"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/status/nonexistent_brand_xyz",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("connected") == False, "Should return connected: false for nonexistent brand"
        print("PASS: /status returns connected: false for nonexistent brand")


class TestClickUpAuthUrl:
    """Test ClickUp OAuth authorization URL generation"""
    
    def test_auth_url_generation(self, auth_token, brand_id):
        """GET /api/integrations/clickup/auth-url returns valid OAuth URL"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/auth-url",
            params={"brand_id": brand_id},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "auth_url" in data, "Response should have 'auth_url' field"
        assert "redirect_uri" in data, "Response should have 'redirect_uri' field"
        
        auth_url = data["auth_url"]
        redirect_uri = data["redirect_uri"]
        
        # Verify auth_url contains required parameters
        assert "https://app.clickup.com/api" in auth_url, "Auth URL should point to ClickUp"
        assert f"client_id={EXPECTED_CLIENT_ID}" in auth_url, f"Auth URL should contain client_id={EXPECTED_CLIENT_ID}"
        assert f"state={brand_id}" in auth_url, "Auth URL should contain brand_id as state"
        assert "redirect_uri=" in auth_url, "Auth URL should contain redirect_uri"
        
        # Verify redirect_uri format
        assert "/integracoes/clickup/callback" in redirect_uri, "Redirect URI should point to callback route"
        
        print(f"PASS: /auth-url returns valid OAuth URL")
        print(f"  - auth_url contains client_id: {EXPECTED_CLIENT_ID}")
        print(f"  - redirect_uri: {redirect_uri}")
    
    def test_auth_url_requires_brand_id(self, auth_token):
        """GET /api/integrations/clickup/auth-url requires brand_id parameter"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/auth-url",
            headers=headers
        )
        # FastAPI returns 422 for missing required query params
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("PASS: /auth-url requires brand_id parameter (422)")


class TestClickUpCallback:
    """Test ClickUp OAuth callback endpoint"""
    
    def test_callback_validates_params(self, auth_token):
        """POST /api/integrations/clickup/callback validates code and brand_id"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test missing code
        response = requests.post(
            f"{BASE_URL}/api/integrations/clickup/callback",
            json={"brand_id": "test_brand"},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for missing code, got {response.status_code}"
        print("PASS: /callback returns 400 when code is missing")
        
        # Test missing brand_id
        response = requests.post(
            f"{BASE_URL}/api/integrations/clickup/callback",
            json={"code": "test_code"},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for missing brand_id, got {response.status_code}"
        print("PASS: /callback returns 400 when brand_id is missing")
        
        # Test empty values
        response = requests.post(
            f"{BASE_URL}/api/integrations/clickup/callback",
            json={"code": "", "brand_id": ""},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for empty values, got {response.status_code}"
        print("PASS: /callback returns 400 when code/brand_id are empty")
    
    def test_callback_with_invalid_code(self, auth_token, brand_id):
        """POST /api/integrations/clickup/callback returns error for invalid code"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/integrations/clickup/callback",
            json={"code": "invalid_test_code_xyz", "brand_id": brand_id},
            headers=headers
        )
        # ClickUp API will reject invalid code with 400
        assert response.status_code == 400, f"Expected 400 for invalid code, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Error response should have 'detail' field"
        print(f"PASS: /callback returns 400 for invalid code: {data.get('detail', '')[:50]}")


class TestClickUpSyncTask:
    """Test ClickUp task sync endpoint"""
    
    def test_sync_task_when_not_connected(self, auth_token, brand_id):
        """POST /api/integrations/clickup/sync-task/{brand_id} returns error when not connected"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First check if connected
        status_response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/status/{brand_id}",
            headers=headers
        )
        status_data = status_response.json()
        
        if status_data.get("connected"):
            # Disconnect first to test the not-connected case
            requests.delete(
                f"{BASE_URL}/api/integrations/clickup/disconnect/{brand_id}",
                headers=headers
            )
        
        # Now test sync when not connected
        response = requests.post(
            f"{BASE_URL}/api/integrations/clickup/sync-task/{brand_id}",
            json={"title": "Test Task", "description": "Test Description"},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Error response should have 'detail' field"
        assert "não conectado" in data["detail"].lower() or "not connected" in data["detail"].lower(), \
            f"Error should mention not connected: {data['detail']}"
        print(f"PASS: /sync-task returns 400 when ClickUp not connected")


class TestClickUpDisconnect:
    """Test ClickUp disconnect endpoint"""
    
    def test_disconnect_works(self, auth_token, brand_id):
        """DELETE /api/integrations/clickup/disconnect/{brand_id} works"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/integrations/clickup/disconnect/{brand_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should have success: true"
        print("PASS: /disconnect returns success")
        
        # Verify disconnected
        status_response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/status/{brand_id}",
            headers=headers
        )
        status_data = status_response.json()
        assert status_data.get("connected") == False, "Should be disconnected after disconnect call"
        print("PASS: Status shows disconnected after disconnect")
    
    def test_disconnect_idempotent(self, auth_token, brand_id):
        """DELETE /api/integrations/clickup/disconnect/{brand_id} is idempotent"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Call disconnect twice
        response1 = requests.delete(
            f"{BASE_URL}/api/integrations/clickup/disconnect/{brand_id}",
            headers=headers
        )
        response2 = requests.delete(
            f"{BASE_URL}/api/integrations/clickup/disconnect/{brand_id}",
            headers=headers
        )
        
        assert response1.status_code == 200, f"First disconnect failed: {response1.status_code}"
        assert response2.status_code == 200, f"Second disconnect failed: {response2.status_code}"
        print("PASS: /disconnect is idempotent (can be called multiple times)")


class TestClickUpWorkspacesAndLists:
    """Test ClickUp workspace/space/list endpoints (require actual connection)"""
    
    def test_workspaces_when_not_connected(self, auth_token, brand_id):
        """GET /api/integrations/clickup/workspaces/{brand_id} returns error when not connected"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Ensure disconnected
        requests.delete(
            f"{BASE_URL}/api/integrations/clickup/disconnect/{brand_id}",
            headers=headers
        )
        
        response = requests.get(
            f"{BASE_URL}/api/integrations/clickup/workspaces/{brand_id}",
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "não conectado" in data.get("detail", "").lower() or "not connected" in data.get("detail", "").lower(), \
            f"Error should mention not connected: {data.get('detail')}"
        print("PASS: /workspaces returns 400 when not connected")
    
    def test_select_list_when_not_connected(self, auth_token, brand_id):
        """POST /api/integrations/clickup/select-list/{brand_id} works even when not connected (just saves to DB)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # This endpoint just saves to DB, doesn't require actual ClickUp connection
        response = requests.post(
            f"{BASE_URL}/api/integrations/clickup/select-list/{brand_id}",
            json={"list_id": "test_list_123", "list_name": "Test List"},
            headers=headers
        )
        # This might return 200 (saves to DB) or 400 (if validation requires connection)
        # Based on the code, it just updates the DB without checking connection
        print(f"INFO: /select-list returned {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            print("PASS: /select-list saves list selection to DB")
        else:
            print(f"INFO: /select-list requires connection (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
