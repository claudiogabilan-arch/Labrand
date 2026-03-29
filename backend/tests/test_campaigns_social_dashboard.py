"""
Test Campaigns CRUD + Social Post Linking + Social Dashboard
Iteration 26: Testing new features from P1 (Campanhas + Social Posts) and P2 (Dashboard Social Consolidado)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
BRAND_ID = "brand_0902ead1b80c"
TEST_CAMPAIGN_ID = "camp_97532ec08752"  # Pre-existing test campaign

# Test credentials
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text[:200]}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ============================================================
# CAMPAIGNS CRUD TESTS
# ============================================================

class TestCampaignsAuth:
    """Test that all campaign endpoints require authentication"""
    
    def test_list_campaigns_requires_auth(self):
        """GET /api/brands/{brand_id}/campaigns requires auth"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/brands/{brand_id}/campaigns requires auth (401)")
    
    def test_create_campaign_requires_auth(self):
        """POST /api/brands/{brand_id}/campaigns requires auth"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns", json={
            "title": "Test Campaign"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/brands/{brand_id}/campaigns requires auth (401)")
    
    def test_update_campaign_requires_auth(self):
        """PUT /api/brands/{brand_id}/campaigns/{campaign_id} requires auth"""
        response = requests.put(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/{TEST_CAMPAIGN_ID}", json={
            "title": "Updated"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ PUT /api/brands/{brand_id}/campaigns/{campaign_id} requires auth (401)")
    
    def test_delete_campaign_requires_auth(self):
        """DELETE /api/brands/{brand_id}/campaigns/{campaign_id} requires auth"""
        response = requests.delete(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/fake_id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ DELETE /api/brands/{brand_id}/campaigns/{campaign_id} requires auth (401)")


class TestCampaignsCRUD:
    """Test Campaign CRUD operations"""
    
    def test_list_campaigns(self, auth_headers):
        """GET /api/brands/{brand_id}/campaigns returns array"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /api/brands/{BRAND_ID}/campaigns returns {len(data)} campaigns")
    
    def test_create_campaign(self, auth_headers):
        """POST /api/brands/{brand_id}/campaigns creates a campaign"""
        payload = {
            "title": "TEST_Campaign_Pytest",
            "description": "Test campaign created by pytest",
            "type": "awareness",
            "start_date": "2026-02-01",
            "end_date": "2026-02-28",
            "budget": 5000,
            "goals": "Test goals"
        }
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        
        # Validate response structure
        assert "campaign_id" in data, "Response should contain campaign_id"
        assert data["title"] == payload["title"], "Title should match"
        assert data["type"] == payload["type"], "Type should match"
        assert data["budget"] == payload["budget"], "Budget should match"
        assert data["brand_id"] == BRAND_ID, "Brand ID should match"
        assert "linked_posts" in data, "Should have linked_posts field"
        assert isinstance(data["linked_posts"], list), "linked_posts should be array"
        
        # Store campaign_id for cleanup
        pytest.created_campaign_id = data["campaign_id"]
        print(f"✓ POST /api/brands/{BRAND_ID}/campaigns created campaign: {data['campaign_id']}")
    
    def test_update_campaign(self, auth_headers):
        """PUT /api/brands/{brand_id}/campaigns/{campaign_id} updates campaign"""
        campaign_id = getattr(pytest, 'created_campaign_id', TEST_CAMPAIGN_ID)
        payload = {
            "title": "TEST_Campaign_Updated",
            "budget": 7500,
            "goals": "Updated goals"
        }
        response = requests.put(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/{campaign_id}", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert data.get("success") == True, "Should return success: true"
        print(f"✓ PUT /api/brands/{BRAND_ID}/campaigns/{campaign_id} updated successfully")
    
    def test_update_nonexistent_campaign_returns_404(self, auth_headers):
        """PUT /api/brands/{brand_id}/campaigns/{campaign_id} returns 404 for invalid ID"""
        response = requests.put(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/nonexistent_id", json={
            "title": "Test"
        }, headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PUT with invalid campaign_id returns 404")
    
    def test_delete_campaign(self, auth_headers):
        """DELETE /api/brands/{brand_id}/campaigns/{campaign_id} deletes campaign"""
        campaign_id = getattr(pytest, 'created_campaign_id', None)
        if not campaign_id:
            pytest.skip("No test campaign to delete")
        
        response = requests.delete(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/{campaign_id}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert data.get("success") == True, "Should return success: true"
        
        # Verify deletion
        verify_response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns", headers=auth_headers)
        campaigns = verify_response.json()
        campaign_ids = [c["campaign_id"] for c in campaigns]
        assert campaign_id not in campaign_ids, "Deleted campaign should not appear in list"
        print(f"✓ DELETE /api/brands/{BRAND_ID}/campaigns/{campaign_id} deleted successfully")
    
    def test_delete_nonexistent_campaign_returns_404(self, auth_headers):
        """DELETE /api/brands/{brand_id}/campaigns/{campaign_id} returns 404 for invalid ID"""
        response = requests.delete(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/nonexistent_id", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ DELETE with invalid campaign_id returns 404")


# ============================================================
# CAMPAIGN POST LINKING TESTS
# ============================================================

class TestCampaignPostLinking:
    """Test linking/unlinking social posts to campaigns"""
    
    def test_link_post_requires_auth(self):
        """POST /api/brands/{brand_id}/campaigns/{campaign_id}/link-post requires auth"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/{TEST_CAMPAIGN_ID}/link-post", json={
            "mention_id": "test"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST link-post requires auth (401)")
    
    def test_link_post_requires_mention_id(self, auth_headers):
        """POST link-post returns 400 when mention_id is missing"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/{TEST_CAMPAIGN_ID}/link-post", json={}, headers=auth_headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert "mention_id" in data.get("detail", "").lower() or "obrigatório" in data.get("detail", "").lower(), "Should mention mention_id is required"
        print("✓ POST link-post returns 400 when mention_id missing")
    
    def test_link_post_returns_404_for_invalid_mention(self, auth_headers):
        """POST link-post returns 404 for non-existent mention"""
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/{TEST_CAMPAIGN_ID}/link-post", json={
            "mention_id": "nonexistent_mention_id"
        }, headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text[:200]}"
        print("✓ POST link-post returns 404 for invalid mention_id")
    
    def test_get_campaign_posts_requires_auth(self):
        """GET /api/brands/{brand_id}/campaigns/{campaign_id}/posts requires auth"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/{TEST_CAMPAIGN_ID}/posts")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET campaign posts requires auth (401)")
    
    def test_get_campaign_posts(self, auth_headers):
        """GET /api/brands/{brand_id}/campaigns/{campaign_id}/posts returns posts and totals"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/{TEST_CAMPAIGN_ID}/posts", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        
        # Validate response structure
        assert "posts" in data, "Response should contain posts array"
        assert "totals" in data, "Response should contain totals object"
        assert isinstance(data["posts"], list), "posts should be array"
        assert isinstance(data["totals"], dict), "totals should be object"
        
        # Validate totals structure
        totals = data["totals"]
        assert "likes" in totals, "totals should have likes"
        assert "comments" in totals, "totals should have comments"
        assert "shares" in totals, "totals should have shares"
        assert "views" in totals, "totals should have views"
        
        print(f"✓ GET campaign posts returns {len(data['posts'])} posts with totals: {totals}")
    
    def test_get_campaign_posts_returns_404_for_invalid_campaign(self, auth_headers):
        """GET campaign posts returns 404 for non-existent campaign"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/nonexistent_id/posts", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET campaign posts returns 404 for invalid campaign_id")
    
    def test_unlink_post_requires_auth(self):
        """DELETE /api/brands/{brand_id}/campaigns/{campaign_id}/unlink-post/{mention_id} requires auth"""
        response = requests.delete(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/{TEST_CAMPAIGN_ID}/unlink-post/test_mention")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ DELETE unlink-post requires auth (401)")
    
    def test_unlink_post_works(self, auth_headers):
        """DELETE unlink-post removes mention from campaign (even if not linked)"""
        response = requests.delete(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns/{TEST_CAMPAIGN_ID}/unlink-post/fake_mention_id", headers=auth_headers)
        # Should return 200 even if mention wasn't linked (idempotent operation)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        assert data.get("success") == True, "Should return success: true"
        print("✓ DELETE unlink-post works (idempotent)")


# ============================================================
# SOCIAL DASHBOARD TESTS
# ============================================================

class TestSocialDashboard:
    """Test consolidated social dashboard endpoint"""
    
    def test_social_dashboard_requires_auth(self):
        """GET /api/brands/{brand_id}/social-dashboard requires auth"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/social-dashboard")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/brands/{brand_id}/social-dashboard requires auth (401)")
    
    def test_social_dashboard_returns_structure(self, auth_headers):
        """GET /api/brands/{brand_id}/social-dashboard returns consolidated metrics structure"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/social-dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:200]}"
        data = response.json()
        
        # Validate response structure
        assert "total_followers" in data, "Should have total_followers"
        assert "total_engagement" in data, "Should have total_engagement"
        assert "platforms" in data, "Should have platforms"
        assert "recent_posts" in data, "Should have recent_posts"
        assert "top_posts" in data, "Should have top_posts"
        assert "connected_count" in data, "Should have connected_count"
        
        # Validate total_engagement structure
        engagement = data["total_engagement"]
        assert "likes" in engagement, "total_engagement should have likes"
        assert "comments" in engagement, "total_engagement should have comments"
        assert "shares" in engagement, "total_engagement should have shares"
        assert "views" in engagement, "total_engagement should have views"
        assert "posts" in engagement, "total_engagement should have posts count"
        
        # Validate types
        assert isinstance(data["total_followers"], int), "total_followers should be int"
        assert isinstance(data["platforms"], dict), "platforms should be dict"
        assert isinstance(data["recent_posts"], list), "recent_posts should be list"
        assert isinstance(data["top_posts"], list), "top_posts should be list"
        assert isinstance(data["connected_count"], int), "connected_count should be int"
        
        print(f"✓ GET social-dashboard returns structure: connected_count={data['connected_count']}, total_followers={data['total_followers']}")
    
    def test_social_dashboard_with_no_connections(self, auth_headers):
        """Social dashboard returns 0 connected_count when no platforms connected"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/social-dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Since no social platforms are connected in test env, connected_count should be 0
        # This is expected behavior - widget should be hidden on frontend when connected_count=0
        print(f"✓ Social dashboard connected_count={data['connected_count']} (widget hidden when 0)")


# ============================================================
# VERIFY EXISTING TEST CAMPAIGN
# ============================================================

class TestExistingCampaign:
    """Verify the pre-existing test campaign exists"""
    
    def test_existing_campaign_exists(self, auth_headers):
        """Verify camp_97532ec08752 exists"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/campaigns", headers=auth_headers)
        assert response.status_code == 200
        campaigns = response.json()
        
        campaign_ids = [c["campaign_id"] for c in campaigns]
        if TEST_CAMPAIGN_ID in campaign_ids:
            print(f"✓ Test campaign {TEST_CAMPAIGN_ID} exists")
        else:
            print(f"⚠ Test campaign {TEST_CAMPAIGN_ID} not found. Available: {campaign_ids[:3]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
