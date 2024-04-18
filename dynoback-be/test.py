import json
import psycopg
import uuid
from datetime import datetime
from psycopg.rows import dict_row, namedtuple_row

import urllib.parse
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
    
    def get_filtered_sorted_paginated_records(self, schema_name, selected_fields="*", where_clause="", where_params=[], order_by="id ASC", offset=0, limit=10):
        """
        Fetch records with filtering, sorting, and pagination.

        :param schema_name: Name of the database schema (table).
        :param selected_fields: Fields to be included in the response.
        :param where_clause: SQL WHERE clause for filtering.
        :param where_params: Parameters for the WHERE clause to prevent SQL injection.
        :param order_by: Sorting criteria.
        :param offset: Offset for pagination.
        :param limit: Number of records per page.
        :return: Tuple of (records, total_records_count)
        """
        schema_details = self._get_schema_details(schema_name)
        if not schema_details:
            return [], 0

        # Construct the query
        base_query = f"SELECT {selected_fields} FROM {schema_name}"
        count_query = f"SELECT COUNT(*) FROM {schema_name}"
        if where_clause:
            base_query += f" WHERE {where_clause}"
            count_query += f" WHERE {where_clause}"
        query = f"{base_query} ORDER BY {order_by} OFFSET {offset} LIMIT {limit}"

        # Execute the query to fetch records
        records = self._execute_query(schema_details['connectionPoolId'], query, where_params)

        # Execute the count query to get total records count (for pagination)
        total_records = self._execute_query(schema_details['connectionPoolId'], count_query, where_params)
        if total_records and len(total_records) > 0:
            total_records_count = total_records[0]['count']  # Assuming the count is the first column in the first row
        else:
            total_records_count = 0

        return json.loads(json.dumps(records, cls=CustomJSONEncoder)), total_records_count


    def create(self, schema_name, record_data):
        """Implement logic to create a new record in the given schema."""
        if 'uuid' in record_data:
            del record_data['uuid']
        if 'is_active' in record_data:
            del record_data['is_active']
        if 'updated' in record_data:
            del record_data['updated']

        record_data['created'] = datetime.now().isoformat()
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
        if 'uuid' in update_data:
            del update_data['uuid']
        if 'is_active' in update_data:
            del update_data['is_active']
        if 'created' in update_data:
            del update_data['created']
        update_data['updated'] = datetime.now().isoformat()
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
        query = f"UPDATE {schema_name} SET is_active = FALSE, updated = {datetime.now()} WHERE uuid = %s RETURNING *"
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

def construct_where_clause(filters):
    where_clauses = []
    params = []
    for field, conditions in filters.items():
        field_conditions = []
        for condition in conditions:
            value = condition.get("value")
            if value is not None:
                match_mode = condition.get("matchMode")

                if match_mode == "startsWith":
                    field_conditions.append(f"{field} LIKE %s")
                    params.append(value + '%')
                elif match_mode == "contains":
                    field_conditions.append(f"{field} LIKE %s")
                    params.append('%' + value + '%')
                elif match_mode == "endsWith":
                    field_conditions.append(f"{field} LIKE %s")
                    params.append('%' + value)
                elif match_mode == "notContains":
                    field_conditions.append(f"{field} NOT LIKE %s")
                    params.append('%' + value + '%')
                # Add other matchModes as necessary

        if field_conditions:
            grouped_conditions = f" ({' OR '.join(field_conditions)}) "
            where_clauses.append(grouped_conditions)

    final_where_clause = ' AND '.join(where_clauses)
    return final_where_clause, params

def loadSchemasApi(config, authentication):
    db_api = DynamicDBAPI(config)

    def get_all_records(schema_name, query_params, headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response": {"success": False, "message": "Invalid or expired token"}}

        # Basic pagination and sorting parameters
        sort_by = query_params.get('sort_by', 'uuid')
        sort_order = 'ASC' if query_params.get('sort_order', 'asc').lower() == 'asc' else 'DESC'
        page = int(query_params.get('page', 1))
        per_page = int(query_params.get('per_page', 10))

        # Process complex filter parameters
        filter_param = query_params.get('filter')
        filters = {}
        if filter_param:
            filters = json.loads(urllib.parse.unquote(filter_param))
        where_clause, where_params = construct_where_clause(filters)

        # Handle fields parameter for SQL SELECT clause
        fields_param = query_params.get('fields')
        selected_fields = "*"
        if fields_param:
            fields_list = fields_param.split(',')
            selected_fields = ", ".join([field.strip() for field in fields_list])

        # Calculate offset for pagination
        offset = (page - 1) * per_page

        # Fetch filtered, sorted, and paginated records with selected fields
        records, total_records = db_api.get_filtered_sorted_paginated_records(
            schema_name=schema_name,
            selected_fields=selected_fields,
            where_clause=where_clause,
            where_params=where_params,
            order_by=f"{sort_by} {sort_order}",
            offset=offset,
            limit=per_page
        )

        total_pages = (total_records + per_page - 1) // per_page

        return {
            "status": 200,
            "response": {
                "success": True,
                "records": records,  # Assuming records are already properly serialized
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

    def create_record(schema_name, body, headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response": {"success": False, "message": "Invalid or expired token"}}
        
        new_record = db_api.create(schema_name, body)
        if json.loads(json.dumps(new_record, cls=CustomJSONEncoder)):
            return {"status": 200, "response": {"success": True, "message": "Record Created", "record": json.loads(json.dumps(new_record, cls=CustomJSONEncoder))}}
        else:
            return {"status": 200, "response": {"success": False, "message": "Record Creation Failed"}}

    def update_record(schema_name, record_id, body, headers):
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {"status": 401, "response": {"success": False, "message": "Invalid or expired token"}}
        
        updated_record = db_api.update(schema_name, record_id, body)
        if updated_record:
            return {"status": 200, "response": {"success": True, "message": "Record Updated", "record": json.loads(json.dumps(updated_record, cls=CustomJSONEncoder))}}
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
        print(deleted_record)
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
            def _create_record(body, headers):
                return create_record(schema_name, body, headers)
            return _create_record

        if operation == "PUT":
            def _update_record(record_id, body, headers):
                return update_record(schema_name, record_id, body, headers)
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
            if operation == "GET_BY_ID" or operation == 'PUT' or operation == 'DELETE':
                # Constructing the path with '<record_id>'
                path = f"/{schema['name']}/<record_id>"
            else:
                # Constructing the path without '<record_id>'
                path = f"/{schema['name']}"
            method = "GET" if operation in ["GET_ALL", "GET_BY_ID"] else operation
            api_route(path, method)(func)

import base64
import time

config = {
    "databases": [
        {
            "uuid": "102b6ae0-598b-40b6-adf2-7acff30b01a3",
            "display_name": "DB1_DB",
            "name": "dynoback",
            "user": "infiginiadmin",
            "password": "infigini123",
            "host": "43.204.12.237",
            "port": "5433",
            "isActive": True,
            "createdBy": "102b6ae0-598b-40b6-adf2-7acff30b01a2",
            "updatedBy": "102b6ae0-598b-40b6-adf2-7acff30b01a2",
            "created": "2024-02-17T08:23:14.016141",
            "updated": "2024-04-01T19:46:35.973983",
            "disabled": False
        },],
    "schemas": [{
            "type": 1,
            "name": "test_2",
            "connectionPoolId": "102b6ae0-598b-40b6-adf2-7acff30b01a3",
            "schema": [
                {
                    "system": False,
                    "isActive": True,
                    "id": 1,
                    "name": "field 1",
                    "type": "text",
                    "required": False,
                    "presentable": False,
                    "unique": False,
                    "default": "",
                    "options": {
                        "min": None,
                        "max": None,
                        "pattern": ""
                    }
                },
                {
                    "system": False,
                    "isActive": True,
                    "id": 1,
                    "name": "field 2",
                    "type": "text",
                    "required": False,
                    "presentable": False,
                    "unique": False,
                    "default": "",
                    "options": {
                        "min": None,
                        "max": None,
                        "pattern": ""
                    }
                },
                {
                    "system": False,
                    "isActive": True,
                    "id": 3,
                    "name": "field 3",
                    "type": "number",
                    "required": False,
                    "presentable": False,
                    "unique": False,
                    "default": "",
                    "options": {
                        "min": None,
                        "max": None,
                        "noDecimal": False
                    }
                },
                {
                    "system": False,
                    "isActive": True,
                    "id": 11,
                    "name": "field 4",
                    "type": "relation",
                    "required": False,
                    "presentable": False,
                    "unique": False,
                    "default": "",
                    "options": {
                        "collectionId": "102b6ae0-598b-40b6-adf2-7acff30b01a3",
                        "cascadeDelete": True,
                        "relatedTableUuid": "1827b15f-0d21-4818-9858-261455a72908",
                        "displayFields": None,
                        "relatedTableName": "test"
                    }
                }
            ],
            "uuid": "961d53d9-0157-4834-851d-fdc6f53d5be5",
            "isActive": True,
            "softDelete": False,
            "createdBy": "102b6ae0-598b-40b6-adf2-7acff30b01a2",
            "updatedBy": "102b6ae0-598b-40b6-adf2-7acff30b01a2",
            "created": "2024-03-19T19:24:24.075956",
            "updated": "2024-03-31T17:43:09.853345",
            "operations": [
                "GET_ALL",
                "GET_BY_ID",
                "POST",
                "PUT",
                "DELETE"
            ]
        },]
}

class Authentication:
    def __init__(self, config):
        self.config = config
        
    def validate_token(self, token):
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
authentication = Authentication(config)
loadSchemasApi(config, authentication)