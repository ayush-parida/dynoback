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
                token_data = f"{email}:{time.time()}:{admin['uuid']}"
                encoded_token = base64.b64encode(token_data.encode()).decode()
                del admin['password']
                del admin['isActive']
                del admin['createdBy']
                del admin['isSuper']
                del admin['created']
                del admin['updated']
                return {"status": 200, "response": {"success": True, "token": encoded_token, "message": "Login Successful", "response": admin}}
        return {"status": 403, "response": {"success": False, "message": "Invalid credentials or admin not active", "message": "Incorrect Username or Password"}}

    def validate_token(self, token):
        # Validate the provided token
        try:
            token = token.split('Bearer ')[1]
            decoded_data = base64.b64decode(token).decode()
            email, timestamp, uuid = decoded_data.split(':')
            timestamp = float(timestamp)

            if time.time() - timestamp > self.config['adminTokenExpiry']:
                return {"status": False, "decoded": {}}

            return {"status": True, "decoded": {"email": email, "uuid": uuid}}
        except Exception:
            return {"status": False, "decoded": {}}

    def get_all_active_admins(self):
        # Retrieve all active admins
        admins = self._read_admins()
        return [admin for admin in admins if admin['isActive']]

    def add_admin(self, new_admin, creator_uuid):
        # Add a new admin
        admins = self._read_admins()

        mandatory_fields = ['email', 'password', 'avatar']
        missing_fields = [field for field in mandatory_fields if not new_admin.get(field)]
        if missing_fields:
            return {"status": 200, "response":{"success": False, "message": f"Mandatory fields missing: {', '.join(missing_fields)}"}}

        if not self.is_valid_email(new_admin['email']):
            return {"status": 200, "response":{"success": False, "message": "Invalid email format"}}

        if any(admin['email'] == new_admin['email'] for admin in admins):
            return {"status": 200, "response":{"success": False, "message": "Email already exists"}}

        new_admin['uuid'] = str(uuid.uuid4())
        new_admin['isActive'] = True
        new_admin['createdBy'] = creator_uuid
        new_admin['updatedBy'] = ""
        new_admin['isSuper'] = False
        current_time = datetime.datetime.now().isoformat()
        new_admin['created'] = new_admin['updated'] = current_time

        admins.append(new_admin)
        self._write_admins(admins)

        return {"status": 200, "response": {"success": True, "message": "Admin added successfully", "id": new_admin['uuid']}}

    def edit_admin(self, admin_id, updated_admin, updated_by_uuid):
        # Edit an existing admin
        admins = self._read_admins()

        mandatory_fields = ['email', 'password', 'avatar']
        for field in mandatory_fields:
            if field in updated_admin and not updated_admin[field]:
                return {"status": 200, "response":{"success": False, "message": f"Field '{field}' cannot be empty"}}

        if 'email' in updated_admin and not self.is_valid_email(updated_admin['email']):
            return {"status": 200, "response":{"success": False, "message": "Invalid email format"}}

        for admin in admins:
            if admin['uuid'] == admin_id and admin['isActive']:
                updated_admin.pop('id', None)
                updated_admin.pop('isActive', None)
                updated_admin.pop('createdBy', None)
                updated_admin.pop('isSuper', None)
                updated_admin.pop('created', None)
                updated_admin['updated'] = datetime.datetime.now().isoformat()
                updated_admin['updatedBy'] = updated_by_uuid

                admin.update(updated_admin)
                self._write_admins(admins)
                return {"status": 200, "response":{"success": True, "message": "Admin updated successfully"}}
        return {"status": 200, "response":{"success": False, "message": "Admin not found or not active"}}

    def permanent_delete_admin(self, admin_id):
        # Permanently delete an admin
        admins = self._read_admins()
        admins = [admin for admin in admins if not (admin['uuid'] == admin_id and not admin['isSuper'])]
        
        if len(admins) == len(self._read_admins()):
            return {"status": 200, "response":{"success": False, "message": "Admin not found or is a super admin"}}
        
        self._write_admins(admins)
        return {"status": 200, "response":{"success": True, "message": "Admin deleted successfully"}}
    
    def soft_delete_admin(self, admin_id):
        # Deactivate an admin
        admins = self._read_admins()
        for admin in admins:
            if admin['uuid'] == admin_id:
                if admin['isSuper']:
                    return {"status": 200, "response":{"success": False, "message": "Cannot deactivate a super admin"}}

                admin['isActive'] = False
                admin['updated'] = datetime.datetime.now().isoformat()
                self._write_admins(admins)
                return {"status": 200, "response":{"success": True, "message": "Admin deactivated successfully"}}

        return {"status": 200, "response":{"success": False, "message": "Admin not found"}}
    
    def get_avatars(self):
        return {"status": 200, "response": self.config['avatars']}
    
    def get_unique_emails(self, email):
        admins = self._read_admins()
        for admin in admins:
            if admin['email'] == email:
                return {"status": 200, "response": {"user_exists": True}}
        return {"status": 200, "response": {"user_exists": False}}
        
file_path = 'admins.json'
def loadAdminApi(config):
    admin_system = AdminManagementSystem(file_path, config)
    
    @api_route('/login', 'POST')
    def login_route(body):
        return admin_system.login(body['email'], body['password'])

    @api_route('/admins', 'GET')
    def get_all_active_admins(query_params, headers):
        decoded_token = admin_system.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        # Retrieve query parameters for pagination
        page = int(query_params.get('page', 1))  # Default to page 1
        per_page = int(query_params.get('per_page', 10))  # Default to 10 items per page
        search_param = query_params.get('search', None)  # Search parameter

        # Fetch all active admins
        admins = admin_system.get_all_active_admins()
        if search_param:
            admins = [admin for admin in admins if search_param.lower() in admin['email'].lower()]

        # Pagination
        start = (page - 1) * per_page
        end = start + per_page
        paginated_admins = admins[start:end]
        # Prepare the pagination response
        total_pages = len(admins) // per_page + (1 if len(admins) % per_page else 0)
        return {"status": 200, "response": 
            {
                "success": True,
                "admins": paginated_admins,
                "pagination": {
                    "current_page": page,
                    "per_page": per_page,
                    "total_pages": total_pages,
                    "total_admins": len(admins)
                }
            }
        }
        

    @api_route('/admins', 'POST')
    def add_admin_route(body, headers):
        decoded_token = admin_system.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        new_admin = body
        return admin_system.add_admin(new_admin, decoded_token["decoded"]["uuid"])

    @api_route('/admins/<admin_id>', 'PUT')  # or 'PATCH'
    def edit_admin_route(admin_id, body, headers):
        decoded_token = admin_system.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        updated_admin = body
        return admin_system.edit_admin(admin_id, updated_admin, decoded_token["decoded"]["uuid"])

    @api_route('/admins/<admin_id>', 'DELETE')
    def delete_admin_route(admin_id, headers):
        decoded_token = admin_system.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        return admin_system.soft_delete_admin(admin_id)

    @api_route('/avatars', 'GET')
    def get_avatars(headers):
        decoded_token = admin_system.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        return admin_system.get_avatars()

    @api_route('/admins/unique-email/<email>', 'GET')
    def get_unique_email(email, headers):
        decoded_token = admin_system.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        return admin_system.get_unique_emails(email)
    