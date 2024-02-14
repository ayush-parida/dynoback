import json
from core.server import start_server
import os
config_file_path = os.getcwd() + '/configs.json'
# try:
with open(config_file_path, 'r') as file:
    data = json.load(file)
    
if __name__ == '__main__':
    start_server(config=data)
# except FileNotFoundError:
#     print("Config File not found.")
# except json.JSONDecodeError:
#     print("Error decoding Config JSON.")
