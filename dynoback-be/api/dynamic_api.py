import json
import psycopg
import uuid
from datetime import datetime
from psycopg.rows import dict_row, namedtuple_row

from api.api import api_route
from api.auth import Authentication
def _load_json(file_path):
        with open(file_path, 'r') as file:
            return json.load(file)
        
class DynamicDBAPI:
    def __init__(self, config):
        self.dbs_config = _load_json(config['databases'])
        self.schemas = _load_json(config['schemas'])['schemas']
        self.db_connections = self._prepare_db_connections()

    

    def _prepare_db_connections(self):
        """Prepare and store database connection strings."""
        connections = {}
        for db in self.dbs_config['dbs']:
            try:
                conn_str = f"dbname='{db['name']}' user='{db['user']}' password='{db['password']}' host='{db['host']}' port='{db['port']}'"
                connections[db['uuid']] = conn_str
            except KeyError as e:
                print(f"Error preparing DB connections: Missing key {e}")
        return connections

    def _get_schema_details(self, schema_name):
        for schema in self.schemas:
            if schema['name'] == schema_name:
                return schema
        return None

    def _execute_query(self, db_uuid, query, params=None, fetch='all'):
        """Execute a query on the database identified by db_uuid."""
        conn_str = self.db_connections.get(db_uuid)
        if not conn_str:
            return None

        try:
            with psycopg.connect(conn_str, row_factory=dict_row) as conn, conn.cursor() as cursor:
                cursor.execute(query, params)
                if fetch == 'all':
                    return cursor.fetchall()
                elif fetch == 'one':
                    return cursor.fetchone()
                conn.commit()  # Make sure to commit so the changes are saved
        except psycopg.DatabaseError as e:
            print(f"Database error: {e}")
            return None

    def get_all(self, schema_name, **kwargs):
        """Implement logic to fetch all records for a given schema."""
        schema_details = self._get_schema_details(schema_name)
        if not schema_details:
            return []

        query = f"SELECT * FROM {schema_name}"  # Simplified query, adjust as needed
        records = self._execute_query(schema_details['connectionPoolId'], query)
        return records

    def create(self, schema_name, record_data):
        """Implement logic to create a new record in the given schema."""
        schema_details = self._get_schema_details(schema_name)
        if not schema_details:
            return None

        # Construct the INSERT query dynamically based on record_data
        columns = ', '.join(record_data.keys())
        placeholders = ', '.join(['%s'] * len(record_data))
        query = f"INSERT INTO {schema_name} ({columns}) VALUES ({placeholders}) RETURNING *"

        new_record = self._execute_query(schema_details['connectionPoolId'], query, list(record_data.values()), fetch='one')
        return new_record

    def get_by_id(self, schema_name, record_id):
        """Fetch a single record by its ID."""
        schema_details = self._get_schema_details(schema_name)
        if not schema_details:
            return None

        query = f"SELECT * FROM {schema_name} WHERE uuid = %s"
        return self._execute_query(schema_details['connectionPoolId'], query, (record_id,), fetch='one')

    def update(self, schema_name, record_id, update_data):
        """Update an existing record."""
        schema_details = self._get_schema_details(schema_name)
        if not schema_details:
            return None

        # Construct the UPDATE query dynamically
        set_clause = ', '.join([f"{key} = %s" for key in update_data.keys()])
        query = f"UPDATE {schema_name} SET {set_clause} WHERE uuid = %s RETURNING *"

        params = list(update_data.values()) + [record_id]
        updated_record = self._execute_query(schema_details['connectionPoolId'], query, params, fetch='one')
        return updated_record

    def soft_delete(self, schema_name, record_id):
        """Deactivate a record instead of deleting it from the database."""
        schema_details = self._get_schema_details(schema_name)
        if not schema_details:
            return None

        # Assuming there's an 'is_active' field to indicate soft deletion
        query = f"UPDATE {schema_name} SET is_active = FALSE WHERE uuid = %s RETURNING *"
        deactivated_record = self._execute_query(schema_details['connectionPoolId'], query, (record_id,), fetch='one')
        return deactivated_record

    def hard_delete(self, schema_name, record_id):
        """Permanently delete a record from the database."""
        schema_details = self._get_schema_details(schema_name)
        if not schema_details:
            return None

        query = f"DELETE FROM {schema_name} WHERE uuid = %s RETURNING *"
        deleted_record = self._execute_query(schema_details['connectionPoolId'], query, (record_id,), fetch='one')
        return deleted_record

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            # Convert UUID objects to their string representation
            return str(obj)
        elif isinstance(obj, datetime):
            # Format datetime objects as strings in ISO format
            return obj.isoformat()
        # For other types, use the superclass default method
        return json.JSONEncoder.default(self, obj)


def loadSchemasApi(config, authentication):
    db_api = DynamicDBAPI(config)

    def get_all_records(schema_name, query_params, headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response": {"success": False, "message": "Invalid or expired token"}}
        
        # Assuming you have query parameters for sorting
        sort_by = query_params.get('sort_by', 'uuid')  # Adjust 'default_column' as needed
        sort_order = query_params.get('sort_order', 'asc')
        
        page = int(query_params.get('page', 1))
        per_page = int(query_params.get('per_page', 10))
        
        # Fetch all records (Consider modifying this to actually implement filtering and sorting)
        all_records = db_api.get_all(schema_name)
        
        # Apply sorting based on sort_by and sort_order
        # This is a placeholder. Implement actual sorting based on your data structure and requirements.
        # For example, you might sort the records based on a key if they're dictionaries.
        
        # Paginate records
        start = (page - 1) * per_page
        end = start + per_page
        paginated_records = all_records[start:end]
        
        total_records = len(all_records)
        total_pages = (total_records + per_page - 1) // per_page  # Ceiling division to account for incomplete pages
        
        # Serialize paginated records
        records_data = json.loads(json.dumps(paginated_records, cls=CustomJSONEncoder))
        
        return {
            "status": 200,
            "response": {
                "success": True,
                "records": records_data,
                "pagination": {
                    "current_page": page,
                    "per_page": per_page,
                    "total_pages": total_pages,
                    "sort_by": sort_by,
                    "sort_order": sort_order,
                    "total": total_records
                }
            }
        }


    def get_record_by_id(schema_name, record_id, headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response": {"success": False, "message": "Invalid or expired token"}}
        
        record = db_api.get_by_id(schema_name, record_id)
        if record:
            return {"status": 200, "response": json.loads(json.dumps(record, cls=CustomJSONEncoder))}
        else:
            return {"status": 404, "response": {"success": False, "message": "Record not found"}}

    def create_record(schema_name, record_data, headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response": {"success": False, "message": "Invalid or expired token"}}
        
        new_record = db_api.create(schema_name, record_data)
        return {"status": 200, "response": json.loads(json.dumps(new_record, cls=CustomJSONEncoder))}

    def update_record(schema_name, record_id, update_data, headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response": {"success": False, "message": "Invalid or expired token"}}
        
        updated_record = db_api.update(schema_name, record_id, update_data)
        if updated_record:
            return {"status": 200, "response": json.loads(json.dumps(updated_record, cls=CustomJSONEncoder))}
        else:
            return {"status": 404, "response": {"success": False, "message": "Record not found"}}

    def delete_record(schema_name, record_id, headers, soft_delete=True):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response": {"success": False, "message": "Invalid or expired token"}}
        
        if soft_delete:
            deleted_record = db_api.soft_delete(schema_name, record_id)
        else:
            deleted_record = db_api.hard_delete(schema_name, record_id)

        if deleted_record:
            return {"status": 200, "response": {"success": True, "message": "Record deleted successfully"}}
        else:
            return {"status": 404, "response": {"success": False, "message": "Record not found"}}

    def create_api_function(schema, operation):
        schema_name = schema['name']
        if operation == "GET_ALL":
            def _get_all_records(query_params, headers):
                return get_all_records(schema_name ,query_params, headers)
            return _get_all_records

        if operation == "GET_BY_ID":
            def _get_record_by_id(record_id, headers):
                return get_record_by_id(schema_name, record_id, headers)
            return _get_record_by_id

        if operation == "POST":
            def _create_record(record_data, headers):
                return create_record(schema_name, record_data, headers)
            return _create_record

        if operation == "PUT":
            def _update_record(record_id, update_data, headers):
                return update_record(schema_name, record_id, update_data, headers)
            return _update_record

        if operation == "DELETE":
            def _delete_record(record_id, headers):
                return delete_record(schema_name, record_id, headers, soft_delete=schema['softDelete'])
            return _delete_record

    # Dynamically create routes for each schema and operation
    schemas = _load_json(config['schemas'])['schemas']
    for schema in schemas:
        for operation in schema['operations']:
            func = create_api_function(schema, operation)
            path = f"/{schema['name']}" if operation != "GET_BY_ID" else f"/{schema['name']}/<record_id>"
            method = "GET" if operation in ["GET_ALL", "GET_BY_ID"] else operation
            api_route(path, method)(func)
    
    
# def loadSchemasApi(config, authentication: Authentication):
#     db_api = DynamicDBAPI(config)

#     def wrap_call(func):
#         def call(*args, **kwargs):
#             headers = kwargs.get('headers')
#             decoded_token = authentication.validate_token(headers['Authorization'])
#             if not decoded_token:
#                 return {"status": 401, "response": {"success": False, "message": "Invalid or expired token"}}
#             return func(*args, **kwargs)
#         return call

#     def dynamic_api_route(path, method, operation_func):
#         @api_route(path, method)
#         def wrapped_func(*args, **kwargs):
#             return wrap_call(operation_func)(*args, **kwargs)

#     operations = {
#         'GET_ALL': (lambda schema_name: lambda query_params, headers: db_api.get_all(schema_name, **query_params)),
#         'GET_BY_ID': (lambda schema_name: lambda record_id, headers: db_api.get_by_id(schema_name, record_id)),
#         'POST': (lambda schema_name: lambda record_data, headers: db_api.create(schema_name, record_data)),
#         'PUT': (lambda schema_name: lambda record_id, update_data, headers: db_api.update(schema_name, record_id, update_data)),
#         'DELETE': (lambda schema_name: lambda record_id, headers: db_api.soft_delete(schema_name, record_id)),
#     }

#     for schema in db_api.schemas:
#         schema_name = schema['name']
#         for op_name, op_func_generator in operations.items():
#             op_func = op_func_generator(schema_name)
#             if op_name == 'GET_ALL':
#                 dynamic_api_route(f'/{schema_name}', 'GET', op_func)
#             elif op_name == 'GET_BY_ID':
#                 dynamic_api_route(f'/{schema_name}/<record_id>', 'GET', op_func)
#             elif op_name == 'POST':
#                 dynamic_api_route(f'/{schema_name}', 'POST', op_func)
#             elif op_name == 'PUT':
#                 dynamic_api_route(f'/{schema_name}/<record_id>', 'PUT', op_func)
#             elif op_name == 'DELETE':
#                 dynamic_api_route(f'/{schema_name}/<record_id>', 'DELETE', op_func)