"""
Test Suite: Collaboration Module + Brand Tracking Features
Tests: Approvals CRUD, Activity Log, Comments CRUD, Tracking History/Comparison/Snapshot
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
BRAND_ID = "brand_29aafd2d6125"

class TestAuthentication:
    """Authentication fixture tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@labrand.com",
            "password": "LaBrand@2024!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Return headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestApprovalsEndpoints(TestAuthentication):
    """Tests for Approvals CRUD operations"""
    
    created_approval_ids = []
    
    def test_01_get_approvals_empty_or_list(self, headers):
        """GET /api/brands/{brand_id}/approvals - should return approvals list and counts"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/approvals", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Validate structure
        assert "approvals" in data, "Response should have 'approvals' key"
        assert "counts" in data, "Response should have 'counts' key"
        assert isinstance(data["approvals"], list), "approvals should be a list"
        
        # Validate counts structure
        counts = data["counts"]
        assert "pending" in counts, "counts should have 'pending'"
        assert "approved" in counts, "counts should have 'approved'"
        assert "rejected" in counts, "counts should have 'rejected'"
        assert "changes_requested" in counts, "counts should have 'changes_requested'"
        print(f"✓ GET approvals returned {len(data['approvals'])} approvals, counts: {counts}")
    
    def test_02_create_approval_pending_status(self, headers):
        """POST /api/brands/{brand_id}/approvals - creates approval with status=pending"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "item_type": "pillar",
            "item_id": f"TEST_pillar_{unique_id}",
            "item_name": f"TEST_Approval_Item_{unique_id}",
            "description": "Test approval for automated testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/approvals", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Validate response
        assert "approval_id" in data, "Response should have approval_id"
        assert data["status"] == "pending", f"Expected status 'pending', got '{data.get('status')}'"
        assert data["item_type"] == "pillar", "item_type should match"
        assert data["item_name"] == payload["item_name"], "item_name should match"
        assert "created_at" in data, "Should have created_at timestamp"
        assert "history" in data, "Should have history array"
        assert len(data["history"]) >= 1, "History should have at least one entry (creation)"
        
        self.__class__.created_approval_ids.append(data["approval_id"])
        print(f"✓ Created approval {data['approval_id']} with status=pending")
    
    def test_03_approval_action_approve(self, headers):
        """POST /api/brands/{brand_id}/approvals/{id}/action with action='approve'"""
        # First create a new approval to test action
        unique_id = uuid.uuid4().hex[:8]
        create_payload = {
            "item_type": "touchpoint",
            "item_id": f"TEST_tp_{unique_id}",
            "item_name": f"TEST_Action_Approve_{unique_id}",
            "description": "Test approval for action testing"
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/approvals", json=create_payload, headers=headers)
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        approval_id = create_resp.json()["approval_id"]
        self.__class__.created_approval_ids.append(approval_id)
        
        # Now approve it
        action_payload = {"action": "approve", "comment": "Looks good!"}
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/approvals/{approval_id}/action", json=action_payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["status"] == "approved", f"Expected status 'approved', got '{data.get('status')}'"
        assert len(data["history"]) >= 2, "History should have create + approve entries"
        print(f"✓ Approval {approval_id} action 'approve' worked - status=approved")
    
    def test_04_approval_action_reject(self, headers):
        """POST /api/brands/{brand_id}/approvals/{id}/action with action='reject'"""
        unique_id = uuid.uuid4().hex[:8]
        create_payload = {
            "item_type": "strategy",
            "item_id": f"TEST_str_{unique_id}",
            "item_name": f"TEST_Action_Reject_{unique_id}",
            "description": "Test approval for reject testing"
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/approvals", json=create_payload, headers=headers)
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        approval_id = create_resp.json()["approval_id"]
        self.__class__.created_approval_ids.append(approval_id)
        
        # Reject it
        action_payload = {"action": "reject", "comment": "Needs more work"}
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/approvals/{approval_id}/action", json=action_payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["status"] == "rejected", f"Expected status 'rejected', got '{data.get('status')}'"
        print(f"✓ Approval {approval_id} action 'reject' worked - status=rejected")
    
    def test_05_approval_action_request_changes(self, headers):
        """POST /api/brands/{brand_id}/approvals/{id}/action with action='request_changes'"""
        unique_id = uuid.uuid4().hex[:8]
        create_payload = {
            "item_type": "content",
            "item_id": f"TEST_cnt_{unique_id}",
            "item_name": f"TEST_Action_Changes_{unique_id}",
            "description": "Test approval for request_changes testing"
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/approvals", json=create_payload, headers=headers)
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        approval_id = create_resp.json()["approval_id"]
        self.__class__.created_approval_ids.append(approval_id)
        
        # Request changes
        action_payload = {"action": "request_changes", "comment": "Please update the copy"}
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/approvals/{approval_id}/action", json=action_payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["status"] == "changes_requested", f"Expected status 'changes_requested', got '{data.get('status')}'"
        print(f"✓ Approval {approval_id} action 'request_changes' worked - status=changes_requested")


class TestActivityLogEndpoints(TestAuthentication):
    """Tests for Activity Log endpoints"""
    
    def test_01_get_activity_log(self, headers):
        """GET /api/brands/{brand_id}/activity - returns activity log"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/activity", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "activities" in data, "Response should have 'activities' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["activities"], list), "activities should be a list"
        
        # If there are activities, verify structure
        if len(data["activities"]) > 0:
            activity = data["activities"][0]
            assert "activity_id" in activity, "Activity should have activity_id"
            assert "action" in activity, "Activity should have action"
            assert "user_name" in activity, "Activity should have user_name"
            assert "created_at" in activity, "Activity should have created_at"
        
        print(f"✓ GET activity log returned {data['total']} activities")


class TestCommentsEndpoints(TestAuthentication):
    """Tests for Comments CRUD operations"""
    
    created_comment_ids = []
    
    def test_01_get_comments_list(self, headers):
        """GET /api/brands/{brand_id}/comments - returns comments list"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/comments", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "comments" in data, "Response should have 'comments' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["comments"], list), "comments should be a list"
        print(f"✓ GET comments returned {data['total']} comments")
    
    def test_02_create_comment(self, headers):
        """POST /api/brands/{brand_id}/comments - creates comment"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "item_type": "general",
            "item_id": "brand",
            "content": f"TEST_Comment_{unique_id}: This is a test comment for automated testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/comments", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "comment_id" in data, "Response should have comment_id"
        assert data["item_type"] == "general", "item_type should match"
        assert data["content"] == payload["content"], "content should match"
        assert "user_id" in data, "Should have user_id"
        assert "user_name" in data, "Should have user_name"
        assert "created_at" in data, "Should have created_at"
        
        self.__class__.created_comment_ids.append(data["comment_id"])
        print(f"✓ Created comment {data['comment_id']}")
    
    def test_03_delete_own_comment(self, headers):
        """DELETE /api/brands/{brand_id}/comments/{id} - removes own comment"""
        # First create a comment to delete
        unique_id = uuid.uuid4().hex[:8]
        create_payload = {
            "item_type": "pillar",
            "item_id": "test_pillar",
            "content": f"TEST_Comment_ToDelete_{unique_id}: Will be deleted"
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/comments", json=create_payload, headers=headers)
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        comment_id = create_resp.json()["comment_id"]
        
        # Now delete it
        response = requests.delete(f"{BASE_URL}/api/brands/{BRAND_ID}/comments/{comment_id}", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "message" in data, "Should have message"
        print(f"✓ Deleted comment {comment_id}")
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/comments", headers=headers)
        comments = get_resp.json()["comments"]
        comment_ids = [c["comment_id"] for c in comments]
        assert comment_id not in comment_ids, "Deleted comment should not appear in list"


class TestBrandTrackingEndpoints(TestAuthentication):
    """Tests for Brand Tracking History/Comparison/Snapshot endpoints"""
    
    def test_01_get_tracking_history(self, headers):
        """GET /api/brands/{brand_id}/tracking/history - returns snapshots"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/tracking/history", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "snapshots" in data, "Response should have 'snapshots' key"
        assert "total" in data or "period_months" in data, "Response should have total or period_months"
        assert isinstance(data["snapshots"], list), "snapshots should be a list"
        
        # Check has_data field if present
        if "has_data" in data:
            if data["has_data"]:
                assert len(data["snapshots"]) > 0, "Should have snapshots if has_data is True"
        
        print(f"✓ GET tracking history returned {len(data['snapshots'])} snapshots")
    
    def test_02_get_tracking_comparison(self, headers):
        """GET /api/brands/{brand_id}/tracking/comparison - returns current+changes"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/tracking/comparison", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "current" in data, "Response should have 'current' key"
        assert "previous" in data or "changes" in data, "Response should have 'previous' or 'changes' key"
        
        # Validate current metrics exist
        current = data["current"]
        expected_metrics = ["brand_score", "pillar_completion", "touchpoints_count"]
        for metric in expected_metrics:
            assert metric in current, f"current should have '{metric}'"
        
        # Validate changes if present
        if "changes" in data:
            assert isinstance(data["changes"], dict), "changes should be a dict"
        
        print(f"✓ GET tracking comparison returned current metrics: {list(current.keys())}")
    
    def test_03_create_tracking_snapshot(self, headers):
        """POST /api/brands/{brand_id}/tracking/snapshot - creates snapshot"""
        payload = {"notes": "TEST_Snapshot: Automated testing snapshot"}
        
        response = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/tracking/snapshot", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "success" in data, "Response should have 'success' key"
        assert data["success"] == True, "success should be True"
        assert "snapshot" in data, "Response should have 'snapshot' key"
        
        snapshot = data["snapshot"]
        assert "snapshot_id" in snapshot, "Snapshot should have snapshot_id"
        assert "brand_id" in snapshot, "Snapshot should have brand_id"
        assert snapshot["brand_id"] == BRAND_ID, "brand_id should match"
        assert "created_at" in snapshot, "Snapshot should have created_at"
        assert snapshot["type"] == "manual", "type should be 'manual'"
        
        # Verify metrics were collected
        assert "brand_score" in snapshot or "pillar_completion" in snapshot, "Snapshot should have metrics"
        
        print(f"✓ Created tracking snapshot {snapshot['snapshot_id']}")
    
    def test_04_verify_snapshot_in_history(self, headers):
        """Verify created snapshot appears in history"""
        # Create a snapshot first
        create_resp = requests.post(f"{BASE_URL}/api/brands/{BRAND_ID}/tracking/snapshot", 
                                    json={"notes": "TEST_Verify_Snapshot"}, headers=headers)
        assert create_resp.status_code == 200
        
        # Get history and verify
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/tracking/history", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["snapshots"]) > 0, "Should have at least one snapshot after creation"
        
        # Check latest snapshot
        latest = data["snapshots"][0]
        assert "snapshot_id" in latest, "Snapshot should have snapshot_id"
        print(f"✓ Verified snapshot appears in history (latest: {latest['snapshot_id']})")


class TestCleanup(TestAuthentication):
    """Cleanup test data - runs at the end"""
    
    def test_cleanup_approvals(self, headers):
        """Clean up TEST_ prefixed approvals"""
        # Get all approvals
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/approvals", headers=headers)
        if response.status_code == 200:
            approvals = response.json().get("approvals", [])
            test_approvals = [a for a in approvals if a.get("item_name", "").startswith("TEST_")]
            print(f"✓ Found {len(test_approvals)} TEST_ approvals (no direct delete endpoint)")
    
    def test_cleanup_comments(self, headers):
        """Clean up TEST_ prefixed comments"""
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/comments", headers=headers)
        if response.status_code == 200:
            comments = response.json().get("comments", [])
            test_comments = [c for c in comments if c.get("content", "").startswith("TEST_")]
            for comment in test_comments:
                del_resp = requests.delete(f"{BASE_URL}/api/brands/{BRAND_ID}/comments/{comment['comment_id']}", headers=headers)
                if del_resp.status_code == 200:
                    print(f"  Deleted comment {comment['comment_id']}")
            print(f"✓ Cleaned up {len(test_comments)} TEST_ comments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
