"""
Test Brand Valuation and Brand Architecture APIs
Iteration 31: Testing new modules for brand valuation (4-step wizard) and architecture management
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"
BRAND_ID = "brand_0902ead1b80c"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# ============ VALUATION SECTORS API ============

class TestValuationSectors:
    """Test GET /api/valuation/sectors - returns 8 sectors with multiples"""
    
    def test_get_sectors_returns_8_sectors(self):
        """Verify sectors endpoint returns 8 sectors"""
        response = requests.get(f"{BASE_URL}/api/valuation/sectors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "sectors" in data, "Response should contain 'sectors' key"
        assert len(data["sectors"]) == 8, f"Expected 8 sectors, got {len(data['sectors'])}"
    
    def test_sectors_have_required_fields(self):
        """Verify each sector has key, label, and mult fields"""
        response = requests.get(f"{BASE_URL}/api/valuation/sectors")
        data = response.json()
        
        expected_keys = ["servicos", "saas", "varejo", "industria", "saude", "agro", "educacao", "outro"]
        actual_keys = [s["key"] for s in data["sectors"]]
        
        for key in expected_keys:
            assert key in actual_keys, f"Missing sector: {key}"
        
        for sector in data["sectors"]:
            assert "key" in sector, "Sector missing 'key'"
            assert "label" in sector, "Sector missing 'label'"
            assert "mult" in sector, "Sector missing 'mult'"
            assert "b" in sector["mult"], "Mult missing base 'b'"
            assert "min" in sector["mult"], "Mult missing 'min'"
            assert "max" in sector["mult"], "Mult missing 'max'"


# ============ VALUATION CRUD APIs ============

class TestValuationCRUD:
    """Test Brand Valuation CRUD operations"""
    
    created_valuation_id = None
    
    def test_create_valuation_with_computed_results(self, auth_headers):
        """POST /api/brands/{brand_id}/valuations - creates valuation with computed results"""
        payload = {
            "brand_id": BRAND_ID,
            "marca": "TEST_Marca_Valuation",
            "setor": "saas",
            "receita": 10000000,  # 10M
            "ebitda": 2000000,    # 2M (20% margin)
            "divida": 500000,     # 500K
            "crescimento": 2,     # Alto
            "recorrencia": 3,     # Alta
            "metodo": "mult",
            "rbi_q1": 75, "rbi_q2": 75, "rbi_q3": 75, "rbi_q4": 75, "rbi_q5": 75,
            "bs_clareza": 70, "bs_comprom": 70, "bs_governa": 70, "bs_respons": 70, "bs_autent": 70,
            "bs_relev": 70, "bs_diferenc": 70, "bs_consist": 70, "bs_presenca": 70, "bs_engaj": 70
        }
        
        response = requests.post(
            f"{BASE_URL}/api/brands/{BRAND_ID}/valuations",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify computed fields exist
        assert "valuation_id" in data, "Response missing valuation_id"
        assert "multiplo_final" in data, "Response missing multiplo_final"
        assert "ev_min" in data, "Response missing ev_min"
        assert "ev_mid" in data, "Response missing ev_mid"
        assert "ev_max" in data, "Response missing ev_max"
        assert "rbi_score" in data, "Response missing rbi_score"
        assert "bs_score" in data, "Response missing bs_score"
        assert "brand_min" in data, "Response missing brand_min"
        assert "brand_mid" in data, "Response missing brand_mid"
        assert "brand_max" in data, "Response missing brand_max"
        assert "brand_share_pct" in data, "Response missing brand_share_pct"
        
        # Verify RBI score calculation (average of 5 questions at 75 each = 75)
        assert data["rbi_score"] == 75, f"Expected RBI score 75, got {data['rbi_score']}"
        
        # Verify BS score calculation (average of 10 factors at 70 each = 70)
        assert data["bs_score"] == 70, f"Expected BS score 70, got {data['bs_score']}"
        
        # Store for later tests
        TestValuationCRUD.created_valuation_id = data["valuation_id"]
        print(f"Created valuation: {data['valuation_id']}")
    
    def test_list_valuations(self, auth_headers):
        """GET /api/brands/{brand_id}/valuations - lists valuations"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/valuations",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Should contain our created valuation
        if TestValuationCRUD.created_valuation_id:
            val_ids = [v.get("valuation_id") for v in data]
            assert TestValuationCRUD.created_valuation_id in val_ids, "Created valuation not in list"
    
    def test_get_single_valuation(self, auth_headers):
        """GET /api/brands/{brand_id}/valuations/{id} - get single valuation"""
        if not TestValuationCRUD.created_valuation_id:
            pytest.skip("No valuation created")
        
        response = requests.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/valuations/{TestValuationCRUD.created_valuation_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["valuation_id"] == TestValuationCRUD.created_valuation_id
        assert data["marca"] == "TEST_Marca_Valuation"
    
    def test_delete_valuation(self, auth_headers):
        """DELETE /api/brands/{brand_id}/valuations/{id} - deletes valuation"""
        if not TestValuationCRUD.created_valuation_id:
            pytest.skip("No valuation created")
        
        response = requests.delete(
            f"{BASE_URL}/api/brands/{BRAND_ID}/valuations/{TestValuationCRUD.created_valuation_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("deleted") == True
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/valuations/{TestValuationCRUD.created_valuation_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404, "Deleted valuation should return 404"
    
    def test_valuation_requires_auth(self):
        """Verify valuation endpoints require authentication"""
        # List without auth
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/valuations")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
        # Create without auth
        response = requests.post(
            f"{BASE_URL}/api/brands/{BRAND_ID}/valuations",
            json={"brand_id": BRAND_ID, "marca": "Test"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


# ============ BRAND ARCHITECTURE APIs ============

class TestBrandArchitecture:
    """Test Brand Architecture CRUD operations"""
    
    created_product_id = None
    
    def test_get_architecture_returns_default(self, auth_headers):
        """GET /api/brands/{brand_id}/architecture - returns architecture data"""
        response = requests.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/architecture",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "brand_id" in data, "Response missing brand_id"
        assert "arch_type" in data, "Response missing arch_type"
        assert "products" in data, "Response missing products"
    
    def test_update_architecture_type(self, auth_headers):
        """PUT /api/brands/{brand_id}/architecture - updates arch_type"""
        payload = {"arch_type": "mono"}
        
        response = requests.put(
            f"{BASE_URL}/api/brands/{BRAND_ID}/architecture",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["arch_type"] == "mono", f"Expected arch_type 'mono', got {data['arch_type']}"
        
        # Update to endo
        payload = {"arch_type": "endo"}
        response = requests.put(
            f"{BASE_URL}/api/brands/{BRAND_ID}/architecture",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["arch_type"] == "endo"
        
        # Update to ind
        payload = {"arch_type": "ind"}
        response = requests.put(
            f"{BASE_URL}/api/brands/{BRAND_ID}/architecture",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["arch_type"] == "ind"
    
    def test_update_global_presence(self, auth_headers):
        """PUT /api/brands/{brand_id}/architecture - updates hq_country and global_ops"""
        payload = {
            "hq_country": "BR",
            "global_ops": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/brands/{BRAND_ID}/architecture",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["hq_country"] == "BR"
        assert data["global_ops"] == True
    
    def test_add_product(self, auth_headers):
        """POST /api/brands/{brand_id}/architecture/products - adds a product"""
        payload = {
            "name": "TEST_Produto_Arquitetura",
            "type": "produto",
            "relation": "extensao",
            "ticket_medio": 150.0,
            "channel": "online",
            "markets": ["BR", "PT"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/brands/{BRAND_ID}/architecture/products",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "product_id" in data, "Response missing product_id"
        assert data["name"] == "TEST_Produto_Arquitetura"
        assert data["type"] == "produto"
        assert data["relation"] == "extensao"
        
        TestBrandArchitecture.created_product_id = data["product_id"]
        print(f"Created product: {data['product_id']}")
    
    def test_product_appears_in_architecture(self, auth_headers):
        """Verify added product appears in architecture GET"""
        if not TestBrandArchitecture.created_product_id:
            pytest.skip("No product created")
        
        response = requests.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/architecture",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        product_ids = [p.get("product_id") for p in data.get("products", [])]
        assert TestBrandArchitecture.created_product_id in product_ids, "Created product not in architecture"
    
    def test_remove_product(self, auth_headers):
        """DELETE /api/brands/{brand_id}/architecture/products/{id} - removes product"""
        if not TestBrandArchitecture.created_product_id:
            pytest.skip("No product created")
        
        response = requests.delete(
            f"{BASE_URL}/api/brands/{BRAND_ID}/architecture/products/{TestBrandArchitecture.created_product_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("deleted") == True
        
        # Verify removal
        get_response = requests.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/architecture",
            headers=auth_headers
        )
        product_ids = [p.get("product_id") for p in get_response.json().get("products", [])]
        assert TestBrandArchitecture.created_product_id not in product_ids, "Product should be removed"
    
    def test_architecture_requires_auth(self):
        """Verify architecture endpoints require authentication"""
        # Get without auth
        response = requests.get(f"{BASE_URL}/api/brands/{BRAND_ID}/architecture")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
        # Update without auth
        response = requests.put(
            f"{BASE_URL}/api/brands/{BRAND_ID}/architecture",
            json={"arch_type": "mono"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
        # Add product without auth
        response = requests.post(
            f"{BASE_URL}/api/brands/{BRAND_ID}/architecture/products",
            json={"name": "Test"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


# ============ VALUATION COMPUTATION TESTS ============

class TestValuationComputation:
    """Test valuation computation logic"""
    
    def test_low_margin_adjustment(self, auth_headers):
        """Test that low margin (<8%) reduces multiple"""
        payload = {
            "brand_id": BRAND_ID,
            "marca": "TEST_LowMargin",
            "setor": "outro",
            "receita": 10000000,
            "ebitda": 500000,  # 5% margin
            "divida": 0,
            "crescimento": 1,
            "recorrencia": 2
        }
        
        response = requests.post(
            f"{BASE_URL}/api/brands/{BRAND_ID}/valuations",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Base multiple for 'outro' is 4.5, low margin should reduce it
        assert data["multiplo_final"] < 4.5, f"Low margin should reduce multiple, got {data['multiplo_final']}"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/brands/{BRAND_ID}/valuations/{data['valuation_id']}",
            headers=auth_headers
        )
    
    def test_high_margin_adjustment(self, auth_headers):
        """Test that high margin (>=28%) increases multiple"""
        payload = {
            "brand_id": BRAND_ID,
            "marca": "TEST_HighMargin",
            "setor": "outro",
            "receita": 10000000,
            "ebitda": 3000000,  # 30% margin
            "divida": 0,
            "crescimento": 1,
            "recorrencia": 2
        }
        
        response = requests.post(
            f"{BASE_URL}/api/brands/{BRAND_ID}/valuations",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Base multiple for 'outro' is 4.5, high margin should increase it
        assert data["multiplo_final"] > 4.5, f"High margin should increase multiple, got {data['multiplo_final']}"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/brands/{BRAND_ID}/valuations/{data['valuation_id']}",
            headers=auth_headers
        )
    
    def test_brand_value_calculation(self, auth_headers):
        """Test that brand value is calculated based on RBI and BS scores"""
        payload = {
            "brand_id": BRAND_ID,
            "marca": "TEST_BrandValue",
            "setor": "saas",
            "receita": 10000000,
            "ebitda": 2000000,
            "divida": 0,
            "crescimento": 1,
            "recorrencia": 2,
            "rbi_q1": 50, "rbi_q2": 50, "rbi_q3": 50, "rbi_q4": 50, "rbi_q5": 50,  # RBI = 50
            "bs_clareza": 50, "bs_comprom": 50, "bs_governa": 50, "bs_respons": 50, "bs_autent": 50,
            "bs_relev": 50, "bs_diferenc": 50, "bs_consist": 50, "bs_presenca": 50, "bs_engaj": 50  # BS = 50
        }
        
        response = requests.post(
            f"{BASE_URL}/api/brands/{BRAND_ID}/valuations",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["rbi_score"] == 50
        assert data["bs_score"] == 50
        
        # Brand value should be less than EV (since RBI < 100)
        assert data["brand_mid"] < data["ev_mid"], "Brand value should be less than EV"
        assert data["brand_mid"] > 0, "Brand value should be positive"
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/brands/{BRAND_ID}/valuations/{data['valuation_id']}",
            headers=auth_headers
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
