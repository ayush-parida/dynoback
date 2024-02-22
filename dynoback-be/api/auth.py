import base64
import time

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