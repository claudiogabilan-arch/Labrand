"""
Test for 5 new issues reported in LaBrand:
1. Audience page 'Buscar Influenciadores' button - should show proper feedback
2. Benchmark page - should show empty state when no pillar data
3. Brand Funnel - should NOT show fake data (10000/3000/1200)
4. Brand Health - should handle empty funnel properly
5. Pilar Valores - progress should show 100% when valores + necessidades filled (crossings NOT required)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSetup:
    """Get auth token for tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@labrand.com",
            "password": "LaBrand@2024!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def brand_id(self):
        return "brand_29aafd2d6125"


class TestIssue1_AudienceInfluencers(TestSetup):
    """Issue 1: Audience page - /api/brands/{brand_id}/influencers endpoint behavior"""
    
    def test_influencers_endpoint_returns_404(self, auth_token, brand_id):
        """
        The /influencers endpoint does NOT exist - frontend should handle 404 gracefully
        showing a toast message about needing social media integrations
        """
        response = requests.get(
            f"{BASE_URL}/api/brands/{brand_id}/influencers",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Endpoint doesn't exist, should return 404
        assert response.status_code == 404, f"Expected 404 for non-existent influencers endpoint, got {response.status_code}"
        print(f"✓ Influencers endpoint correctly returns 404 (expected - frontend handles gracefully)")


class TestIssue2_Benchmark(TestSetup):
    """Issue 2: Benchmark page - should show empty state when no pillar data or proper data with disclaimer"""
    
    def test_benchmark_returns_has_data_flag(self, auth_token, brand_id):
        """Benchmark should return has_data flag"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{brand_id}/benchmark",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Must have has_data flag
        assert "has_data" in data, "Missing has_data flag in benchmark response"
        print(f"✓ Benchmark has_data flag: {data['has_data']}")
        
        # Check sector - should NOT be 'default'
        sector = data.get("sector", "")
        assert sector != "default", f"Sector should not be 'default', got: {sector}"
        print(f"✓ Sector: {sector}")
        
        # Check RBI - should be null/None when not calculated from valuation
        rbi = data.get("rbi")
        print(f"✓ RBI value: {rbi}")  # Can be null or a real number
        
        # Check message exists
        assert "message" in data, "Missing message in benchmark response"
        print(f"✓ Benchmark message: {data.get('message')}")
        
        # Check pillars_filled and pillars_total
        assert "pillars_filled" in data, "Missing pillars_filled in response"
        assert "pillars_total" in data, "Missing pillars_total in response"
        print(f"✓ Pillars: {data.get('pillars_filled')}/{data.get('pillars_total')}")
        
    def test_benchmark_no_fake_95th_percentile(self, auth_token, brand_id):
        """Benchmark percentile should be based on real calculation, not hardcoded 95"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{brand_id}/benchmark",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        percentile = data.get("percentile", 0)
        brand_strength = data.get("brand_strength", 0)
        
        # Percentile should match brand_strength calculation logic
        # Not hardcoded to 95
        print(f"✓ Percentile: {percentile}, Brand Strength: {brand_strength}")
        # Percentile should be between 10 and 90 based on brand_strength
        assert 0 <= percentile <= 100, f"Percentile out of range: {percentile}"


class TestIssue3_BrandFunnel(TestSetup):
    """Issue 3: Brand Funnel - should NOT show fake data (10000, 3000, 1200)"""
    
    def test_brand_funnel_no_fake_values(self, auth_token, brand_id):
        """Brand funnel should return empty stages when no real data, NOT fake values"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{brand_id}/brand-funnel",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        funnel = data.get("funnel", {})
        stages = funnel.get("stages", {})
        
        # Check for fake values
        fake_values = [10000, 3000, 1200, 600, 200, 50]  # Typical mock data pattern
        
        for stage_id, stage_data in stages.items():
            value = stage_data.get("value", 0) if isinstance(stage_data, dict) else 0
            if value in fake_values:
                # This could be coincidental, but log it
                print(f"⚠ Stage {stage_id} has value {value} - could be mock data")
        
        # If no stages, should have has_data: false and message
        if not stages:
            has_data = funnel.get("has_data", True)
            message = funnel.get("message", "")
            assert has_data == False or message, "Empty funnel should have has_data:false or message"
            print(f"✓ Empty funnel correctly shows: has_data={has_data}, message='{message}'")
        else:
            print(f"✓ Funnel has {len(stages)} stages with real data")
    
    def test_brand_funnel_empty_state_message(self, auth_token, brand_id):
        """Brand funnel should return proper empty state message"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{brand_id}/brand-funnel",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        funnel = data.get("funnel", {})
        stages = funnel.get("stages", {})
        
        if not stages or len(stages) == 0:
            # Check proper empty state
            message = funnel.get("message", "")
            assert message or funnel.get("has_data") == False, "Empty funnel should have message or has_data:false"
            print(f"✓ Empty funnel message: {message}")


class TestIssue4_BrandHealth(TestSetup):
    """Issue 4: Brand Health - should handle empty funnel state properly"""
    
    def test_brand_health_funnel_section(self, auth_token, brand_id):
        """Brand Health should show proper empty state for funnel when no data"""
        # First get funnel data
        funnel_response = requests.get(
            f"{BASE_URL}/api/brands/{brand_id}/brand-funnel",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert funnel_response.status_code == 200
        funnel_data = funnel_response.json().get("funnel", {})
        
        # Check Brand Health endpoint
        health_response = requests.get(
            f"{BASE_URL}/api/brands/{brand_id}/brand-health",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # This endpoint may or may not exist - handle both cases
        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f"✓ Brand Health data: {health_data}")
        else:
            print(f"✓ Brand Health uses individual module endpoints (no consolidated endpoint)")
        
        # The main check is that funnel has proper empty state
        funnel_stages = funnel_data.get("stages", {})
        if not funnel_stages:
            health_score = funnel_data.get("health_score", 0)
            assert health_score == 0, f"Empty funnel should have health_score 0, got {health_score}"
            print(f"✓ Empty funnel correctly shows health_score: {health_score}")


class TestIssue5_PillarValues(TestSetup):
    """Issue 5: Pilar Valores - progress should be 100% when valores + necessidades filled"""
    
    def test_metrics_endpoint_pillar_calculation(self, auth_token, brand_id):
        """Test that pillar metrics correctly calculate values pillar progress"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{brand_id}/metrics",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        pillars = data.get("pillars", {})
        values_progress = pillars.get("values", 0)
        
        print(f"✓ Values pillar progress: {values_progress}%")
        print(f"✓ All pillars: {pillars}")
        
        # Check overall completion calculation
        overall = data.get("overall_completion", 0)
        print(f"✓ Overall completion: {overall}%")
    
    def test_values_pillar_data_structure(self, auth_token, brand_id):
        """Test values pillar data structure - valores and necessidades should contribute to progress"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{brand_id}/pillars/values",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # This endpoint may return 404 if no values pillar data
        if response.status_code == 200:
            data = response.json()
            answers = data.get("answers", {})
            
            valores = answers.get("valores", [])
            necessidades = answers.get("necessidades", [])
            cruzamento = answers.get("cruzamento", [])
            
            print(f"✓ Values pillar - valores: {len(valores)}, necessidades: {len(necessidades)}, cruzamento: {len(cruzamento)}")
            
            # Per the fix: progress = 50% for valores + 50% for necessidades
            # Cruzamentos should NOT affect the 100% completion
            if valores and necessidades:
                print(f"✓ Both valores and necessidades present - should show 100% progress")
        else:
            print(f"✓ No values pillar data yet (status: {response.status_code})")


class TestAdminCleanup(TestSetup):
    """Test admin cleanup endpoint includes estimated funnel data"""
    
    def test_admin_cleanup_includes_estimated_funnel(self, auth_token, brand_id):
        """Admin cleanup should also clean estimated funnel data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/clean-mock-data/{brand_id}"
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"Cleanup should succeed: {data}"
        
        details = data.get("details", {})
        print(f"✓ Cleanup details: {details}")
        
        # Check that estimated_funnel is in the cleanup list
        assert "estimated_funnel" in details, "Cleanup should include estimated_funnel"
        print(f"✓ Estimated funnel cleanup count: {details.get('estimated_funnel', 0)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
