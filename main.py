import json
from core.server import start_server

config_file_path = './configs.json'

from api.api import api_route
@api_route('/api/new_route', 'GET')
def handle_new_route():
    return {'response': 'API server '}


try:
    with open(config_file_path, 'r') as file:
        data = json.load(file)
        
    if __name__ == '__main__':
        start_server(config=data)
except FileNotFoundError:
    print("Config File not found.")
except json.JSONDecodeError:
    print("Error decoding Config JSON.")