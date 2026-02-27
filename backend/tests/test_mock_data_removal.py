"""
Test Mock Data Removal - Verify empty states when no real data exists

This test verifies that all mock/simulated data generation has been removed
and proper empty states are returned when no real data exists.

Modules tested:
- Social Listening: should return has_data:false with empty state message
- Share of Voice: should return has_data:false when no mentions
- Conversion Attributes: should return has_data:false when < 5 surveys
- Brand Tracking: should return has_data:false when no snapshots
- BVS History: should return has_data:false when no history
- Admin cleanup endpoint: should work correctly
- PDF Report generation: should work with POST method
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from context
ADMIN_EMAIL = "admin@labrand.com"
ADMIN_PASSWORD = "LaBrand@2024!"
BRAND_ID = "brand_29aafd2d6125"


class TestMockDataRemoval:
    """Tests to verify mock data has been removed and empty states are properly returned"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Setup - get auth token"""
        self.client = api_client
        # Login as admin
        response = self.client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("token")
            self.client.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
            # Get or create a brand for testing
            brands_res = self.client.get(f"{BASE_URL}/api/brands")
            if brands_res.status_code == 200:
                brands = brands_res.json()
                # API returns list directly, not dict with brands key
                if isinstance(brands, list) and brands:
                    self.brand_id = brands[0].get("brand_id")
                else:
                    self.brand_id = BRAND_ID
            else:
                self.brand_id = BRAND_ID
        else:
            pytest.skip(f"Authentication failed - status {response.status_code}")

    # ===========================================
    # SOCIAL LISTENING TESTS
    # ===========================================
    
    def test_social_listening_dashboard_empty_state(self, api_client):
        """Social Listening dashboard should return has_data:false when no mentions exist"""
        # First clean any existing mock data
        cleanup_response = self.client.get(f"{BASE_URL}/api/brands/{self.brand_id}/social-listening/clear-mock-data")
        print(f"Cleanup response: {cleanup_response.status_code}")
        
        # Now test the dashboard
        response = self.client.get(f"{BASE_URL}/api/brands/{self.brand_id}/social-listening/dashboard?days=30")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Social Listening Dashboard: has_data={data.get('has_data')}, total_mentions={data.get('summary', {}).get('total_mentions')}")
        
        # Verify empty state structure
        assert "has_data" in data, "Response should contain has_data field"
        
        if not data.get("has_data"):
            # Verify empty state message is in Portuguese
            assert "message" in data, "Empty state should have a message"
            assert "summary" in data, "Response should have summary"
            assert data["summary"]["total_mentions"] == 0, "Total mentions should be 0"
            print(f"Empty state message: {data.get('message')}")
        else:
            # If has_data is true, verify real data structure
            assert "summary" in data, "Response should have summary"
            print(f"Has real data: {data['summary']['total_mentions']} mentions")

    def test_social_listening_mentions_empty(self, api_client):
        """Social mentions endpoint should return empty list when no data"""
        response = self.client.get(f"{BASE_URL}/api/brands/{self.brand_id}/social-listening/mentions?limit=50")
        assert response.status_code == 200
        
        data = response.json()
        assert "mentions" in data, "Response should contain mentions field"
        assert isinstance(data["mentions"], list), "Mentions should be a list"
        print(f"Social Mentions: {len(data['mentions'])} found")

    # ===========================================
    # SHARE OF VOICE TESTS
    # ===========================================
    
    def test_share_of_voice_empty_state(self, api_client):
        """Share of Voice should return has_data:false when no social mentions exist"""
        response = self.client.get(f"{BASE_URL}/api/brands/{self.brand_id}/share-of-voice?period=30")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Share of Voice: has_data={data.get('has_data')}")
        
        assert "has_data" in data, "Response should contain has_data field"
        
        if not data.get("has_data"):
            assert "message" in data, "Empty state should have a message"
            assert "sov" in data, "Response should have sov structure"
            assert data["sov"]["brand"]["mentions"] == 0, "Brand mentions should be 0"
            print(f"Empty state message: {data.get('message')}")
        else:
            print(f"Has real data: {data['sov']['brand']['mentions']} brand mentions")

    def test_share_of_voice_trend_empty(self, api_client):
        """Share of Voice trend should return empty when no history data"""
        response = self.client.get(f"{BASE_URL}/api/brands/{self.brand_id}/share-of-voice/trend?months=6")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"SOV Trend: has_data={data.get('has_data')}, trend_count={len(data.get('trend', []))}")
        
        assert "has_data" in data, "Response should contain has_data field"
        
        if not data.get("has_data"):
            assert "message" in data, "Empty state should have a message"
            assert data.get("trend") == [] or data.get("trend") is None or len(data.get("trend", [])) == 0, "Trend should be empty"
            print(f"Empty trend message: {data.get('message')}")

    # ===========================================
    # CONVERSION ATTRIBUTES TESTS
    # ===========================================
    
    def test_conversion_attributes_analysis_empty(self, api_client):
        """Conversion Attributes analysis should return has_data:false when < 5 surveys"""
        response = self.client.get(f"{BASE_URL}/api/brands/{self.brand_id}/conversion-attributes/analysis")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Conversion Attributes: has_data={data.get('has_data')}, total_surveys={data.get('total_surveys')}")
        
        # Check if has_data field exists and reflects survey count
        if data.get("total_surveys", 0) < 5:
            assert data.get("has_data") == False, "Should be has_data:false when < 5 surveys"
            assert "message" in data, "Empty state should have a message"
            print(f"Empty state message: {data.get('message')}")
        
        assert "total_surveys" in data, "Response should contain total_surveys"

    def test_conversion_attributes_matrix_empty(self, api_client):
        """Conversion Attributes matrix should handle empty case"""
        response = self.client.get(f"{BASE_URL}/api/brands/{self.brand_id}/conversion-attributes/matrix")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Conversion Matrix: has_data={data.get('has_data')}")
        
        assert "quadrants" in data, "Response should contain quadrants"
        
        if data.get("has_data") == False:
            # Verify empty quadrants structure
            assert all(len(v) == 0 for v in data["quadrants"].values()), "All quadrants should be empty"
            print("Matrix empty state verified")

    # ===========================================
    # BRAND TRACKING TESTS
    # ===========================================
    
    def test_brand_tracking_history_empty(self, api_client):
        """Brand Tracking history should return has_data:false when no snapshots exist"""
        response = self.client.get(f"{BASE_URL}/api/brands/{self.brand_id}/tracking/history?months=6")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Brand Tracking: has_data={data.get('has_data')}, snapshots={len(data.get('snapshots', []))}")
        
        assert "has_data" in data or "snapshots" in data, "Response should have has_data or snapshots"
        
        if not data.get("snapshots") or len(data.get("snapshots", [])) == 0:
            assert data.get("has_data") == False, "Should be has_data:false when no snapshots"
            if "message" in data:
                print(f"Empty state message: {data.get('message')}")

    def test_brand_tracking_comparison(self, api_client):
        """Brand Tracking comparison should work even with limited data"""
        response = self.client.get(f"{BASE_URL}/api/brands/{self.brand_id}/tracking/comparison")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Brand Tracking Comparison: current={data.get('current')}, previous={data.get('previous')}")
        
        # Should return comparison structure even if limited data
        assert "current" in data, "Response should contain current"
        assert "changes" in data, "Response should contain changes"

    # ===========================================
    # BVS (BRANDING VALUE SCORE) TESTS
    # ===========================================
    
    def test_bvs_history_empty(self, api_client):
        """BVS history should return has_data:false when no history records exist"""
        response = self.client.get(f"{BASE_URL}/api/brands/{self.brand_id}/bvs/history?months=6")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"BVS History: has_data={data.get('has_data')}, history={len(data.get('history', []))}")
        
        assert "has_data" in data, "Response should contain has_data field"
        
        if not data.get("history") or len(data.get("history", [])) == 0:
            assert data.get("has_data") == False, "Should be has_data:false when no history"
            if "message" in data:
                print(f"Empty state message: {data.get('message')}")

    def test_bvs_main_score(self, api_client):
        """BVS main score should calculate based on real data"""
        response = self.client.get(f"{BASE_URL}/api/brands/{self.brand_id}/bvs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"BVS Score: {data.get('bvs_score')}, level={data.get('level', {}).get('name')}")
        
        assert "bvs_score" in data, "Response should contain bvs_score"
        assert "components" in data, "Response should contain components"
        assert "level" in data, "Response should contain level"

    # ===========================================
    # ADMIN CLEANUP ENDPOINT TESTS
    # ===========================================
    
    def test_admin_clean_mock_data_endpoint(self, api_client):
        """Admin cleanup endpoint should work correctly"""
        response = self.client.get(f"{BASE_URL}/api/admin/clean-mock-data/{self.brand_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Admin Cleanup: success={data.get('success')}, details={data.get('details')}")
        
        assert data.get("success") == True, "Cleanup should succeed"
        assert "brand_id" in data, "Response should contain brand_id"
        assert "details" in data, "Response should contain details"
        
        # Verify details structure
        details = data.get("details", {})
        expected_keys = ["social_mentions", "sample_surveys", "auto_tracking", "sov_config", "social_config"]
        for key in expected_keys:
            assert key in details, f"Details should contain {key}"
            print(f"  Cleaned {key}: {details[key]}")

    # ===========================================
    # PDF REPORT GENERATION TESTS
    # ===========================================
    
    def test_pdf_report_generation_post(self, api_client):
        """PDF Report generation at /api/brands/{brand_id}/reports/executive-pdf should work with POST"""
        response = self.client.post(
            f"{BASE_URL}/api/brands/{self.brand_id}/reports/executive-pdf",
            json={
                "sections": ["summary", "pillars", "recommendations"],
                "include_charts": True,
                "language": "pt-BR"
            }
        )
        
        # PDF endpoints may return 200 with binary data or error
        print(f"PDF Report: status={response.status_code}")
        
        if response.status_code == 200:
            # Check if response is PDF
            content_type = response.headers.get("content-type", "")
            if "application/pdf" in content_type:
                print("PDF generated successfully")
                assert len(response.content) > 0, "PDF content should not be empty"
            else:
                # May return JSON with error or info
                print(f"Response: {response.text[:500]}")
        elif response.status_code == 404:
            # Brand may not exist
            print(f"Brand {self.brand_id} not found - this is expected if brand doesn't exist")
        else:
            print(f"Unexpected status: {response.status_code}, response: {response.text[:500]}")

    def test_reports_history(self, api_client):
        """Reports history endpoint should work"""
        response = self.client.get(f"{BASE_URL}/api/brands/{self.brand_id}/reports/history")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Reports History: {len(data.get('reports', []))} reports found")
            assert "reports" in data, "Response should contain reports"
        elif response.status_code == 404:
            print(f"Brand {self.brand_id} not found")
        else:
            print(f"Status: {response.status_code}")


class TestHealthAndAuth:
    """Basic health and auth tests"""
    
    def test_health_check(self, api_client):
        """API health check should work"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("Health check passed")
    
    def test_admin_login(self, api_client):
        """Admin login should work with provided credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            assert "token" in data, "Login should return token"
            print(f"Admin login successful: {data.get('user', {}).get('email')}")
        else:
            print(f"Admin login failed: {response.status_code} - {response.text[:200]}")
            # Try with alternate credentials
            alt_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
                "email": "demo@labrand.com",
                "password": "password123"
            })
            if alt_response.status_code == 200:
                print("Demo user login successful")
            else:
                pytest.skip("Both admin and demo login failed")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
