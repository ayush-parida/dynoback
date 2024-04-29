from api.api import api_route
from api.auth import Authentication
import os
import json
from core.schemas import SchemaManagement

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
    
    @api_route('/schema/types', 'GET')
    def get_all_schema_types(headers):
        decoded_token = authentication.validate_admin_token(headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else '')
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        schema_types = schemaType._read_schema_types()
        return {"status": 200, "response":[schema_type for schema_type in schema_types if schema_type['isActive']]}
    
    column = ColumnManagement(config)
    
    @api_route('/column/types', 'GET')
    def get_all_columns(headers):
        decoded_token = authentication.validate_admin_token(headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else '')
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        columns = column._read_columns()
        return {"status": 200, "response":[column for column in columns if column['isActive']]}
    
    schema = SchemaManagement(config)
    
    @api_route('/schema', 'GET')
    def get_all_schemas(headers):
        decoded_token = authentication.validate_admin_token(headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else '')
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        schemas = schema._read_schemas()
        return {"status": 200, "response":[schema for schema in schemas if schema['isActive']]}
    
    @api_route('/schema', 'POST')
    def create_schema(body, headers):
        decoded_token = authentication.validate_admin_token(headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else '')
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        new_schema = body
        return schema.add_schema(new_schema, decoded_token["decoded"]["uuid"])
    
    @api_route('/schema/<schema_id>', 'GET')
    def get_schema_by_id(schema_id, headers):
        decoded_token = authentication.validate_admin_token(headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else '')
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        return schema.get_by_id_schema(schema_id)
    
    @api_route('/schema/<schema_id>', 'PUT')
    def put_schema_by_id(schema_id, body, headers):
        decoded_token = authentication.validate_admin_token(headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else '')
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        return schema.edit_schema(schema_id, body, decoded_token["decoded"]["uuid"])
    
    @api_route('/schema/<schema_id>', 'DELETE')
    def delete_schema_by_id(schema_id, headers):
        decoded_token = authentication.validate_admin_token(headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else '')
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        return schema.delete_schema(schema_id)
    
    @api_route('/schema/unique-name/<name>', 'GET')
    def get_unique_name(name, headers):
        decoded_token = authentication.validate_admin_token(headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else '')
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        return schema.get_unique_names(name)
    
    @api_route('/schema/gen-verify-token/<schema_id>/<uuid>', 'GET')
    def generate_verify_token_by_schema(schema_id, uuid, headers):
        decoded_token = authentication.validate_admin_token(headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else '')
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        return schema.generate_verify_token(schema_id, uuid)
    
    # @api_route('/process-schema/<uuid>', 'GET')
    # def process_schema(uuid, headers):
    #     schema_detail = schema.get_by_id_schema(uuid)['response']
    #     return process_create_schema(config, schema_detail)