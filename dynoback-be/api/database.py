import json
import uuid
import base64
import time    
import re
import datetime
import os
from api.api import api_route
from api.auth import Authentication

class DatabaseManagement:
    def __init__(self, config, file_path='dbs.json'):
        self.file_path = file_path
        self.config = config
        
    def _read_dbs(self):
        if not os.path.exists(self.file_path):
            with open(self.file_path, 'w') as file:
                json.dump({"dbs": []}, file)
            return []
        
        with open(self.file_path, 'r') as file:
            try:
                return json.load(file)['dbs']
            except json.JSONDecodeError:
                return []

    def _write_dbs(self, dbs):
        with open(self.file_path, 'w') as file:
            json.dump({"dbs": dbs}, file, indent=4)
        
    def get_all_active_databases(self):
        dbs = self._read_dbs()
        return [db for db in dbs if db['isActive']]
    
    def add_db(self, new_db, creator_uuid):
        # Add a new db
        dbs = self._read_dbs()

        mandatory_fields = ['name', 'user', 'host', 'port']
        missing_fields = [field for field in mandatory_fields if not new_db.get(field)]
        if missing_fields:
            return {"status": 200, "response":{"success": False, "message": f"Mandatory fields missing: {', '.join(missing_fields)}"}}

        new_db['uuid'] = str(uuid.uuid4())
        new_db['isActive'] = True
        new_db['createdBy'] = creator_uuid
        new_db['updatedBy'] = ""
        current_time = datetime.datetime.now().isoformat()
        new_db['created'] = new_db['updated'] = current_time

        dbs.append(new_db)
        self._write_dbs(dbs)

        return {"status": 200, "response": {"success": True, "message": "db added successfully", "id": new_db['uuid']}}

    def edit_db(self, db_id, updated_db, updated_by_uuid):
        # Edit an existing db
        dbs = self._read_dbs()

        mandatory_fields = ['name', 'user', 'host', 'port']
        for field in mandatory_fields:
            if field in updated_db and not updated_db[field]:
                return {"status": 200, "response":{"success": False, "message": f"Field '{field}' cannot be empty"}}

        for db in dbs:
            if db['uuid'] == db_id and db['isActive']:
                updated_db.pop('id', None)
                updated_db.pop('isActive', None)
                updated_db.pop('createdBy', None)
                updated_db.pop('created', None)
                updated_db['updated'] = datetime.datetime.now().isoformat()
                updated_db['updatedBy'] = updated_by_uuid

                db.update(updated_db)
                self._write_dbs(dbs)
                return {"status": 200, "response":{"success": True, "message": "db updated successfully"}}
        return {"status": 200, "response":{"success": False, "message": "db not found or not active"}}
    
    def get_by_id_db(self, db_id):
        dbs = self._read_dbs()
        
        for db in dbs:
            if db['uuid'] == db_id and db['isActive']:
                return {"status": 200, "response":db}
        return {"status": 200, "response":{"success": False, "message": "db not found or not active"}}

    def permanent_delete_db(self, db_id):
        # Permanently delete an db
        dbs = self._read_dbs()
        dbs = [db for db in dbs if not (db['uuid'] == db_id and not db['isSuper'])]
        
        if len(dbs) == len(self._read_dbs()):
            return {"status": 200, "response":{"success": False, "message": "db not found or is a super db"}}
        
        self._write_dbs(dbs)
        return {"status": 200, "response":{"success": True, "message": "db deleted successfully"}}
    
    def soft_delete_db(self, db_id):
        # Deactivate an db
        dbs = self._read_dbs()
        for db in dbs:
            if db['uuid'] == db_id:
                if db['isSuper']:
                    return {"status": 200, "response":{"success": False, "message": "Cannot deactivate a super db"}}

                db['isActive'] = False
                db['updated'] = datetime.datetime.now().isoformat()
                self._write_dbs(dbs)
                return {"status": 200, "response":{"success": True, "message": "db deactivated successfully"}}

        return {"status": 200, "response":{"success": False, "message": "db not found"}}
    
    def kvp_db(self):
        dbs = self._read_dbs()
        return [{'display_name': db['display_name'], 'uuid': db['uuid']} for db in dbs if db['isActive']]
        
def loadDatabaseApi(config, authentication: Authentication):
    database = DatabaseManagement(config)
    
    @api_route('/databases', 'GET')
    def get_all_active_databases(query_params, headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        page = int(query_params.get('page', 1)) 
        per_page = int(query_params.get('per_page', 10))
        search_param = query_params.get('search', None)
        sort_by = query_params.get('sort_by', 'name')
        sort_order = query_params.get('sort_order', 'asc')

        databases = database.get_all_active_databases()
        if search_param:
            databases = [database for database in databases if search_param.lower() in database['email'].lower()]
        if sort_order.lower() == 'asc':
            databases.sort(key=lambda x: x.get(sort_by, ''))
        else:
            databases.sort(key=lambda x: x.get(sort_by, ''), reverse=True)
            
        start = (page - 1) * per_page
        end = start + per_page
        paginated_databases = databases[start:end]
        # Prepare the pagination response
        total_pages = len(databases) // per_page + (1 if len(databases) % per_page else 0)
        return {"status": 200, "response": 
            {
                "success": True,
                "databases": paginated_databases,
                "pagination": {
                    "current_page": page,
                    "per_page": per_page,
                    "total_pages": total_pages,
                    "sort_by": sort_by,
                    "sort_order": sort_order,
                    "total_databases": len(databases)
                }
            }
        }
        
    @api_route('/databases', 'POST')
    def add_database_route(body, headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        new_database = body
        return database.add_db(new_database, decoded_token["decoded"]["uuid"])

    @api_route('/databases/<database_id>', 'PUT')  # or 'PATCH'
    def edit_database_route(database_id, body, headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        updated_database = body
        return database.edit_db(database_id, updated_database, decoded_token["decoded"]["uuid"])

    @api_route('/databases/<database_id>', 'DELETE')
    def delete_database_route(database_id, headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        return database.soft_delete_db(database_id)
    
    @api_route('/databases/kvp', 'GET')
    def kvp_database_route(headers):
        return {"status": 200, "response":database.kvp_db()}
    
    @api_route('/databases/<database_id>', 'GET')  # or 'PATCH'
    def edit_database_route(database_id, headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        return database.get_by_id_db(database_id)