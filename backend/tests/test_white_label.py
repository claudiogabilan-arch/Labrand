"""
White-Label API Tests - LaBrand Phase 1
Tests for GET, PUT, DELETE /api/brands/{brand_id}/white-label endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"
BRAND_ID = "brand_0902ead1b80c"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestWhiteLabelAPI:
    """White-Label API endpoint tests"""

    def test_get_white_label_default(self, auth_headers):
        """GET /api/brands/{brand_id}/white-label returns default (empty) config"""
        # First reset to ensure clean state
        requests.delete(f"{BASE_URL}/api/brands/{BRAND_ID}/white-label", headers=auth_headers)
        
        response = requests.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/white-label",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert data["brand_id"] == BRAND_ID
        assert "primary_color" in data
        assert "accent_color" in data
        assert "sidebar_color" in data
        assert "sidebar_text_color" in data
        assert "button_radius" in data
        assert "enabled" in data
        
        # Verify default values
        assert data["enabled"] == False
        assert data["button_radius"] == "0.5rem"
        print(f"✓ GET white-label returns default config with enabled=False")

    def test_get_white_label_requires_auth(self):
        """GET /api/brands/{brand_id}/white-label requires authentication"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/white-label")
        assert response.status_code == 401
        print(f"✓ GET white-label requires authentication (401)")

    def test_put_white_label_saves_colors(self, auth_headers):
        """PUT /api/brands/{brand_id}/white-label saves colors and returns enabled=true"""
        payload = {
            "primary_color": "#1E40AF",
            "accent_color": "#3B82F6",
            "sidebar_color": "#0F172A",
            "sidebar_text_color": "#E2E8F0"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/brands/{BRAND_ID}/white-label",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify saved values
        assert data["primary_color"] == "#1E40AF"
        assert data["accent_color"] == "#3B82F6"
        assert data["sidebar_color"] == "#0F172A"
        assert data["sidebar_text_color"] == "#E2E8F0"
        assert data["enabled"] == True
        print(f"✓ PUT white-label saves colors and sets enabled=True")

    def test_put_white_label_persists(self, auth_headers):
        """Verify PUT changes persist via GET"""
        # First save some colors
        payload = {
            "primary_color": "#065F46",
            "accent_color": "#10B981",
            "sidebar_color": "#064E3B",
            "sidebar_text_color": "#D1FAE5",
            "button_radius": "0.75rem"
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/brands/{BRAND_ID}/white-label",
            headers=auth_headers,
            json=payload
        )
        assert put_response.status_code == 200
        
        # Verify via GET
        get_response = requests.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/white-label",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        data = get_response.json()
        
        assert data["primary_color"] == "#065F46"
        assert data["accent_color"] == "#10B981"
        assert data["sidebar_color"] == "#064E3B"
        assert data["sidebar_text_color"] == "#D1FAE5"
        assert data["button_radius"] == "0.75rem"
        assert data["enabled"] == True
        print(f"✓ PUT white-label changes persist in database")

    def test_put_white_label_requires_auth(self):
        """PUT /api/brands/{brand_id}/white-label requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/brands/{BRAND_ID}/white-label",
            json={"primary_color": "#FF0000"}
        )
        assert response.status_code == 401
        print(f"✓ PUT white-label requires authentication (401)")

    def test_put_white_label_empty_payload(self, auth_headers):
        """PUT with empty payload returns 400"""
        response = requests.put(
            f"{BASE_URL}/api/brands/{BRAND_ID}/white-label",
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 400
        print(f"✓ PUT white-label with empty payload returns 400")

    def test_delete_white_label_resets(self, auth_headers):
        """DELETE /api/brands/{brand_id}/white-label resets to defaults"""
        # First save some colors
        requests.put(
            f"{BASE_URL}/api/brands/{BRAND_ID}/white-label",
            headers=auth_headers,
            json={"primary_color": "#FF0000", "accent_color": "#00FF00"}
        )
        
        # Delete/reset
        delete_response = requests.delete(
            f"{BASE_URL}/api/brands/{BRAND_ID}/white-label",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert "message" in data
        assert data["brand_id"] == BRAND_ID
        
        # Verify reset via GET
        get_response = requests.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/white-label",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        
        assert get_data["enabled"] == False
        assert get_data["primary_color"] is None
        assert get_data["accent_color"] is None
        print(f"✓ DELETE white-label resets to defaults")

    def test_delete_white_label_requires_auth(self):
        """DELETE /api/brands/{brand_id}/white-label requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/brands/{BRAND_ID}/white-label")
        assert response.status_code == 401
        print(f"✓ DELETE white-label requires authentication (401)")

    def test_get_white_label_invalid_brand(self, auth_headers):
        """GET with invalid brand_id returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/brands/invalid_brand_id/white-label",
            headers=auth_headers
        )
        assert response.status_code == 404
        print(f"✓ GET white-label with invalid brand returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
