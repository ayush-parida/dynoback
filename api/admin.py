import json
import uuid
import base64
import time    
import re
import datetime
import os
from api.api import api_route
class AdminManagementSystem:
    def __init__(self, file_path, config):
        # Initialize with file path for admin data and configuration
        self.file_path = file_path
        self.config = config
    
    def _read_admins(self):
        # Read admin data from file, handle if file does not exist
        if not os.path.exists(self.file_path):
            # If file doesn't exist, create an empty file with empty admin list
            with open(self.file_path, 'w') as file:
                json.dump({"admins": []}, file)
            return []

        with open(self.file_path, 'r') as file:
            try:
                return json.load(file)['admins']
            except json.JSONDecodeError:
                # Handle case where file is empty or has invalid JSON
                return []

    def _write_admins(self, admins):
        # Write updated admin data to file, will create file if it doesn't exist
        with open(self.file_path, 'w') as file:
            json.dump({"admins": admins}, file, indent=4)

    @staticmethod
    def is_valid_email(email):
        # Validate email format using regex
        pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        return re.match(pattern, email) is not None
    
    def login(self, email, password):
        # Authenticate admin and return a token if valid
        admins = self._read_admins()
        for admin in admins:
            if admin['email'] == email and admin['password'] == password and admin['isActive']:
                token_data = f"{email}:{time.time()}"
                encoded_token = base64.b64encode(token_data.encode()).decode()
                return {"success": True, "token": encoded_token}
        return {"success": False, "message": "Invalid credentials or admin not active"}

    def validate_token(self, token):
        # Validate the provided token
        try:
            token = token.split('Bearer ')[1]
            decoded_data = base64.b64decode(token).decode()
            email, timestamp = decoded_data.split(':')
            timestamp = float(timestamp)

            if time.time() - timestamp > self.config['adminTokenExpiry']:
                return False

            return True
        except Exception:
            return False

    def get_all_active_admins(self):
        # Retrieve all active admins
        admins = self._read_admins()
        return [admin for admin in admins if admin['isActive']]

    def add_admin(self, new_admin, creator_email):
        # Add a new admin
        admins = self._read_admins()

        mandatory_fields = ['email', 'password', 'avatar']
        missing_fields = [field for field in mandatory_fields if not new_admin.get(field)]
        if missing_fields:
            return {"success": False, "message": f"Mandatory fields missing: {', '.join(missing_fields)}"}

        if not self.is_valid_email(new_admin['email']):
            return {"success": False, "message": "Invalid email format"}

        if any(admin['email'] == new_admin['email'] for admin in admins):
            return {"success": False, "message": "Email already exists"}

        new_admin['id'] = str(uuid.uuid4())
        new_admin['isActive'] = True
        new_admin['createdBy'] = creator_email
        new_admin['isSuper'] = False
        current_time = datetime.datetime.now().isoformat()
        new_admin['created'] = new_admin['updated'] = current_time

        admins.append(new_admin)
        self._write_admins(admins)

        return {"success": True, "message": "Admin added successfully", "id": new_admin['id']}

    def edit_admin(self, admin_id, updated_admin):
        # Edit an existing admin
        admins = self._read_admins()

        mandatory_fields = ['email', 'password', 'avatar']
        for field in mandatory_fields:
            if field in updated_admin and not updated_admin[field]:
                return {"success": False, "message": f"Field '{field}' cannot be empty"}

        if 'email' in updated_admin and not self.is_valid_email(updated_admin['email']):
            return {"success": False, "message": "Invalid email format"}

        for admin in admins:
            if admin['id'] == admin_id and admin['isActive']:
                updated_admin.pop('id', None)
                updated_admin.pop('isActive', None)
                updated_admin.pop('createdBy', None)
                updated_admin.pop('isSuper', None)
                updated_admin.pop('created', None)
                updated_admin['updated'] = datetime.datetime.now().isoformat()

                admin.update(updated_admin)
                self._write_admins(admins)
                return {"success": True, "message": "Admin updated successfully"}
        return {"success": False, "message": "Admin not found or not active"}

    def permanent_delete_admin(self, admin_id):
        # Permanently delete an admin
        admins = self._read_admins()
        admins = [admin for admin in admins if not (admin['id'] == admin_id and not admin['isSuper'])]
        
        if len(admins) == len(self._read_admins()):
            return {"success": False, "message": "Admin not found or is a super admin"}
        
        self._write_admins(admins)
        return {"success": True, "message": "Admin deleted successfully"}
    
    def soft_delete_admin(self, admin_id):
        # Deactivate an admin
        admins = self._read_admins()
        for admin in admins:
            if admin['id'] == admin_id:
                if admin['isSuper']:
                    return {"success": False, "message": "Cannot deactivate a super admin"}

                admin['isActive'] = False
                admin['updated'] = datetime.datetime.now().isoformat()
                self._write_admins(admins)
                return {"success": True, "message": "Admin deactivated successfully"}

        return {"success": False, "message": "Admin not found"}
    

file_path = 'admins.json'
def loadAdminApi(config):
    admin_system = AdminManagementSystem(file_path, config)
    
    @api_route('/api/login', 'POST')
    def login_route(body):
        return admin_system.login(body['email'], body['password'])

    @api_route('/api/admins', 'GET')
    def get_all_active_admins(headers):
        if not admin_system.validate_token(headers['Authorization']):
            return {"success": False, "message": "Invalid or expired token"}
        return admin_system.get_all_active_admins()

    @api_route('/api/admins', 'POST')
    def add_admin_route(body, headers):
        if not admin_system.validate_token(headers['Authorization']):
            return {"success": False, "message": "Invalid or expired token"}
        new_admin = body
        return admin_system.add_admin(new_admin, '')

    @api_route('/api/admins/<admin_id>', 'PUT')  # or 'PATCH'
    def edit_admin_route(admin_id, request, headers):
        if not admin_system.validate_token(headers['Authorization']):
            return {"success": False, "message": "Invalid or expired token"}
        updated_admin = request
        return admin_system.edit_admin(admin_id, updated_admin)

    @api_route('/api/admins/<admin_id>', 'DELETE')
    def delete_admin_route(admin_id, headers):
        if not admin_system.validate_token(headers['Authorization']):
            return {"success": False, "message": "Invalid or expired token"}
        return admin_system.soft_delete_admin(admin_id)

