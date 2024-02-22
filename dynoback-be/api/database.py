import json
import uuid
import base64
import time    
import re
import datetime
import os
from api.api import api_route
from api.admin import AdminManagementSystem

class DatabaseManagement:
    def __init__(self, config):
        self.config = config
        
    def get_databases(self):
        return {"status": 200, "response": self.config['dbs']}
        
def loadDatabaseApi(config):
    databases = DatabaseManagement(config)
    admin_system = AdminManagementSystem(config)
    
    @api_route('/databases', 'GET')
    def get_databases(headers):
        decoded_token = admin_system.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        return databases.get_databases()