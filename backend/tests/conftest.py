"""
LaBrand Backend Tests - Pytest Configuration
"""
import pytest
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Test database configuration
TEST_MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
TEST_DB_NAME = os.environ.get('DB_NAME', 'labrand_test')

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_db():
    """Create test database connection"""
    client = AsyncIOMotorClient(TEST_MONGO_URL)
    db = client[TEST_DB_NAME]
    yield db
    # Cleanup after all tests
    await client.drop_database(TEST_DB_NAME)
    client.close()

@pytest.fixture
def api_headers():
    """Common API headers"""
    return {"Content-Type": "application/json"}
