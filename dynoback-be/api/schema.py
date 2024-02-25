from api.api import api_route
from api.auth import Authentication
import os
import json

class SchemaTypeManagement:
    def __init__(self, config, file_path='schema_types.json'):
        self.file_path = file_path
        self.config = config
        
    def _read_schema_types(self):
        if not os.path.exists(self.file_path):
            with open(self.file_path, 'w') as file:
                json.dump({"schema_types": []}, file)
            return []
        
        with open(self.file_path, 'r') as file:
            try:
                return json.load(file)['schema_types']
            except json.JSONDecodeError:
                return []

class ColumnManagement:
    def __init__(self, config, file_path='columns.json'):
        self.file_path = file_path
        self.config = config
        
    def _read_columns(self):
        if not os.path.exists(self.file_path):
            with open(self.file_path, 'w') as file:
                json.dump({"columns": []}, file)
            return []
        
        with open(self.file_path, 'r') as file:
            try:
                return json.load(file)['columns']
            except json.JSONDecodeError:
                return []
        

def loadSchemaApi(config, authentication: Authentication):
    schemaType = SchemaTypeManagement(config)
    
    column = ColumnManagement(config)
    
    @api_route('/schema/types', 'GET')
    def get_all_schema_types(headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        schema_types = schemaType._read_schema_types()
        return {"status": 200, "response":[schema_type for schema_type in schema_types if schema_type['isActive']]}
    
    
    @api_route('/column/types', 'GET')
    def get_all_columns(headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        columns = column._read_columns()
        return {"status": 200, "response":columns}