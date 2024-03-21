import os
import json
import uuid
import datetime
from core.process_schema import process_create_schema, process_edit_schema, process_delete_schema

class SchemaManagement:
    def __init__(self,  config):
        self.file_path = config['schemas']
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
        mandatory_fields = [ "connectionPoolId", "name", "type", "schema"]
        missing_fields = [field for field in mandatory_fields if not body.get(field)]
        if missing_fields:
            return {"status": 200, "response":{"success": False, "message": f"Mandatory fields missing: {', '.join(missing_fields)}"}}
        if len(body['schema'])==0:
            return {"status": 200, "response":{"success": False, "message": f"Schema cannot be []"}}
        if any(schema['name'] == body['name'] for schema in schemas):
            return {"status": 200, "response":{"success": False, "message": "Name already exists"}}
        body['uuid']=str(uuid.uuid4())
        body['isActive']=True
        body['createdBy'] = creator_uuid
        body['updatedBy'] = ""
        body['operations'] = ['GET_ALL', 'GET_BY_ID', 'POST', 'PUT', 'DELETE']
        for col in body['schema']:
            col['uuid']=str(uuid.uuid4())
        current_time = datetime.datetime.now().isoformat()
        body['created'] = body['updated'] = current_time
        schemas.append(body)
        self._write_schemas(schemas)
        response = process_create_schema(self.config, body, schemas)
        if(response['status'] == 200):
            return {"status": 200, "response": {"success": True, "message": response['response']['message'], "id": body['uuid']}}
        else:
            return {"status": 400, "response": {"success": False, "message": response['response']['message'], "id": body['uuid']}}
    
    def edit_schema(self, schema_uuid, updated_schema, updated_by_uuid):
        schemas = self._read_schemas()
        mandatory_fields = [ "connectionPoolId", "type", "schema"]
        missing_fields = [field for field in mandatory_fields if not updated_schema.get(field)]
        if missing_fields:
            return {"status": 200, "response":{"success": False, "message": f"Mandatory fields missing: {', '.join(missing_fields)}"}}
        if len(updated_schema['schema'])==0:
            return {"status": 200, "response":{"success": False, "message": f"Schema cannot be []"}}
        for schema in schemas:
            if schema['uuid'] == schema_uuid and schema['isActive']:
                updated_schema.pop('id', None)
                updated_schema.pop('isActive', None)
                updated_schema.pop('createdBy', None)
                updated_schema.pop('created', None)
                updated_schema['updated'] = datetime.datetime.now().isoformat()
                updated_schema['updatedBy'] = updated_by_uuid
                response = process_edit_schema(self.config, schema, updated_schema, schemas)
                schema.update(updated_schema)
                self._write_schemas(schemas)
                if(response['status'] == 200):
                    return {"status": 200, "response": {"success": True, "message": response['response']['message']}}
                else:
                    return {"status": 400, "response": {"success": False, "message": response['response']['message']}}
        return {"status": 200, "response":{"success": False, "message": "Schema not found or not active"}}
    
    def get_by_id_schema(self, schema_id):
        schemas = self._read_schemas()
        
        for schema in schemas:
            if schema['uuid'] == schema_id and schema['isActive']:
                return {"status": 200, "response":schema}
        return {"status": 200, "response":{"success": False, "message": "Schema not found or not active"}}
    
    def delete_schema(self, schema_id):
        schemas = self._read_schemas()
        schema_exists = False
        for schema in schemas:
            if schema['uuid'] == schema_id:
                schema_exists = True
                response = process_delete_schema(self.config, schema)
                schemas.remove(schema)
                break
        if schema_exists:
            self._write_schemas(schemas)
            if(response['status'] == 200):
                return {"status": 200, "response": {"success": True, "message": response['response']['message']}}
            else:
                return {"status": 400, "response": {"success": False, "message": response['response']['message']}}
        else:
            return {"status": 404, "response": {"success": False, "message": "Schema not found"}}

    def get_unique_names(self, name):
        schemas = self._read_schemas()
        for schema in schemas:
            if schema['name'] == name:
                return {"status": 200, "response": {"user_exists": True}}
        return {"status": 200, "response": {"user_exists": False}}
    
