"""
LaBrand Backend Tests - Pytest Configuration
"""
import pytest
import asyncio

pytest_plugins = ['pytest_asyncio']

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()
