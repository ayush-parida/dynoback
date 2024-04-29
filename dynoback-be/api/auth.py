import base64
import time
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
import jwt
import json 

def _load_json(file_path):
        with open(file_path, 'r') as file:
            return json.load(file)
        
class Authentication:
    def __init__(self, config):
        self.config = config
        self.schemas = _load_json(config['schemas'])['schemas']
    
    
    def _get_schema_details_by_name(self, schema_name):
        for schema in self.schemas:
            if schema['name'] == schema_name:
                return schema
        return None
    
    def _get_schema_details(self, schema_uuid):
        for schema in self.schemas:
            if schema['uuid'] == schema_uuid:
                return schema
        return None

    def validate_admin_token(self, token):
        try:
            decoded_data = base64.b64decode(token).decode()
            email, timestamp, uuid = decoded_data.split(':')
            timestamp = float(timestamp)

            if time.time() - timestamp > self.config['adminTokenExpiry']:
                return {"status": False, "decoded": {}}

            return {"status": True, "decoded": {"email": email, "uuid": uuid}}
        except Exception:
            return {"status": False, "decoded": {}}
        
    def validate_auth_token(self, schema, token):
        """Validate the JWT token.
        
        Args:
            token (str): The JWT token to validate.
            secret_key (str): The secret key used to decode the JWT.

        Returns:
            dict: A dictionary containing the status of validation and the token's decoded data if valid.
        """
        try:
            # Decode the token
            decoded = jwt.decode(token, schema['secret_key'], algorithms=["HS256"])
            return {
                "status": True,
                "decoded": decoded
            }
        except ExpiredSignatureError:
            # Token has expired
            return {
                "status": False,
                "error": "Token has expired"
            }
        except InvalidTokenError as e:
            # Token is invalid for some other reason
            return {
                "status": False,
                "error": f"Invalid token: {str(e)}"
            }
        except Exception as e:
            # Other errors
            return {
                "status": False,
                "error": f"Token validation error: {str(e)}"
            }
    
    def validate_token(self, schema_name, token, operation_name):
        schema = self._get_schema_details_by_name(schema_name)
        if not schema:
            return {"status": False, "error": "Schema not found"}

        # Checking access rules
        for operation in schema['operations']:
            if operation['name']==operation_name:
                for access_rule in operation['access']:
                    if access_rule['name'] == 'anyone' and access_rule['value'] is True:
                        # No authentication required
                        return {"status": True, "decoded": {}}

                    if isinstance(access_rule['value'], bool) and access_rule['value'] is True:
                        if access_rule['name'] == 'admin':
                            # Validate admin token
                            admin_validation = self.validate_admin_token(token)
                            if admin_validation['status']:
                                return admin_validation
                        # Other rules that require token validation are added here
                    elif isinstance(access_rule['value'], str):
                        # Attempt to decode token for UUID extraction without verifying the signature
                        try:
                            decoded_token = jwt.decode(token, options={"verify_signature": False})
                            token_uuid = decoded_token.get('uuid')
                            if token_uuid == access_rule['value']:
                                # Validate token for a specific user by UUID
                                return self.validate_auth_token(schema, token)
                        except Exception as e:
                            return {"status": False, "error": f"Failed to decode token: {str(e)}"}

        return {"status": False, "error": "Access denied"}