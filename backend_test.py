import requests
import sys
import json
from datetime import datetime

class LaBrandAPITester:
    def __init__(self, base_url="https://brand-os-preview.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.brand_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}")
        if details:
            print(f"   Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True, f"{details}, Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    self.log_test(name, True, details)
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"{details}, Error: {error_data}")
                except:
                    self.log_test(name, False, f"{details}, Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_register(self):
        """Test user registration"""
        test_email = f"teste_{datetime.now().strftime('%H%M%S')}@labrand.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": test_email,
                "password": "senha123",
                "name": "Teste User",
                "role": "estrategista"
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user_id')
            return True
        return False

    def test_login(self):
        """Test user login with provided credentials"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": "teste@labrand.com",
                "password": "senha123"
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response.get('user_id')
            return True
        return False

    def test_get_current_user(self):
        """Test get current user endpoint"""
        success, response = self.run_test("Get Current User", "GET", "auth/me", 200)
        return success

    def test_create_brand(self):
        """Test brand creation"""
        success, response = self.run_test(
            "Create Brand",
            "POST",
            "brands",
            200,
            data={
                "name": f"Marca Teste {datetime.now().strftime('%H%M%S')}",
                "description": "Uma marca de teste para validação da API",
                "industry": "Tecnologia"
            }
        )
        
        if success and 'brand_id' in response:
            self.brand_id = response['brand_id']
            return True
        return False

    def test_get_brands(self):
        """Test get brands list"""
        return self.run_test("Get Brands List", "GET", "brands", 200)

    def test_get_brand_metrics(self):
        """Test get brand metrics"""
        if not self.brand_id:
            self.log_test("Get Brand Metrics", False, "No brand_id available")
            return False
        
        return self.run_test("Get Brand Metrics", "GET", f"brands/{self.brand_id}/metrics", 200)

    def test_pillar_start(self):
        """Test pillar start operations"""
        if not self.brand_id:
            self.log_test("Pillar Start Operations", False, "No brand_id available")
            return False
        
        # Get pillar start data
        get_success, _ = self.run_test("Get Pillar Start", "GET", f"brands/{self.brand_id}/pillars/start", 200)
        
        # Update pillar start data
        update_success, _ = self.run_test(
            "Update Pillar Start",
            "PUT",
            f"brands/{self.brand_id}/pillars/start",
            200,
            data={
                "desafio": "Teste de desafio da marca",
                "background": "Background da marca teste",
                "urgencia": "Alta urgência para posicionamento"
            }
        )
        
        return get_success and update_success

    def test_tasks(self):
        """Test task operations"""
        if not self.brand_id:
            self.log_test("Task Operations", False, "No brand_id available")
            return False
        
        # Get tasks
        get_success, _ = self.run_test("Get Tasks", "GET", f"brands/{self.brand_id}/tasks", 200)
        
        # Create task
        create_success, task_response = self.run_test(
            "Create Task",
            "POST",
            f"brands/{self.brand_id}/tasks",
            200,
            data={
                "title": "Tarefa de teste",
                "description": "Descrição da tarefa de teste",
                "status": "backlog",
                "priority": "high",
                "pillar": "start"
            }
        )
        
        return get_success and create_success

    def test_decisions(self):
        """Test decision operations"""
        if not self.brand_id:
            self.log_test("Decision Operations", False, "No brand_id available")
            return False
        
        # Get decisions
        get_success, _ = self.run_test("Get Decisions", "GET", f"brands/{self.brand_id}/decisions", 200)
        
        # Create decision
        create_success, _ = self.run_test(
            "Create Decision",
            "POST",
            f"brands/{self.brand_id}/decisions",
            200,
            data={
                "title": "Decisão de teste",
                "contexto": "Contexto da decisão de teste",
                "hipoteses": ["Hipótese 1", "Hipótese 2"],
                "evidencias": ["Evidência 1", "Evidência 2"],
                "status": "pending"
            }
        )
        
        return get_success and create_success

    def test_ai_insights(self):
        """Test AI insights generation"""
        success, response = self.run_test(
            "Generate AI Insights",
            "POST",
            "ai/insights",
            200,
            data={
                "context": "Teste de contexto para geração de insights",
                "pillar": "values",
                "brand_name": "Marca Teste"
            }
        )
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting LaBrand API Tests...")
        print(f"📍 Base URL: {self.base_url}")
        print("-" * 60)

        # Test root endpoint
        self.test_root_endpoint()

        # Test authentication flow
        if not self.test_register():
            # If registration fails, try login with existing credentials
            if not self.test_login():
                print("❌ Authentication failed, stopping tests")
                return False

        # Test auth/me endpoint
        self.test_get_current_user()

        # Test brand operations
        if not self.test_create_brand():
            print("❌ Brand creation failed, stopping brand-related tests")
        else:
            self.test_get_brands()
            self.test_get_brand_metrics()
            self.test_pillar_start()
            self.test_tasks()
            self.test_decisions()

        # Test AI insights (requires auth but not brand)
        self.test_ai_insights()

        # Print summary
        print("-" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = LaBrandAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            "summary": {
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
                "timestamp": datetime.now().isoformat()
            },
            "test_results": tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())