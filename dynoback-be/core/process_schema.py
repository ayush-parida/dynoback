import json
from api.database import DatabaseManagement
from core.database import init_db_pools

def connect_dbs(config):
    databases = DatabaseManagement(config)
    dbs = databases._read_dbs()
    return init_db_pools([db for db in dbs if db['isActive']])

def read_json_schemas(file_path='schema.json'):
    with open(file_path, 'r') as file:
        return json.load(file)
    
def process_schemas(config):
    db_pools = connect_dbs(config)
    print(db_pools)
    return {"status": 200, "response": {"processed": True}}