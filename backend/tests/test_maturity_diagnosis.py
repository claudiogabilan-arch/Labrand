"""
Test suite for Maturity Diagnosis Module
Tests: Login, Dimensions endpoint, Save/Get diagnosis, AI recommendations, Credits deduction
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://labrand-staging-4.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@labrand.com"
TEST_PASSWORD = "password123"
TEST_BRAND_ID = "brand_92bcc15a44fb"


class TestMaturityDiagnosisModule:
    """Test suite for Maturity Diagnosis endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            self.user_id = login_response.json().get("user_id")
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    # ==================== LOGIN TEST ====================
    def test_01_login_success(self):
        """Test login with demo credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Token missing from login response"
        assert "user_id" in data, "user_id missing from login response"
        assert "email" in data, "email missing from login response"
        assert data["email"] == TEST_EMAIL
        print(f"✓ Login successful for {TEST_EMAIL}")
    
    # ==================== PLANS ENDPOINT TEST ====================
    def test_02_plans_endpoint_trial_days(self):
        """Test GET /api/plans returns trial_days: 7"""
        response = self.session.get(f"{BASE_URL}/api/plans")
        
        assert response.status_code == 200, f"Plans endpoint failed: {response.text}"
        data = response.json()
        
        # Verify trial_days is 7
        assert "trial_days" in data, "trial_days missing from plans response"
        assert data["trial_days"] == 7, f"Expected trial_days=7, got {data['trial_days']}"
        
        # Verify plans structure
        assert "plans" in data, "plans missing from response"
        assert len(data["plans"]) > 0, "No plans returned"
        print(f"✓ Plans endpoint returns trial_days: {data['trial_days']}")
    
    # ==================== MATURITY DIMENSIONS TEST ====================
    def test_03_maturity_dimensions_endpoint(self):
        """Test GET /api/maturity/dimensions returns 6 dimensions"""
        response = self.session.get(f"{BASE_URL}/api/maturity/dimensions")
        
        assert response.status_code == 200, f"Dimensions endpoint failed: {response.text}"
        data = response.json()
        
        # Verify dimensions structure
        assert "dimensions" in data, "dimensions key missing from response"
        dimensions = data["dimensions"]
        
        # Should have 6 dimensions
        assert len(dimensions) == 6, f"Expected 6 dimensions, got {len(dimensions)}"
        
        # Verify expected dimension keys
        expected_dimensions = ["estrategia", "identidade", "comunicacao", "experiencia", "cultura", "metricas"]
        for dim_key in expected_dimensions:
            assert dim_key in dimensions, f"Missing dimension: {dim_key}"
            
            # Verify each dimension has required fields
            dim = dimensions[dim_key]
            assert "name" in dim, f"Dimension {dim_key} missing 'name'"
            assert "description" in dim, f"Dimension {dim_key} missing 'description'"
            assert "questions" in dim, f"Dimension {dim_key} missing 'questions'"
            assert len(dim["questions"]) == 5, f"Dimension {dim_key} should have 5 questions"
        
        print(f"✓ Maturity dimensions endpoint returns {len(dimensions)} dimensions with proper structure")
    
    # ==================== SAVE MATURITY DIAGNOSIS TEST ====================
    def test_04_save_maturity_diagnosis(self):
        """Test POST /api/brands/{brand_id}/maturity-diagnosis"""
        # Sample diagnosis data
        sample_answers = {
            "0": 3, "1": 2, "2": 4, "3": 3, "4": 2,
            "5": 3, "6": 4, "7": 3, "8": 2, "9": 3,
            "10": 2, "11": 3, "12": 4, "13": 3, "14": 2
        }
        
        sample_results = {
            "overall_score": 65,
            "maturity_level": {
                "level": "Gerenciada",
                "color": "bg-blue-500",
                "description": "Gestão de marca estruturada"
            },
            "dimension_scores": {
                "clareza": 70,
                "consistencia": 65,
                "comunicacao": 60,
                "diferenciacao": 55,
                "conexao": 75
            },
            "priorities": [
                {"id": "diferenciacao", "name": "Diferenciação", "score": 55},
                {"id": "comunicacao", "name": "Comunicação", "score": 60},
                {"id": "consistencia", "name": "Consistência", "score": 65}
            ],
            "strengths": [
                {"id": "conexao", "name": "Conexão com Público", "score": 75},
                {"id": "clareza", "name": "Clareza Estratégica", "score": 70}
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/maturity-diagnosis",
            json={"answers": sample_answers, "results": sample_results}
        )
        
        assert response.status_code == 200, f"Save diagnosis failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "brand_id" in data, "brand_id missing from response"
        assert data["brand_id"] == TEST_BRAND_ID
        assert "answers" in data, "answers missing from response"
        assert "results" in data, "results missing from response"
        assert "created_at" in data, "created_at missing from response"
        
        print(f"✓ Maturity diagnosis saved successfully for brand {TEST_BRAND_ID}")
    
    # ==================== GET MATURITY DIAGNOSIS TEST ====================
    def test_05_get_maturity_diagnosis(self):
        """Test GET /api/brands/{brand_id}/maturity-diagnosis"""
        response = self.session.get(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/maturity-diagnosis"
        )
        
        assert response.status_code == 200, f"Get diagnosis failed: {response.text}"
        data = response.json()
        
        # Verify data was persisted
        assert "brand_id" in data, "brand_id missing from response"
        assert data["brand_id"] == TEST_BRAND_ID
        assert "answers" in data, "answers missing from response"
        assert "results" in data, "results missing from response"
        
        # Verify results structure
        results = data["results"]
        assert "overall_score" in results, "overall_score missing from results"
        assert "dimension_scores" in results, "dimension_scores missing from results"
        
        print(f"✓ Maturity diagnosis retrieved successfully - Score: {results.get('overall_score')}%")
    
    # ==================== AI CREDITS BALANCE TEST ====================
    def test_06_ai_credits_balance(self):
        """Test GET /api/ai-credits/balance"""
        response = self.session.get(f"{BASE_URL}/api/ai-credits/balance")
        
        assert response.status_code == 200, f"Credits balance failed: {response.text}"
        data = response.json()
        
        # Verify balance structure
        assert "total_credits" in data, "total_credits missing"
        assert "used_credits" in data, "used_credits missing"
        assert "available_credits" in data, "available_credits missing"
        
        print(f"✓ AI Credits balance: {data['available_credits']} available / {data['total_credits']} total")
        
        # Store initial balance for later comparison
        self.initial_credits = data["available_credits"]
        return data["available_credits"]
    
    # ==================== AI RECOMMENDATIONS TEST ====================
    def test_07_maturity_recommendations_ai(self):
        """Test POST /api/brands/{brand_id}/maturity-diagnosis/recommendations (deducts 1 credit)"""
        # First get current credits
        balance_response = self.session.get(f"{BASE_URL}/api/ai-credits/balance")
        initial_credits = balance_response.json().get("available_credits", 0)
        
        # Request AI recommendations
        response = self.session.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/maturity-diagnosis/recommendations",
            json={}
        )
        
        # Check if we have enough credits
        if response.status_code == 402:
            print(f"⚠ Insufficient credits for AI recommendations (402)")
            pytest.skip("Insufficient credits - need to reset credits")
        
        assert response.status_code == 200, f"Recommendations failed: {response.text}"
        data = response.json()
        
        # Verify recommendations structure
        assert "summary" in data, "summary missing from recommendations"
        assert "priority_actions" in data, "priority_actions missing"
        assert "quick_wins" in data, "quick_wins missing"
        assert "roadmap" in data, "roadmap missing"
        assert "credits_used" in data, "credits_used missing"
        
        # Verify credit deduction
        assert data["credits_used"] == 1, f"Expected 1 credit used, got {data['credits_used']}"
        
        # Verify credits were actually deducted
        new_balance_response = self.session.get(f"{BASE_URL}/api/ai-credits/balance")
        new_credits = new_balance_response.json().get("available_credits", 0)
        
        assert new_credits == initial_credits - 1, f"Credits not deducted properly. Expected {initial_credits - 1}, got {new_credits}"
        
        print(f"✓ AI Recommendations generated successfully (1 credit deducted)")
        print(f"  Summary: {data['summary'][:100]}...")
    
    # ==================== AI CREDITS HISTORY TEST ====================
    def test_08_ai_credits_history(self):
        """Test GET /api/ai-credits/history"""
        response = self.session.get(f"{BASE_URL}/api/ai-credits/history")
        
        assert response.status_code == 200, f"Credits history failed: {response.text}"
        data = response.json()
        
        # History endpoint returns {"history": [...]}
        assert "history" in data, "history key missing from response"
        history = data["history"]
        assert isinstance(history, list), "History should be a list"
        
        if len(history) > 0:
            # Verify history entry structure
            entry = history[0]
            assert "action" in entry, "action missing from history entry"
            assert "credits" in entry, "credits missing from history entry"
            assert "created_at" in entry, "created_at missing from history entry"
            
            print(f"✓ AI Credits history retrieved - {len(history)} entries")
        else:
            print(f"✓ AI Credits history retrieved - empty (no transactions yet)")
    
    # ==================== UNAUTHORIZED ACCESS TESTS ====================
    def test_09_unauthorized_dimensions(self):
        """Test unauthorized access to maturity dimensions"""
        response = requests.get(f"{BASE_URL}/api/maturity/dimensions")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthorized access to dimensions returns 401")
    
    def test_10_unauthorized_diagnosis(self):
        """Test unauthorized access to maturity diagnosis"""
        response = requests.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/maturity-diagnosis")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthorized access to diagnosis returns 401")
    
    def test_11_unauthorized_recommendations(self):
        """Test unauthorized access to recommendations"""
        response = requests.post(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/maturity-diagnosis/recommendations")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthorized access to recommendations returns 401")


class TestMaturityDimensionsStructure:
    """Detailed tests for maturity dimensions structure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip("Login failed")
    
    def test_dimension_questions_have_weights(self):
        """Verify all questions have weight property"""
        response = self.session.get(f"{BASE_URL}/api/maturity/dimensions")
        dimensions = response.json()["dimensions"]
        
        for dim_key, dim in dimensions.items():
            for question in dim["questions"]:
                assert "id" in question, f"Question in {dim_key} missing 'id'"
                assert "text" in question, f"Question in {dim_key} missing 'text'"
                assert "weight" in question, f"Question in {dim_key} missing 'weight'"
                assert isinstance(question["weight"], (int, float)), f"Weight should be numeric"
        
        print("✓ All dimension questions have proper structure with weights")
    
    def test_total_questions_count(self):
        """Verify total number of questions (6 dimensions x 5 questions = 30)"""
        response = self.session.get(f"{BASE_URL}/api/maturity/dimensions")
        dimensions = response.json()["dimensions"]
        
        total_questions = sum(len(dim["questions"]) for dim in dimensions.values())
        assert total_questions == 30, f"Expected 30 questions, got {total_questions}"
        
        print(f"✓ Total questions count: {total_questions}")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
