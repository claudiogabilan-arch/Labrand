"""
Bridge file - Imports app from server_new.py
This file exists because the supervisor config points to server:app
"""
from server_new import app

# Re-export app for uvicorn
__all__ = ["app"]
