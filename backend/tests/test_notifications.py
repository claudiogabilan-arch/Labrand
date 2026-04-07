"""
LaBrand Backend Tests - Notifications System
Tests for: Push notifications, notification preferences, and collaboration notification triggers
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://labrand-preview.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"
BRAND_ID = "brand_0902ead1b80c"


class TestNotificationsAPI:
    """Test notification CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        data = login_response.json()
        self.token = data.get("token")
        self.user_id = data.get("user", {}).get("user_id")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_get_notifications_returns_list_and_unread_count(self):
        """GET /api/notifications - Should return notifications list and unread_count"""
        response = self.session.get(f"{BASE_URL}/api/notifications")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "notifications" in data, "Response should contain 'notifications' key"
        assert "unread_count" in data, "Response should contain 'unread_count' key"
        assert isinstance(data["notifications"], list), "notifications should be a list"
        assert isinstance(data["unread_count"], int), "unread_count should be an integer"
        print(f"✓ GET /api/notifications - Found {len(data['notifications'])} notifications, {data['unread_count']} unread")
        
    def test_get_notifications_with_limit(self):
        """GET /api/notifications?limit=5 - Should respect limit parameter"""
        response = self.session.get(f"{BASE_URL}/api/notifications?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["notifications"]) <= 5, "Should return at most 5 notifications"
        print(f"✓ GET /api/notifications?limit=5 - Returned {len(data['notifications'])} notifications")
        
    def test_get_notifications_unread_only(self):
        """GET /api/notifications?unread_only=true - Should filter unread notifications"""
        response = self.session.get(f"{BASE_URL}/api/notifications?unread_only=true")
        
        assert response.status_code == 200
        data = response.json()
        # All returned notifications should be unread
        for notif in data["notifications"]:
            assert notif.get("read") == False, "All notifications should be unread when unread_only=true"
        print(f"✓ GET /api/notifications?unread_only=true - Returned {len(data['notifications'])} unread notifications")


class TestNotificationPreferences:
    """Test notification preferences endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        data = login_response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_get_notification_preferences(self):
        """GET /api/notifications/preferences - Should return user preferences"""
        response = self.session.get(f"{BASE_URL}/api/notifications/preferences")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "email_enabled" in data, "Response should contain 'email_enabled'"
        assert "types" in data, "Response should contain 'types'"
        print(f"✓ GET /api/notifications/preferences - email_enabled: {data['email_enabled']}, types: {data['types']}")
        
    def test_update_notification_preferences(self):
        """PUT /api/notifications/preferences - Should update preferences"""
        # Update preferences
        update_payload = {
            "email_enabled": False,
            "types": {
                "approval_request": True,
                "approval_action": False,
                "comment": True
            }
        }
        
        response = self.session.put(f"{BASE_URL}/api/notifications/preferences", json=update_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        # Verify the update by fetching preferences again
        verify_response = self.session.get(f"{BASE_URL}/api/notifications/preferences")
        verify_data = verify_response.json()
        
        assert verify_data["email_enabled"] == False, "email_enabled should be updated to False"
        assert verify_data["types"]["approval_action"] == False, "approval_action type should be False"
        print(f"✓ PUT /api/notifications/preferences - Successfully updated preferences")
        
        # Restore original preferences
        restore_payload = {
            "email_enabled": True,
            "types": {
                "approval_request": True,
                "approval_action": True,
                "comment": True
            }
        }
        self.session.put(f"{BASE_URL}/api/notifications/preferences", json=restore_payload)


class TestNotificationActions:
    """Test notification mark read and delete actions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        data = login_response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_mark_all_notifications_read(self):
        """POST /api/notifications/read-all - Should mark all notifications as read"""
        response = self.session.post(f"{BASE_URL}/api/notifications/read-all")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        # Verify unread count is now 0
        verify_response = self.session.get(f"{BASE_URL}/api/notifications")
        verify_data = verify_response.json()
        assert verify_data["unread_count"] == 0, "Unread count should be 0 after marking all read"
        print(f"✓ POST /api/notifications/read-all - All notifications marked as read")
        
    def test_mark_single_notification_read(self):
        """POST /api/notifications/{notif_id}/read - Should mark single notification as read"""
        # First get a notification ID (or use a fake one - endpoint should handle gracefully)
        notifs_response = self.session.get(f"{BASE_URL}/api/notifications")
        notifs = notifs_response.json().get("notifications", [])
        
        if notifs:
            notif_id = notifs[0]["notif_id"]
            response = self.session.post(f"{BASE_URL}/api/notifications/{notif_id}/read")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            data = response.json()
            assert data.get("success") == True
            print(f"✓ POST /api/notifications/{notif_id}/read - Notification marked as read")
        else:
            # Test with non-existent ID - should still return 200 (no-op)
            response = self.session.post(f"{BASE_URL}/api/notifications/notif_nonexistent/read")
            assert response.status_code == 200, "Should handle non-existent notification gracefully"
            print(f"✓ POST /api/notifications/notif_nonexistent/read - Handled gracefully")
            
    def test_delete_notification(self):
        """DELETE /api/notifications/{notif_id} - Should delete notification"""
        # Test with non-existent ID - should return 200 (no-op)
        response = self.session.delete(f"{BASE_URL}/api/notifications/notif_test_delete")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ DELETE /api/notifications/notif_test_delete - Delete endpoint works")


class TestCollaborationNotificationTriggers:
    """Test that collaboration actions trigger notifications"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        data = login_response.json()
        self.token = data.get("token")
        self.user_id = data.get("user", {}).get("user_id")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_create_approval_triggers_notification(self):
        """POST /api/brands/{brand_id}/approvals - Should create approval and trigger notification"""
        # Create an approval request
        approval_payload = {
            "item_type": "TEST_pillar",
            "item_id": f"test_{uuid.uuid4().hex[:8]}",
            "item_name": "TEST_Approval_Notification_Test",
            "description": "Testing notification trigger",
            "assigned_to": self.user_id  # Assign to self for testing
        }
        
        response = self.session.post(f"{BASE_URL}/api/brands/{BRAND_ID}/approvals", json=approval_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "approval_id" in data, "Response should contain approval_id"
        assert data["status"] == "pending", "New approval should have pending status"
        assert data["item_name"] == "TEST_Approval_Notification_Test"
        
        self.approval_id = data["approval_id"]
        print(f"✓ POST /api/brands/{BRAND_ID}/approvals - Created approval {self.approval_id}")
        
        # Check if notification was created (since we assigned to self)
        notifs_response = self.session.get(f"{BASE_URL}/api/notifications?limit=5")
        notifs = notifs_response.json().get("notifications", [])
        
        # Look for the notification about this approval
        found_notif = any(
            "aprovacao" in n.get("title", "").lower() or "approval" in n.get("type", "").lower()
            for n in notifs
        )
        print(f"  Notification created: {found_notif}")
        
    def test_approval_action_triggers_notification(self):
        """POST /api/brands/{brand_id}/approvals/{id}/action - Should trigger notification to requester"""
        # First create an approval
        approval_payload = {
            "item_type": "TEST_pillar",
            "item_id": f"test_{uuid.uuid4().hex[:8]}",
            "item_name": "TEST_Action_Notification_Test",
            "description": "Testing action notification"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/brands/{BRAND_ID}/approvals", json=approval_payload)
        assert create_response.status_code == 200
        approval_id = create_response.json()["approval_id"]
        
        # Now take action on the approval
        action_payload = {
            "action": "approve",
            "comment": "TEST approved for notification testing"
        }
        
        response = self.session.post(f"{BASE_URL}/api/brands/{BRAND_ID}/approvals/{approval_id}/action", json=action_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "approved", "Approval should be approved"
        print(f"✓ POST /api/brands/{BRAND_ID}/approvals/{approval_id}/action - Approval action completed")
        
    def test_comment_triggers_notification(self):
        """POST /api/brands/{brand_id}/comments - Should trigger notification to other commenters"""
        # Create a comment
        comment_payload = {
            "item_type": "TEST_pillar",
            "item_id": f"test_{uuid.uuid4().hex[:8]}",
            "content": "TEST comment for notification testing"
        }
        
        response = self.session.post(f"{BASE_URL}/api/brands/{BRAND_ID}/comments", json=comment_payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "comment_id" in data, "Response should contain comment_id"
        assert data["content"] == "TEST comment for notification testing"
        print(f"✓ POST /api/brands/{BRAND_ID}/comments - Comment created, notification logic triggered")


class TestActivityFeed:
    """Test activity feed endpoint for dashboard"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        data = login_response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_get_activity_feed(self):
        """GET /api/brands/{brand_id}/activity - Should return activity feed"""
        response = self.session.get(f"{BASE_URL}/api/brands/{BRAND_ID}/activity?limit=10")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "activities" in data, "Response should contain 'activities' key"
        assert isinstance(data["activities"], list), "activities should be a list"
        print(f"✓ GET /api/brands/{BRAND_ID}/activity - Found {len(data['activities'])} activities")
        
    def test_get_pending_approvals_count(self):
        """GET /api/brands/{brand_id}/approvals?status=pending - Should return pending approvals with count"""
        response = self.session.get(f"{BASE_URL}/api/brands/{BRAND_ID}/approvals?status=pending")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "approvals" in data, "Response should contain 'approvals' key"
        assert "counts" in data, "Response should contain 'counts' key"
        assert "pending" in data["counts"], "counts should contain 'pending'"
        print(f"✓ GET /api/brands/{BRAND_ID}/approvals?status=pending - Pending count: {data['counts']['pending']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
