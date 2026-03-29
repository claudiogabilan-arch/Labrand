"""
Test AI Credits Purchase (Stripe) and PDF Report Generation
Tests for iteration 17:
1. AI Credits page loads at /ai-credits with balance, packages and history
2. POST /api/ai-credits/purchase with package_id 'starter' and origin_url returns checkout_url and session_id
3. POST /api/ai-credits/purchase with invalid package_id returns 400 error
4. GET /api/ai-credits/balance returns available_credits, total_credits, used_credits
5. GET /api/ai-credits/history returns history array
6. POST /api/brands/{brand_id}/reports/executive-pdf generates PDF with correct content-type
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from iteration_16
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"
TEST_BRAND_ID = "brand_0902ead1b80c"


class TestAICreditsBalance:
    """Test AI Credits balance and history endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        
    def login(self):
        """Login and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return data
    
    def test_01_login_with_admin_user(self):
        """Test login with admin@labrand.com.br / Labrand@2026!"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Login failed with status {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert data.get("email") == ADMIN_EMAIL, f"Email mismatch: {data.get('email')}"
        
        print(f"✓ Login successful for {ADMIN_EMAIL}")
        
    def test_02_ai_credits_balance_returns_correct_structure(self):
        """Test GET /api/ai-credits/balance returns available_credits, total_credits, used_credits"""
        self.login()
        
        response = self.session.get(f"{BASE_URL}/api/ai-credits/balance")
        
        assert response.status_code == 200, f"Balance endpoint failed: {response.text}"
        
        data = response.json()
        
        # Verify all required fields are present
        assert "total_credits" in data, "total_credits not in response"
        assert "used_credits" in data, "used_credits not in response"
        assert "available_credits" in data, "available_credits not in response"
        
        # Verify data types
        assert isinstance(data["total_credits"], int), f"total_credits should be int, got {type(data['total_credits'])}"
        assert isinstance(data["used_credits"], int), f"used_credits should be int, got {type(data['used_credits'])}"
        assert isinstance(data["available_credits"], int), f"available_credits should be int, got {type(data['available_credits'])}"
        
        # Verify logical consistency
        assert data["available_credits"] == data["total_credits"] - data["used_credits"], \
            f"available_credits should equal total - used: {data['available_credits']} != {data['total_credits']} - {data['used_credits']}"
        
        print(f"✓ AI Credits Balance endpoint returns correct structure:")
        print(f"  total_credits: {data['total_credits']}")
        print(f"  used_credits: {data['used_credits']}")
        print(f"  available_credits: {data['available_credits']}")
        
    def test_03_ai_credits_history_returns_array(self):
        """Test GET /api/ai-credits/history returns history array"""
        self.login()
        
        response = self.session.get(f"{BASE_URL}/api/ai-credits/history")
        
        assert response.status_code == 200, f"History endpoint failed: {response.text}"
        
        data = response.json()
        
        # Verify history field exists and is an array
        assert "history" in data, "history not in response"
        assert isinstance(data["history"], list), f"history should be a list, got {type(data['history'])}"
        
        print(f"✓ AI Credits History endpoint returns array with {len(data['history'])} entries")
        
        # If there are entries, verify structure
        if data["history"]:
            entry = data["history"][0]
            print(f"  Sample entry keys: {list(entry.keys())}")


class TestAICreditsStripePurchase:
    """Test AI Credits purchase via Stripe - Fixed import from emergentintegrations.payments.stripe.checkout"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        
    def login(self):
        """Login and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return data
    
    def test_04_purchase_starter_package_returns_checkout_url(self):
        """Test POST /api/ai-credits/purchase with package_id 'starter' returns checkout_url and session_id"""
        self.login()
        
        response = self.session.post(
            f"{BASE_URL}/api/ai-credits/purchase",
            json={
                "package_id": "starter",
                "origin_url": "https://brand-integrations.preview.emergentagent.com"
            }
        )
        
        # This is the key test - the import fix should make this work
        assert response.status_code == 200, f"Purchase endpoint failed with {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify checkout_url and session_id are returned
        assert "checkout_url" in data, f"checkout_url not in response: {data}"
        assert "session_id" in data, f"session_id not in response: {data}"
        
        # Verify checkout_url is a valid Stripe URL
        assert data["checkout_url"].startswith("https://checkout.stripe.com"), \
            f"checkout_url should be Stripe URL: {data['checkout_url']}"
        
        # Verify session_id format (Stripe session IDs start with cs_)
        assert data["session_id"].startswith("cs_"), \
            f"session_id should start with 'cs_': {data['session_id']}"
        
        print(f"✓ Purchase endpoint returns checkout_url and session_id")
        print(f"  checkout_url: {data['checkout_url'][:60]}...")
        print(f"  session_id: {data['session_id']}")
        
    def test_05_purchase_pro_package_returns_checkout_url(self):
        """Test POST /api/ai-credits/purchase with package_id 'pro' returns checkout_url"""
        self.login()
        
        response = self.session.post(
            f"{BASE_URL}/api/ai-credits/purchase",
            json={
                "package_id": "pro",
                "origin_url": "https://brand-integrations.preview.emergentagent.com"
            }
        )
        
        assert response.status_code == 200, f"Purchase endpoint failed: {response.text}"
        
        data = response.json()
        assert "checkout_url" in data, "checkout_url not in response"
        assert "session_id" in data, "session_id not in response"
        
        print(f"✓ Pro package purchase returns checkout_url")
        
    def test_06_purchase_enterprise_package_returns_checkout_url(self):
        """Test POST /api/ai-credits/purchase with package_id 'enterprise' returns checkout_url"""
        self.login()
        
        response = self.session.post(
            f"{BASE_URL}/api/ai-credits/purchase",
            json={
                "package_id": "enterprise",
                "origin_url": "https://brand-integrations.preview.emergentagent.com"
            }
        )
        
        assert response.status_code == 200, f"Purchase endpoint failed: {response.text}"
        
        data = response.json()
        assert "checkout_url" in data, "checkout_url not in response"
        assert "session_id" in data, "session_id not in response"
        
        print(f"✓ Enterprise package purchase returns checkout_url")
        
    def test_07_purchase_invalid_package_returns_400(self):
        """Test POST /api/ai-credits/purchase with invalid package_id returns 400 error"""
        self.login()
        
        response = self.session.post(
            f"{BASE_URL}/api/ai-credits/purchase",
            json={
                "package_id": "invalid_package_xyz",
                "origin_url": "https://brand-integrations.preview.emergentagent.com"
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid package, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "detail not in error response"
        
        print(f"✓ Invalid package_id returns 400 error: {data['detail']}")
        
    def test_08_purchase_without_origin_url_returns_400(self):
        """Test POST /api/ai-credits/purchase without origin_url returns 400 error"""
        self.login()
        
        response = self.session.post(
            f"{BASE_URL}/api/ai-credits/purchase",
            json={
                "package_id": "starter"
                # Missing origin_url
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for missing origin_url, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "detail not in error response"
        
        print(f"✓ Missing origin_url returns 400 error: {data['detail']}")


class TestPDFReportGeneration:
    """Test PDF Report Generation - Enhanced with professional layout"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        
    def login(self):
        """Login and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return data
    
    def test_09_executive_pdf_returns_pdf_content_type(self):
        """Test POST /api/brands/{brand_id}/reports/executive-pdf returns application/pdf"""
        self.login()
        
        response = self.session.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/reports/executive-pdf",
            json={
                "sections": ["summary", "pillars", "score", "touchpoints", "recommendations"]
            }
        )
        
        assert response.status_code == 200, f"PDF generation failed: {response.status_code} - {response.text[:500]}"
        
        # Verify content type is PDF
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected application/pdf, got {content_type}"
        
        # Verify response body is not empty
        assert len(response.content) > 0, "PDF content is empty"
        
        # Verify PDF magic bytes (PDF files start with %PDF)
        assert response.content[:4] == b'%PDF', f"Response does not start with PDF magic bytes: {response.content[:10]}"
        
        # Verify Content-Disposition header for download
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition, f"Expected attachment disposition, got {content_disposition}"
        assert ".pdf" in content_disposition, f"Expected .pdf in filename: {content_disposition}"
        
        print(f"✓ PDF Report generated successfully")
        print(f"  Content-Type: {content_type}")
        print(f"  Content-Disposition: {content_disposition}")
        print(f"  PDF size: {len(response.content)} bytes")
        
    def test_10_executive_pdf_with_minimal_sections(self):
        """Test PDF generation with only summary section"""
        self.login()
        
        response = self.session.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/reports/executive-pdf",
            json={
                "sections": ["summary"]
            }
        )
        
        assert response.status_code == 200, f"PDF generation failed: {response.text[:500]}"
        assert "application/pdf" in response.headers.get("Content-Type", "")
        assert response.content[:4] == b'%PDF'
        
        print(f"✓ PDF with minimal sections generated ({len(response.content)} bytes)")
        
    def test_11_executive_pdf_invalid_brand_returns_404(self):
        """Test PDF generation with invalid brand_id returns 404"""
        self.login()
        
        response = self.session.post(
            f"{BASE_URL}/api/brands/invalid_brand_xyz/reports/executive-pdf",
            json={
                "sections": ["summary"]
            }
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid brand, got {response.status_code}"
        
        print(f"✓ Invalid brand_id returns 404")
        
    def test_12_report_history_endpoint(self):
        """Test GET /api/brands/{brand_id}/reports/history returns report list"""
        self.login()
        
        response = self.session.get(f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/reports/history")
        
        assert response.status_code == 200, f"Report history failed: {response.text}"
        
        data = response.json()
        assert "reports" in data, "reports not in response"
        assert "total" in data, "total not in response"
        assert isinstance(data["reports"], list), "reports should be a list"
        
        print(f"✓ Report history endpoint returns {data['total']} reports")


class TestAICreditsAuthentication:
    """Test authentication requirements for AI Credits endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session without authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_13_balance_requires_auth(self):
        """Test GET /api/ai-credits/balance requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/ai-credits/balance")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Balance endpoint requires authentication")
        
    def test_14_history_requires_auth(self):
        """Test GET /api/ai-credits/history requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/ai-credits/history")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ History endpoint requires authentication")
        
    def test_15_purchase_requires_auth(self):
        """Test POST /api/ai-credits/purchase requires authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/ai-credits/purchase",
            json={"package_id": "starter", "origin_url": "https://example.com"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Purchase endpoint requires authentication")
        
    def test_16_pdf_report_requires_auth(self):
        """Test POST /api/brands/{brand_id}/reports/executive-pdf requires authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/brands/{TEST_BRAND_ID}/reports/executive-pdf",
            json={"sections": ["summary"]}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ PDF report endpoint requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
