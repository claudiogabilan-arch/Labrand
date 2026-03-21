"""
Test Naming Module - CRUD operations for naming projects
Tests: POST, GET (list), GET (single), PUT (state update), DELETE
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@labrand.com.br"
ADMIN_PASSWORD = "Labrand@2026!"
BRAND_ID = "brand_0902ead1b80c"


class TestNamingModule:
    """Naming module CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        """Setup for each test"""
        self.client = api_client
        self.token = auth_token
        self.headers = {"Authorization": f"Bearer {auth_token}"}
        self.created_project_ids = []
    
    def test_list_naming_projects(self, api_client, auth_token):
        """Test GET /api/brands/{brand_id}/naming - List naming projects"""
        response = api_client.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "projects" in data, "Response should contain 'projects' key"
        assert isinstance(data["projects"], list), "Projects should be a list"
        print(f"✓ List naming projects: Found {len(data['projects'])} projects")
    
    def test_create_naming_project(self, api_client, auth_token):
        """Test POST /api/brands/{brand_id}/naming - Create naming project"""
        project_data = {
            "project_name": "TEST_Naming_Project",
            "state": {
                "step": 1,
                "project": {
                    "name": "TEST_Naming_Project",
                    "desc": "Test description for naming project",
                    "mission": "Test mission",
                    "audience": "Test audience",
                    "values": ["innovation", "quality"],
                    "competitors": "Competitor A, Competitor B",
                    "perceptions": ["Inovação", "Confiança"],
                    "tone": "Moderno",
                    "style": "Criativo / Inventado",
                    "language": "pt"
                },
                "archetype": "",
                "tension": "",
                "keywords": [],
                "generatedNames": [],
                "selectedNames": [],
                "evaluations": {},
                "provOpen": {"inspiracao": False, "construcao": False, "implementacao": False}
            }
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming",
            json=project_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "project_id" in data, "Response should contain 'project_id'"
        assert "brand_id" in data, "Response should contain 'brand_id'"
        assert "project_name" in data, "Response should contain 'project_name'"
        assert "state" in data, "Response should contain 'state'"
        assert "created_at" in data, "Response should contain 'created_at'"
        assert "updated_at" in data, "Response should contain 'updated_at'"
        
        # Verify data values
        assert data["brand_id"] == BRAND_ID
        assert data["project_name"] == "TEST_Naming_Project"
        assert data["project_id"].startswith("naming_")
        
        print(f"✓ Create naming project: {data['project_id']}")
        return data["project_id"]
    
    def test_get_naming_project(self, api_client, auth_token):
        """Test GET /api/brands/{brand_id}/naming/{project_id} - Get single project"""
        # First create a project
        project_data = {
            "project_name": "TEST_Get_Project",
            "state": {"step": 1, "project": {"name": "TEST_Get_Project", "desc": "Test", "audience": "Test"}}
        }
        create_response = api_client.post(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming",
            json=project_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert create_response.status_code == 200
        project_id = create_response.json()["project_id"]
        
        # Now get the project
        response = api_client.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming/{project_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "project" in data, "Response should contain 'project' key"
        project = data["project"]
        assert project["project_id"] == project_id
        assert project["project_name"] == "TEST_Get_Project"
        
        print(f"✓ Get naming project: {project_id}")
        
        # Cleanup
        api_client.delete(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming/{project_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_update_naming_project_state(self, api_client, auth_token):
        """Test PUT /api/brands/{brand_id}/naming/{project_id}/state - Update project state"""
        # First create a project
        project_data = {
            "project_name": "TEST_Update_Project",
            "state": {"step": 1, "project": {"name": "TEST_Update_Project", "desc": "Initial", "audience": "Test"}}
        }
        create_response = api_client.post(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming",
            json=project_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert create_response.status_code == 200
        project_id = create_response.json()["project_id"]
        
        # Update the state
        update_data = {
            "state": {
                "step": 2,
                "project": {"name": "TEST_Update_Project", "desc": "Updated description", "audience": "Updated audience"},
                "archetype": "mago",
                "tension": "Tradição vs Inovação",
                "keywords": ["magia", "transformação"],
                "generatedNames": [],
                "selectedNames": [],
                "evaluations": {},
                "provOpen": {"inspiracao": True, "construcao": False, "implementacao": False}
            },
            "project_name": "TEST_Update_Project_Renamed"
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming/{project_id}/state",
            json=update_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        # Verify the update by getting the project
        get_response = api_client.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming/{project_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 200
        project = get_response.json()["project"]
        assert project["state"]["step"] == 2
        assert project["state"]["archetype"] == "mago"
        assert project["project_name"] == "TEST_Update_Project_Renamed"
        
        print(f"✓ Update naming project state: {project_id}")
        
        # Cleanup
        api_client.delete(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming/{project_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_delete_naming_project(self, api_client, auth_token):
        """Test DELETE /api/brands/{brand_id}/naming/{project_id} - Delete project"""
        # First create a project
        project_data = {
            "project_name": "TEST_Delete_Project",
            "state": {"step": 1, "project": {"name": "TEST_Delete_Project", "desc": "To be deleted", "audience": "Test"}}
        }
        create_response = api_client.post(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming",
            json=project_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert create_response.status_code == 200
        project_id = create_response.json()["project_id"]
        
        # Delete the project
        response = api_client.delete(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming/{project_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify deletion by trying to get the project
        get_response = api_client.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming/{project_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 404, "Deleted project should return 404"
        
        print(f"✓ Delete naming project: {project_id}")
    
    def test_get_nonexistent_project(self, api_client, auth_token):
        """Test GET for non-existent project returns 404"""
        response = api_client.get(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming/nonexistent_project_id",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent project returns 404")
    
    def test_update_nonexistent_project(self, api_client, auth_token):
        """Test PUT for non-existent project returns 404"""
        update_data = {
            "state": {"step": 1},
            "project_name": "Test"
        }
        response = api_client.put(
            f"{BASE_URL}/api/brands/{BRAND_ID}/naming/nonexistent_project_id/state",
            json=update_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Update non-existent project returns 404")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        token = response.json().get("token")
        print(f"✓ Authentication successful")
        return token
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


# Cleanup fixture to remove test data after all tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed naming projects after tests"""
    yield
    # Cleanup after tests
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        return
    
    token = response.json().get("token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get all projects and delete TEST_ prefixed ones
    list_response = session.get(
        f"{BASE_URL}/api/brands/{BRAND_ID}/naming",
        headers=headers
    )
    if list_response.status_code == 200:
        projects = list_response.json().get("projects", [])
        for project in projects:
            if project.get("project_name", "").startswith("TEST_"):
                session.delete(
                    f"{BASE_URL}/api/brands/{BRAND_ID}/naming/{project['project_id']}",
                    headers=headers
                )
                print(f"Cleaned up: {project['project_id']}")
