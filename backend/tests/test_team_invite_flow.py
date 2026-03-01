"""
Tests for Team Invite Flow - Issue: Invited team members not seeing brand data
Tests the fix where:
1. GET /api/brands returns brands where user is owner AND team member
2. GET /api/brands/{brand_id} allows access for team members
3. POST /api/team/accept/{token} auto-marks onboarding_completed=True
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@labrand.com"
ADMIN_PASSWORD = "LaBrand@2024!"
BRAND_ID = "brand_29aafd2d6125"

# Generate unique test user for invite flow
TEST_USER_EMAIL = f"test_invite_{uuid.uuid4().hex[:8]}@test.com"
TEST_USER_PASSWORD = "Test1234!"


class TestTeamInviteFlow:
    """Test the complete team invite flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin (brand owner)
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.admin_token = login_resp.json().get("token")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_01_admin_can_list_brands(self):
        """Admin (owner) can list brands"""
        resp = self.session.get(f"{BASE_URL}/api/brands", headers=self.admin_headers)
        assert resp.status_code == 200, f"GET /api/brands failed: {resp.text}"
        brands = resp.json()
        assert isinstance(brands, list), "Expected list of brands"
        # Admin should see at least one brand
        brand_ids = [b.get("brand_id") for b in brands]
        assert BRAND_ID in brand_ids, f"Admin should see brand {BRAND_ID}"
        print(f"✓ Admin can list {len(brands)} brands")
    
    def test_02_admin_can_access_specific_brand(self):
        """Admin (owner) can access specific brand"""
        resp = self.session.get(f"{BASE_URL}/api/brands/{BRAND_ID}", headers=self.admin_headers)
        assert resp.status_code == 200, f"GET /api/brands/{BRAND_ID} failed: {resp.text}"
        brand = resp.json()
        assert brand.get("brand_id") == BRAND_ID
        print(f"✓ Admin can access brand: {brand.get('name', BRAND_ID)}")
    
    def test_03_admin_can_send_invite(self):
        """Admin can send team invite"""
        resp = self.session.post(f"{BASE_URL}/api/team/invite", 
            headers=self.admin_headers,
            json={
                "email": TEST_USER_EMAIL,
                "role": "editor",
                "brand_id": BRAND_ID
            }
        )
        assert resp.status_code == 200, f"POST /api/team/invite failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        assert "invite_id" in data
        print(f"✓ Invite sent to {TEST_USER_EMAIL}, invite_id: {data.get('invite_id')}")
        # Store invite_id for later tests
        self.__class__.invite_id = data.get("invite_id")
    
    def test_04_list_pending_invites(self):
        """List pending invites for brand"""
        resp = self.session.get(f"{BASE_URL}/api/team/invites/{BRAND_ID}", headers=self.admin_headers)
        assert resp.status_code == 200, f"GET /api/team/invites failed: {resp.text}"
        data = resp.json()
        invites = data.get("invites", [])
        # Check our test user invite exists
        test_invite = next((i for i in invites if i.get("email") == TEST_USER_EMAIL), None)
        assert test_invite is not None, f"Invite for {TEST_USER_EMAIL} not found in pending invites"
        assert test_invite.get("status") == "pending"
        print(f"✓ Found pending invite for {TEST_USER_EMAIL}")
    
    def test_05_verify_sandro_team_membership(self):
        """Verify sandro@test.com is a team member (from previous manual test)"""
        sandro_email = "sandro@test.com"
        sandro_password = "Test1234!"
        
        # Login as sandro
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": sandro_email,
            "password": sandro_password
        })
        
        if login_resp.status_code != 200:
            pytest.skip(f"Sandro not registered yet: {login_resp.text}")
        
        sandro_token = login_resp.json().get("token")
        sandro_headers = {"Authorization": f"Bearer {sandro_token}"}
        
        # Check onboarding_completed flag
        me_resp = self.session.get(f"{BASE_URL}/api/auth/me", headers=sandro_headers)
        assert me_resp.status_code == 200, f"GET /api/auth/me failed: {me_resp.text}"
        user_data = me_resp.json()
        assert user_data.get("onboarding_completed") == True, "Invited user should have onboarding_completed=True"
        print(f"✓ Sandro has onboarding_completed=True")
        
        # Sandro should be able to list brands and see the shared brand
        brands_resp = self.session.get(f"{BASE_URL}/api/brands", headers=sandro_headers)
        assert brands_resp.status_code == 200, f"GET /api/brands failed for sandro: {brands_resp.text}"
        brands = brands_resp.json()
        brand_ids = [b.get("brand_id") for b in brands]
        assert BRAND_ID in brand_ids, f"Sandro should see brand {BRAND_ID} as team member"
        print(f"✓ Sandro can see {len(brands)} brands including {BRAND_ID}")
    
    def test_06_sandro_can_access_brand_details(self):
        """Sandro (team member) can access brand details"""
        sandro_email = "sandro@test.com"
        sandro_password = "Test1234!"
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": sandro_email,
            "password": sandro_password
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Sandro not registered")
        
        sandro_token = login_resp.json().get("token")
        sandro_headers = {"Authorization": f"Bearer {sandro_token}"}
        
        # Access specific brand
        resp = self.session.get(f"{BASE_URL}/api/brands/{BRAND_ID}", headers=sandro_headers)
        assert resp.status_code == 200, f"Team member should access brand: {resp.text}"
        brand = resp.json()
        assert brand.get("brand_id") == BRAND_ID
        print(f"✓ Sandro can access brand details: {brand.get('name', BRAND_ID)}")
    
    def test_07_sandro_can_access_brand_metrics(self):
        """Sandro (team member) can access brand metrics/dashboard data"""
        sandro_email = "sandro@test.com"
        sandro_password = "Test1234!"
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": sandro_email,
            "password": sandro_password
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Sandro not registered")
        
        sandro_token = login_resp.json().get("token")
        sandro_headers = {"Authorization": f"Bearer {sandro_token}"}
        
        # Access brand metrics
        resp = self.session.get(f"{BASE_URL}/api/brands/{BRAND_ID}/metrics", headers=sandro_headers)
        assert resp.status_code == 200, f"Team member should access brand metrics: {resp.text}"
        metrics = resp.json()
        assert "pillars_total" in metrics
        print(f"✓ Sandro can access brand metrics")
    
    def test_08_list_team_members(self):
        """List team members for brand"""
        resp = self.session.get(f"{BASE_URL}/api/team/members/{BRAND_ID}", headers=self.admin_headers)
        assert resp.status_code == 200, f"GET /api/team/members failed: {resp.text}"
        data = resp.json()
        
        # Should have owner
        assert data.get("owner") is not None
        assert data.get("owner", {}).get("role") == "owner"
        
        # Should have team members list
        members = data.get("members", [])
        sandro_member = next((m for m in members if m.get("email") == "sandro@test.com"), None)
        assert sandro_member is not None, "Sandro should be in team members list"
        print(f"✓ Team has {data.get('total')} members (owner + {len(members)} team members)")
    
    def test_09_cancel_test_invite(self):
        """Clean up: Cancel the test invite we created"""
        if not hasattr(self.__class__, 'invite_id'):
            pytest.skip("No invite_id to cancel")
        
        invite_id = self.__class__.invite_id
        resp = self.session.delete(f"{BASE_URL}/api/team/invites/{invite_id}", headers=self.admin_headers)
        assert resp.status_code == 200, f"DELETE /api/team/invites failed: {resp.text}"
        print(f"✓ Test invite cancelled: {invite_id}")


class TestBrandsAccessControl:
    """Test that GET /api/brands returns both owned and team brands"""
    
    def test_brands_endpoint_returns_owned_brands(self):
        """GET /api/brands returns brands user owns"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("token")
        
        # Get brands
        resp = session.get(f"{BASE_URL}/api/brands", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        brands = resp.json()
        
        # Admin owns brand_29aafd2d6125
        owned_brand = next((b for b in brands if b.get("brand_id") == BRAND_ID), None)
        assert owned_brand is not None, "Admin should see owned brand"
        assert owned_brand.get("owner_id") is not None
        print(f"✓ Admin sees owned brand: {BRAND_ID}")
    
    def test_brands_endpoint_returns_team_brands(self):
        """GET /api/brands returns brands user is a team member of"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as sandro (team member, not owner)
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sandro@test.com",
            "password": "Test1234!"
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Sandro not registered")
        
        token = login_resp.json().get("token")
        
        # Get brands
        resp = session.get(f"{BASE_URL}/api/brands", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        brands = resp.json()
        
        # Sandro should see the brand via team membership
        team_brand = next((b for b in brands if b.get("brand_id") == BRAND_ID), None)
        assert team_brand is not None, f"Sandro (team member) should see brand {BRAND_ID}"
        print(f"✓ Team member sees shared brand: {BRAND_ID}")


class TestAcceptInviteOnboarding:
    """Test that accepting invite auto-completes onboarding"""
    
    def test_invited_user_has_onboarding_completed(self):
        """Invited user should have onboarding_completed=True after accepting"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as sandro
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "sandro@test.com",
            "password": "Test1234!"
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Sandro not registered")
        
        token = login_resp.json().get("token")
        
        # Check user profile
        resp = session.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        user = resp.json()
        
        # This is the key fix - invited users should NOT go through onboarding
        assert user.get("onboarding_completed") == True, \
            "Invited user should have onboarding_completed=True to skip onboarding"
        print(f"✓ Sandro has onboarding_completed=True (skips onboarding)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
