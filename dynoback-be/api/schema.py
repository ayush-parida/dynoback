from api.api import api_route
from api.auth import Authentication
import os
import json
import uuid
import datetime

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
        
class SchemaManagement:
    def __init__(self,  config, file_path='schemas.json'):
        self.file_path = file_path
        self.config = config
        
    def _read_schemas(self):
        if not os.path.exists(self.file_path):
            with open(self.file_path, 'w') as file:
                json.dump({"schemas": []}, file)
            return []
        
        with open(self.file_path, 'r') as file:
            try:
                return json.load(file)['schemas']
            except json.JSONDecodeError:
                return []
    def _write_schemas(self, schemas):
        # Write updated schema data to file, will create file if it doesn't exist
        with open(self.file_path, 'w') as file:
            json.dump({"schemas": schemas}, file, indent=4)
    def add_schema(self, body, creator_uuid):
        schemas = self._read_schemas()
        mandatory_fields = [ "connectionPoolId", "name", "type", "system"]
        missing_fields = [field for field in mandatory_fields if not body.get(field)]
        if missing_fields:
            return {"status": 200, "response":{"success": False, "message": f"Mandatory fields missing: {', '.join(missing_fields)}"}}
        if any(schema['name'] == body['name'] for schema in schemas):
            return {"status": 200, "response":{"success": False, "message": "Name already exists"}}
        
        body['uuid']=str(uuid.uuid4())
        body['isActive']=True
        body['createdBy'] = creator_uuid
        body['updatedBy'] = ""
        del body['id']
        for col in body['schema']:
            col['uuid']=str(uuid.uuid4())
            del col['id']
        current_time = datetime.datetime.now().isoformat()
        body['created'] = body['updated'] = current_time
        schemas.append(body)
        self._write_schemas(schemas)
        return {"status": 200, "response": {"success": True, "message": "Schema added successfully", "id": body['uuid']}}

            
def loadSchemaApi(config, authentication: Authentication):
    schemaType = SchemaTypeManagement(config)
    
    @api_route('/schema/types', 'GET')
    def get_all_schema_types(headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        schema_types = schemaType._read_schema_types()
        return {"status": 200, "response":[schema_type for schema_type in schema_types if schema_type['isActive']]}
    
    column = ColumnManagement(config)
    
    @api_route('/column/types', 'GET')
    def get_all_columns(headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        columns = column._read_columns()
        return {"status": 200, "response":[column for column in columns if column['isActive']]}
    
    schema = SchemaManagement(config)
    
    @api_route('/schema', 'GET')
    def get_all_schemas(headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        schemas = schema._read_schemas()
        return {"status": 200, "response":[schema for schema in schemas if schema['isActive']]}
    
    @api_route('/schema', 'POST')
    def create_schema(body, headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response":{"success": False, "message": "Invalid or expired token"}}
        new_schema = body
        return schema.add_schema(new_schema, decoded_token["decoded"]["uuid"])