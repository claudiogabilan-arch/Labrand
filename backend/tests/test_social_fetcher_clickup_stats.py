"""
Test Suite for Iteration 25:
- ClickUp sync-stats endpoint + period filter on sync-history
- Social Media Fetcher endpoints (5 platforms)
- TikTok in Social Listening platforms
- Social profiles endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
BRAND_ID = "brand_0902ead1b80c"

# Test credentials
TEST_EMAIL = "admin@labrand.com.br"
TEST_PASSWORD = "Labrand@2026!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text[:200]}")


@pytest.fixture
def headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ============================================================
# CLICKUP SYNC-STATS ENDPOINT TESTS
# ============================================================
class TestClickupSyncStats:
    """Tests for GET /api/integrations/clickup/sync-stats/{brand_id}"""

    def test_sync_stats_requires_auth(self):
        """sync-stats endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/integrations/clickup/sync-stats/{BRAND_ID}")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: sync-stats requires auth (401)")

    def test_sync_stats_returns_counts(self, headers):
        """sync-stats returns total, this_week, this_month counts"""
        response = requests.get(f"{BASE_URL}/api/integrations/clickup/sync-stats/{BRAND_ID}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total" in data, "Missing 'total' field"
        assert "this_week" in data, "Missing 'this_week' field"
        assert "this_month" in data, "Missing 'this_month' field"
        assert isinstance(data["total"], int), "total should be int"
        assert isinstance(data["this_week"], int), "this_week should be int"
        assert isinstance(data["this_month"], int), "this_month should be int"
        print(f"PASS: sync-stats returns counts - total={data['total']}, week={data['this_week']}, month={data['this_month']}")


class TestClickupSyncHistoryPeriodFilter:
    """Tests for GET /api/integrations/clickup/sync-history/{brand_id}?days=N"""

    def test_sync_history_with_days_param(self, headers):
        """sync-history accepts days parameter for filtering"""
        response = requests.get(f"{BASE_URL}/api/integrations/clickup/sync-history/{BRAND_ID}?days=7", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: sync-history with days=7 returns {len(data)} items")

    def test_sync_history_days_30(self, headers):
        """sync-history with days=30 (month filter)"""
        response = requests.get(f"{BASE_URL}/api/integrations/clickup/sync-history/{BRAND_ID}?days=30", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: sync-history with days=30 returns {len(data)} items")

    def test_sync_history_days_0_returns_all(self, headers):
        """sync-history with days=0 returns all (no filter)"""
        response = requests.get(f"{BASE_URL}/api/integrations/clickup/sync-history/{BRAND_ID}?days=0", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: sync-history with days=0 returns {len(data)} items (all)")


# ============================================================
# SOCIAL LISTENING PLATFORMS (TikTok added)
# ============================================================
class TestSocialListeningPlatforms:
    """Tests for GET /api/brands/{brand_id}/social-listening/platforms"""

    def test_platforms_requires_auth(self):
        """platforms endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/social-listening/platforms")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: platforms requires auth (401)")

    def test_platforms_returns_5_platforms(self, headers):
        """platforms returns 5 platforms including tiktok"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/social-listening/platforms", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "platforms" in data, "Missing 'platforms' field"
        platforms = data["platforms"]
        assert len(platforms) == 5, f"Expected 5 platforms, got {len(platforms)}"
        platform_ids = [p["id"] for p in platforms]
        assert "instagram" in platform_ids, "Missing instagram"
        assert "facebook" in platform_ids, "Missing facebook"
        assert "youtube" in platform_ids, "Missing youtube"
        assert "linkedin" in platform_ids, "Missing linkedin"
        assert "tiktok" in platform_ids, "Missing tiktok"
        print(f"PASS: platforms returns 5 platforms: {platform_ids}")

    def test_tiktok_has_setup_guide(self, headers):
        """TikTok platform has proper setup guide"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/social-listening/platforms", headers=headers)
        assert response.status_code == 200
        data = response.json()
        tiktok = next((p for p in data["platforms"] if p["id"] == "tiktok"), None)
        assert tiktok is not None, "TikTok platform not found"
        assert tiktok["name"] == "TikTok", f"Expected name 'TikTok', got {tiktok['name']}"
        assert "fields" in tiktok, "Missing fields"
        assert "steps" in tiktok, "Missing steps"
        assert "doc_url" in tiktok, "Missing doc_url"
        print(f"PASS: TikTok has setup guide with {len(tiktok['fields'])} fields and {len(tiktok['steps'])} steps")


# ============================================================
# SOCIAL FETCHER ENDPOINTS (5 platforms)
# ============================================================
class TestSocialFetcherInstagram:
    """Tests for POST /api/brands/{brand_id}/social-fetcher/instagram"""

    def test_instagram_fetcher_requires_auth(self):
        """instagram fetcher requires authentication"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/social-fetcher/instagram")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: instagram fetcher requires auth (401)")

    def test_instagram_fetcher_not_connected(self, headers):
        """instagram fetcher returns error when not connected"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/social-fetcher/instagram", headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Missing error detail"
        assert "instagram" in data["detail"].lower() or "conectado" in data["detail"].lower(), f"Unexpected error: {data['detail']}"
        print(f"PASS: instagram fetcher returns 400 when not connected: {data['detail']}")


class TestSocialFetcherFacebook:
    """Tests for POST /api/brands/{brand_id}/social-fetcher/facebook"""

    def test_facebook_fetcher_requires_auth(self):
        """facebook fetcher requires authentication"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/social-fetcher/facebook")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: facebook fetcher requires auth (401)")

    def test_facebook_fetcher_not_connected(self, headers):
        """facebook fetcher returns error when not connected"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/social-fetcher/facebook", headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Missing error detail"
        print(f"PASS: facebook fetcher returns 400 when not connected: {data['detail']}")


class TestSocialFetcherYoutube:
    """Tests for POST /api/brands/{brand_id}/social-fetcher/youtube"""

    def test_youtube_fetcher_requires_auth(self):
        """youtube fetcher requires authentication"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/social-fetcher/youtube")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: youtube fetcher requires auth (401)")

    def test_youtube_fetcher_not_connected(self, headers):
        """youtube fetcher returns error when not connected"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/social-fetcher/youtube", headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Missing error detail"
        print(f"PASS: youtube fetcher returns 400 when not connected: {data['detail']}")


class TestSocialFetcherLinkedin:
    """Tests for POST /api/brands/{brand_id}/social-fetcher/linkedin"""

    def test_linkedin_fetcher_requires_auth(self):
        """linkedin fetcher requires authentication"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/social-fetcher/linkedin")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: linkedin fetcher requires auth (401)")

    def test_linkedin_fetcher_not_connected(self, headers):
        """linkedin fetcher returns error when not connected"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/social-fetcher/linkedin", headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Missing error detail"
        print(f"PASS: linkedin fetcher returns 400 when not connected: {data['detail']}")


class TestSocialFetcherTiktok:
    """Tests for POST /api/brands/{brand_id}/social-fetcher/tiktok"""

    def test_tiktok_fetcher_requires_auth(self):
        """tiktok fetcher requires authentication"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/social-fetcher/tiktok")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: tiktok fetcher requires auth (401)")

    def test_tiktok_fetcher_not_connected(self, headers):
        """tiktok fetcher returns error when not connected"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/social-fetcher/tiktok", headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Missing error detail"
        print(f"PASS: tiktok fetcher returns 400 when not connected: {data['detail']}")


class TestSocialFetcherAll:
    """Tests for POST /api/brands/{brand_id}/social-fetcher/all"""

    def test_fetch_all_requires_auth(self):
        """fetch all requires authentication"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/social-fetcher/all")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: fetch all requires auth (401)")

    def test_fetch_all_no_platforms_connected(self, headers):
        """fetch all returns error when no platforms connected"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/social-fetcher/all", headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Missing error detail"
        assert "nenhuma" in data["detail"].lower() or "conectada" in data["detail"].lower(), f"Unexpected error: {data['detail']}"
        print(f"PASS: fetch all returns 400 when no platforms connected: {data['detail']}")


# ============================================================
# SOCIAL PROFILES ENDPOINT
# ============================================================
class TestSocialProfiles:
    """Tests for GET /api/brands/{brand_id}/social-profiles"""

    def test_social_profiles_requires_auth(self):
        """social-profiles requires authentication"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/social-profiles")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: social-profiles requires auth (401)")

    def test_social_profiles_returns_empty_array(self, headers):
        """social-profiles returns empty profiles array when none connected"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/social-profiles", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "profiles" in data, "Missing 'profiles' field"
        assert isinstance(data["profiles"], list), "profiles should be a list"
        print(f"PASS: social-profiles returns {len(data['profiles'])} profiles")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
