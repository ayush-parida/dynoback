import json
import psycopg
import uuid
from datetime import datetime
from psycopg.rows import dict_row, namedtuple_row
import bcrypt
import urllib.parse
from api.api import api_route
from api.auth import Authentication
import jwt
def _load_json(file_path):
        with open(file_path, 'r') as file:
            return json.load(file)
        
class Dynamic_DB_API:
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
    
    def get_all_kvp(self, schema_name, **kwargs):
        """Implement logic to fetch all records for a given schema."""
        schema_details = self._get_schema_details(schema_name)
        if not schema_details:
            return []
        kvp_fields = "uuid"
        cols = schema_details['kvp']
        formatted = []
        for col in cols:
            formatted.append(col.replace(' ', '_'))
        st = ', '
        st_formatted = st.join(formatted)
        if(len(st_formatted)):
            kvp_fields = kvp_fields + ", " + st_formatted
        query = f"SELECT {kvp_fields} FROM {schema_name}"  # Simplified query, adjust as needed
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
    
    def get_by_key(self, schema_name, key, value):
        """Fetch a single record by its ID."""
        schema_details = self._get_schema_details(schema_name)
        if not schema_details:
            return None

        query = f"SELECT * FROM {schema_name} WHERE {key} = %s"
        return self._execute_query(schema_details['connectionPoolId'], query, (value,), fetch='one')

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
    
    def verify_schema(self, schema_name, decoded):
        schema_details = self._get_schema_details(schema_name)
        if not schema_details:
            return None
        if(decoded['schema'] == schema_details['uuid'] and int(datetime.utcnow().timestamp())<decoded['exp']):
            update_data = {"verified": True}
            set_clause = ', '.join([f"{key} = %s" for key in update_data.keys()])
            query = f"UPDATE {schema_name} SET {set_clause} WHERE uuid = %s RETURNING *"
            params = list(update_data.values()) + [decoded['uuid']]
            updated_record = self._execute_query(schema_details['connectionPoolId'], query, params, fetch='one')
            return updated_record
        else:
            return False
    

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
    db_api = Dynamic_DB_API(config)

    def get_all_records(operation_name, schema_name, query_params, headers):
        token = headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else ''

        # Validate the token using the refined method which handles 'anyone', 'admin', etc.
        decoded_token = authentication.validate_token(schema_name, token, operation_name)

        # Check if the token is valid based on the status returned from validate_token
        if not decoded_token["status"]:
            # Token is invalid or expired, return a 401 Unauthorized response
            return {
                "status": 401,
                "response": {
                    "success": False,
                    "message": decoded_token.get("error", "Invalid or expired token")
                }
            }

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
        
    def get_record_by_id(operation_name, schema_name, record_id, headers):
        token = headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else ''

        # Validate the token using the refined method which handles 'anyone', 'admin', etc.
        decoded_token = authentication.validate_token(schema_name, token, operation_name)

        # Check if the token is valid based on the status returned from validate_token
        if not decoded_token["status"]:
            # Token is invalid or expired, return a 401 Unauthorized response
            return {
                "status": 401,
                "response": {
                    "success": False,
                    "message": decoded_token.get("error", "Invalid or expired token")
                }
            }
        
        record = db_api.get_by_id(schema_name, record_id)
        if record:
            return {"status": 200, "response": json.loads(json.dumps(record, cls=CustomJSONEncoder))}
        else:
            return {"status": 404, "response": {"success": False, "message": "Record not found"}}

    def create_record(operation_name, schema_name, body, headers):
        token = headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else ''

        # Validate the token using the refined method which handles 'anyone', 'admin', etc.
        decoded_token = authentication.validate_token(schema_name, token, operation_name)

        # Check if the token is valid based on the status returned from validate_token
        if not decoded_token["status"]:
            # Token is invalid or expired, return a 401 Unauthorized response
            return {
                "status": 401,
                "response": {
                    "success": False,
                    "message": decoded_token.get("error", "Invalid or expired token")
                }
            }
        
        new_record = db_api.create(schema_name, body)
        if json.loads(json.dumps(new_record, cls=CustomJSONEncoder)):
            return {"status": 200, "response": {"success": True, "message": "Record Created", "record": json.loads(json.dumps(new_record, cls=CustomJSONEncoder))}}
        else:
            return {"status": 200, "response": {"success": False, "message": "Record Creation Failed"}}

    def update_record(operation_name, schema_name, record_id, body, headers):
        token = headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else ''

        # Validate the token using the refined method which handles 'anyone', 'admin', etc.
        decoded_token = authentication.validate_token(schema_name, token, operation_name)

        # Check if the token is valid based on the status returned from validate_token
        if not decoded_token["status"]:
            # Token is invalid or expired, return a 401 Unauthorized response
            return {
                "status": 401,
                "response": {
                    "success": False,
                    "message": decoded_token.get("error", "Invalid or expired token")
                }
            }
        
        updated_record = db_api.update(schema_name, record_id, body)
        if updated_record:
            return {"status": 200, "response": {"success": True, "message": "Record Updated", "record": json.loads(json.dumps(updated_record, cls=CustomJSONEncoder))}}
        else:
            return {"status": 404, "response": {"success": False, "message": "Record not found"}}

    def delete_record(operation_name, schema_name, record_id, headers, soft_delete=True):
        token = headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else ''

        # Validate the token using the refined method which handles 'anyone', 'admin', etc.
        decoded_token = authentication.validate_token(schema_name, token, operation_name)

        # Check if the token is valid based on the status returned from validate_token
        if not decoded_token["status"]:
            # Token is invalid or expired, return a 401 Unauthorized response
            return {
                "status": 401,
                "response": {
                    "success": False,
                    "message": decoded_token.get("error", "Invalid or expired token")
                }
            }
        if soft_delete:
            deleted_record = db_api.soft_delete(schema_name, record_id)
        else:
            deleted_record = db_api.hard_delete(schema_name, record_id)
        if deleted_record:
            return {"status": 200, "response": {"success": True, "message": "Record deleted successfully"}}
        else:
            return {"status": 404, "response": {"success": False, "message": "Record not found"}}
    
    def kvp_record(operation_name, schema_name, headers):
        token = headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else ''

        # Validate the token using the refined method which handles 'anyone', 'admin', etc.
        decoded_token = authentication.validate_token(schema_name, token, operation_name)

        # Check if the token is valid based on the status returned from validate_token
        if not decoded_token["status"]:
            # Token is invalid or expired, return a 401 Unauthorized response
            return {
                "status": 401,
                "response": {
                    "success": False,
                    "message": decoded_token.get("error", "Invalid or expired token")
                }
            }
        records = db_api.get_all_kvp(schema_name)
        if len(records):
            return {"status": 200, "response": {"success": True, "message": "Record deleted successfully"}}
        else:
            return {"status": 404, "response": {"success": False, "message": "Record not found"}}
        
    def register_user(operation_name, schema_name, body, headers):
        token = headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else ''

        # Validate the token using the refined method which handles 'anyone', 'admin', etc.
        decoded_token = authentication.validate_token(schema_name, token, operation_name)

        # Check if the token is valid based on the status returned from validate_token
        if not decoded_token["status"]:
            # Token is invalid or expired, return a 401 Unauthorized response
            return {
                "status": 401,
                "response": {
                    "success": False,
                    "message": decoded_token.get("error", "Invalid or expired token")
                }
            }
        """Register a new user by adding their details into the specified schema after validating the token."""
        
        # Hash the password before storing it
        hashed_password = bcrypt.hashpw(body['password'].encode('utf-8'), bcrypt.gensalt())
        body['password'] = hashed_password
        
        # Create a new record in the database
        new_user_record = db_api.create(schema_name, body)
        if new_user_record:
            return {"status": 200, "response": json.loads(json.dumps(new_user_record, cls=CustomJSONEncoder))}
        else:
            return {"status": 404, "response": {"success": False, "message": "Failed to create user"}}

    def login_user(operation_name, schema_name, schema_uuid, secret_key, expiry, body, headers):
        token = headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else ''

        # Validate the token using the refined method which handles 'anyone', 'admin', etc.
        decoded_token = authentication.validate_token(schema_name, token, operation_name)

        # Check if the token is valid based on the status returned from validate_token
        if not decoded_token["status"]:
            # Token is invalid or expired, return a 401 Unauthorized response
            return {
                "status": 401,
                "response": {
                    "success": False,
                    "message": decoded_token.get("error", "Invalid or expired token")
                }
            }
        """Authenticate a user by checking their credentials and return a token upon success."""
        user_record = db_api.get_filtered_sorted_paginated_records(schema_name, where_clause="username = %s", where_params=[body['username']], limit=1)
        if user_record[0] and bcrypt.checkpw(body['password'].encode('utf-8'), user_record[0][0]['password'].encode('utf-8')):
            # Generate a JWT token
            token = _generate_jwt(user_record[0][0]['uuid'], secret_key, expiry, schema_uuid)
            return {
                "status": 200,
                "response": {
                    "success": True,
                    "message": "Login successful",
                    "token": token
                }
            }
        return {
            "status": 401,
            "response": {
                "success": False,
                "message": "Invalid username or password"
            }
        }

    def _generate_jwt(operation_name, uuid, secret_key, expiry, schema_uuid):
        """Generate a JWT for the user."""
        payload = {
            'uuid': uuid,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=expiry),
            'schema': schema_uuid
        }
        return jwt.encode(payload, secret_key, algorithm='HS256')
    
    def change_password(operation_name, schema_name, body, headers):
        token = headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else ''

        # Validate the token using the refined method which handles 'anyone', 'admin', etc.
        decoded_token = authentication.validate_token(schema_name, token, operation_name)

        # Check if the token is valid based on the status returned from validate_token
        if not decoded_token["status"]:
            # Token is invalid or expired, return a 401 Unauthorized response
            return {
                "status": 401,
                "response": {
                    "success": False,
                    "message": decoded_token.get("error", "Invalid or expired token")
                }
            }
        """Change the password for a user, if the old password is correct after validating the token."""

        # Fetch the user's current record to verify the old password
        user_record = db_api.get_by_id(schema_name, body['record_id'])
        if user_record and bcrypt.checkpw(body['old_password'].encode('utf-8'), user_record['password'].encode('utf-8')):
            hashed_new_password = bcrypt.hashpw(body['new_password'].encode('utf-8'), bcrypt.gensalt())
            update_result = db_api.update(schema_name, body['record_id'], {'password': hashed_new_password})
            if update_result:
                return {"status": 200, "response": json.loads(json.dumps(update_result, cls=CustomJSONEncoder))}
            else:
                return {"status": 404, "response": {"success": False, "message": "Failed to update password"}}
        else:
            return {"status": 404, "response": {"success": False, "message": "Incorrect old password or user not found"}}

    def refresh_token(operation_name, schema_name, schema_uuid, secret_key, expiry, headers):
        token = headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else ''

        # Validate the token using the refined method which handles 'anyone', 'admin', etc.
        decoded_token = authentication.validate_token(schema_name, token, operation_name)

        # Check if the token is valid based on the status returned from validate_token
        if not decoded_token["status"]:
            # Token is invalid or expired, return a 401 Unauthorized response
            return {
                "status": 401,
                "response": {
                    "success": False,
                    "message": decoded_token.get("error", "Invalid or expired token")
                }
            }
        """Generate a new token for the user after validating the current token."""
        decoded_token = authentication.validate_token(headers['Authorization'])
        if not decoded_token["status"]:
            return {
                "status": 401,
                "response": {
                    "success": False,
                    "message": "Invalid or expired token"
                }
            }

        # Generate a new JWT token with new expiry
        new_token = _generate_jwt(decoded_token['uuid'], secret_key, expiry, schema_uuid)
        update_result = db_api.update(schema_name, decoded_token['uuid'], {'token': new_token})
        if update_result:
            return {
                "status": 200,
                "response": {
                    "success": True,
                    "token": new_token,
                    "message": "Token refreshed successfully"
                }
            }
        else:
            return {
                "status": 404,
                "response": {
                    "success": False,
                    "message": "Failed to update user token"
                }
            }
    
    def verify_email(operation_name, schema_name, headers):
        token = headers.get('authorization', '').split(' ')[1] if 'authorization' in headers and headers['authorization'].startswith('Bearer ') else ''
        # Validate the token using the refined method which handles 'anyone', 'admin', etc.
        decoded_token = authentication.validate_token(schema_name, token, operation_name)
        # Check if the token is valid based on the status returned from validate_token
        if not decoded_token["status"]:
            # Token is invalid or expired, return a 401 Unauthorized response
            return {
                "status": 401,
                "response": {
                    "success": False,
                    "message": decoded_token.get("error", "Invalid or expired token")
                }
            }
        verify_record = db_api.verify_schema(schema_name, decoded_token['decoded'])
        if verify_record:
            return {
                "status": 200,
                "response": {
                    "success": True,
                    "message": "Verified successfully"
                }
            }
        else:
            return {"status": 404, "response": {"success": False, "message": "Invalid or Expired Token"}}
            
    def unique_key_validator(operation_name, schema_name, headers, key, value):
        token = headers.get('Authorization', '').split(' ')[1] if 'Authorization' in headers and headers['Authorization'].startswith('Bearer ') else ''

        # Validate the token using the refined method which handles 'anyone', 'admin', etc.
        decoded_token = authentication.validate_token(schema_name, token, operation_name)

        # Check if the token is valid based on the status returned from validate_token
        if not decoded_token["status"]:
            # Token is invalid or expired, return a 401 Unauthorized response
            return {
                "status": 401,
                "response": {
                    "success": False,
                    "message": decoded_token.get("error", "Invalid or expired token")
                }
            }
        
        record = db_api.get_by_key(schema_name, key, value)
        if record:
            return {"status": 200, "response": {"exists": True}}
        else:
            return {"status": 404, "response": {"exists": False}}

    def create_api_function(schema, operation):
        schema_name = schema['name']
        if operation["name"] == "GET_ALL":
            def _get_all_records(query_params, headers):
                return get_all_records(operation["name"], schema_name ,query_params, headers)
            return _get_all_records

        if operation["name"] == "GET_BY_ID":
            def _get_record_by_id(record_id, headers):
                return get_record_by_id(operation["name"], schema_name, record_id, headers)
            return _get_record_by_id

        if operation["name"] == "POST":
            def _create_record(body, headers):
                return create_record(operation["name"], schema_name, body, headers)
            return _create_record

        if operation["name"] == "PUT":
            def _update_record(record_id, body, headers):
                return update_record(operation["name"], schema_name, record_id, body, headers)
            return _update_record

        if operation["name"] == "DELETE":
            def _delete_record(record_id, headers):
                return delete_record(operation["name"], schema_name, record_id, headers, soft_delete=schema['softDelete'])
            return _delete_record
        
        if operation["name"] == "KVP":
            def _kvp_record(headers):
                return kvp_record(operation["name"], schema_name, headers)
            return _kvp_record
        
        # if operation["name"] == "ME":
        #     def _me_record(record_id, headers):
        #         return me_record(operation["name"], schema_name, headers)
        #     return _me_record
        
        if operation["name"] == "REGISTER":
            def _register_user(body, headers):
                return register_user(operation["name"], schema_name, body, headers)
            return _register_user

        if operation["name"] == "LOGIN":
            def _login_user(body, headers):
                return login_user(operation["name"], schema_name, schema['uuid'], schema['secret_key'], schema['expiry'], body, headers)
            return _login_user

        # if operation["name"] == "LOGOUT":
        #     def _logout_user(session_id, headers):
        #         return logout_user(operation["name"], schema_name, session_id, headers)
        #     return _logout_user

        # if operation["name"] == "PASSWORD_RESET_REQUEST":
        #     def _password_reset_request(email, headers):
        #         return password_reset_request(operation["name"], schema_name, email, headers)
        #     return _password_reset_request

        # if operation["name"] == "RESET_PASSWORD":
        #     def _reset_password(token, new_password, headers):
        #         return reset_password(operation["name"], schema_name, token, new_password, headers)
        #     return _reset_password

        if operation["name"] == "CHANGE_PASSWORD":
            def _change_password(body, headers):
                return change_password(operation["name"], schema_name, body, headers)
            return _change_password

        # if operation["name"] == "VERIFY_EMAIL_REQUEST":
        #     def _verify_email_request(token, headers):
        #         return verify_email_request(operation["name"], schema_name, token, headers)
        #     return _verify_email_request
        
        if operation["name"] == "VERIFY_EMAIL":
            def _verify_email(body, headers):
                return verify_email(operation["name"], schema_name, headers)
            return _verify_email

        if operation["name"] == "REFRESH_TOKEN":
            def _refresh_token(body, headers):
                return refresh_token(operation["name"], schema_name, schema['uuid'], schema['secret_key'], schema['expiry'], headers)
            return _refresh_token

        # if operation["name"] == "TWO_FACTOR":
        #     def _setup_two_factor(user_id, headers):
        #         return setup_two_factor(operation["name"], schema_name, user_id, headers)
        #     return _setup_two_factor

        # if operation["name"] == "TWO_FACTOR_VERIFY":
        #     def _verify_two_factor(user_id, headers):
        #         return verify_two_factor(operation["name"], schema_name, user_id, headers)
        #     return _verify_two_factor

        # if operation["name"] == "SESSIONS":
        #     def _get_sessions(user_id, headers):
        #         return get_sessions(operation["name"], schema_name, user_id, headers)
        #     return _get_sessions
        
        if operation["name"] == "UNIQUE_EMAIL":
            def _unique_email(body, headers):
                return unique_key_validator(operation["name"], schema_name, headers, 'email', body['value'])
            return _unique_email
        
        if operation["name"] == "UNIQUE_USERNAME":
            def _unique_username(body, headers):
                return unique_key_validator(operation["name"], schema_name, headers, 'username', body['value'])
            return _unique_username
    # Dynamically create routes for each schema and operation
    schemas = _load_json(config['schemas'])['schemas']
    for schema in schemas:
        if(schema['type']==1):
            for operation in schema['operations']:
                if(operation["value"]):
                    func = create_api_function(schema, operation)
                    if operation["name"] == "GET_BY_ID" or operation["name"] == 'PUT' or operation["name"] == 'DELETE':
                        # Constructing the path with '<record_id>'
                        path = f"/{schema['name']}/<record_id>"
                    elif operation["name"] == "KVP":
                        path = f"/{schema['name']}/kvp"
                    else:
                        # Constructing the path without '<record_id>'
                        path = f"/{schema['name']}"
                    method = "GET" if operation["name"] in ["GET_ALL", "GET_BY_ID"] else operation["name"]
                    api_route(path, method)(func)
        elif schema['type']==2:
            for operation in schema['operations']:
                if operation["value"]:
                    func = create_api_function(schema, operation)
                    # Determine the API path based on the operation
                    base_url = f"/{schema['name']}"

                    if operation["name"] in ["GET_BY_ID", "PUT", "DELETE"]:
                        # Operations that require a record ID in the URL path
                        path = f"{base_url}/<record_id>"
                    elif operation["name"] == "KVP":
                        # Special path for key-value pair operation
                        path = f"{base_url}/kvp"
                    elif operation["name"] in ["ME", "REGISTER", "LOGIN", "LOGOUT", "PASSWORD_RESET_REQUEST", "RESET_PASSWORD", "CHANGE_PASSWORD", "VERIFY_EMAIL_REQUEST", "VERIFY_EMAIL", "REFRESH_TOKEN", "TWO_FACTOR", "TWO_FACTOR_VERIFY"]:
                        # These operations require a specific action in the URL path
                        path = f"{base_url}/{operation['name'].lower()}"
                    elif operation["name"] in ["UNIQUE_EMAIL", "UNIQUE_USERNAME"]:
                        # Unique check operations might require specific paths
                        path = f"{base_url}/check/{operation['name'].lower()}"
                    else:
                        # Generic path for operations not requiring specific URL parameters
                        path = base_url

                    # Determine the HTTP method based on the operation name
                    if operation["name"] in ["GET_ALL", "GET_BY_ID", "KVP", "ME", "SESSIONS"]:
                        method = "GET"
                    elif operation["name"] in ["POST", "REGISTER", "LOGIN", "LOGOUT", "PASSWORD_RESET_REQUEST", "RESET_PASSWORD", "CHANGE_PASSWORD", "VERIFY_EMAIL_REQUEST", "VERIFY_EMAIL", "REFRESH_TOKEN", "TWO_FACTOR", "TWO_FACTOR_VERIFY", "UNIQUE_EMAIL", "UNIQUE_USERNAME"]:
                        method = "POST"
                    elif operation["name"] == "PUT":
                        method = "PUT"
                    elif operation["name"] == "DELETE":
                        method = "DELETE"
                    
                    # Register the API route with the web framework
                    api_route(path, method)(func)