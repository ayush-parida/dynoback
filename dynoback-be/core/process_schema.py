import json
from api.database import DatabaseManagement
from core.database import fetch_db, execute_query
from core.query import generate_postgres_alter_table_statements, generate_postgres_create_table, generate_postgres_drop_table_statement


def read_dbs(config):
    databases = DatabaseManagement(config)
    dbs = databases._read_dbs()
    return [db for db in dbs if db['isActive']]

def get_related_table_name(schema_id, schemas):
    schemas =schemas
    for schema in schemas:
            if schema['uuid'] == schema_id and schema['isActive']:
                return schema['name']

    
def process_create_schema(config, schema, schemas):
    db_conns = read_dbs(config)
    db_conn = fetch_db(schema['connectionPoolId'], db_conns)
    for col in schema['schema']:
        if(col['type']=='relation'):
            col['options']['relatedTableName'] = get_related_table_name(col['options']['relatedTableUuid'], schemas)
    query = generate_postgres_create_table(schema)
    conn = execute_query(query, db_conn)
    if(conn):
        return {"status": 200, "response": {"status": conn, "message": "Schema Created Successfully"}}
    else:
        return {"status": 400, "response": {"status": conn, "message": "Schema Create Failed"}}


def process_edit_schema(config, old_schema, schema, schemas):
    db_conns = read_dbs(config)
    db_conn = fetch_db(schema['connectionPoolId'], db_conns)
    for col in schema['schema']:
        if(col['type']=='relation'):
            col['options']['relatedTableName'] = get_related_table_name(col['options']['relatedTableUuid'], schemas)
    query = generate_postgres_alter_table_statements(old_schema, schema)
    print(query)
    print('-------------query')
    conn = execute_query('\n'.join(query), db_conn)
    if(conn):
        return {"status": 200, "response": {"status": conn, "message": "Schema Altered Successfully"}}
    else:
        return {"status": 400, "response": {"status": conn, "message": "Schema Alter Failed"}}
    
def process_delete_schema(config, schema):
    db_conns = read_dbs(config)
    db_conn = fetch_db(schema['connectionPoolId'], db_conns)
    query = generate_postgres_drop_table_statement(schema['name'])
    conn = execute_query(query, db_conn)
    if(conn):
        return {"status": 200, "response": {"status": conn, "message": "Schema Deleted Successfully"}}
    else:
        return {"status": 400, "response": {"status": conn, "message": "Schema Delete Failed"}}