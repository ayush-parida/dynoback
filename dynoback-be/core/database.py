import json
import psycopg
from psycopg import OperationalError
import psycopg_pool

def test_db_connection(db_config):
    try:
        # Connect to the PostgreSQL database
        conn = psycopg.connect(
            dbname=db_config['name'],
            user=db_config['user'],
            password=db_config['password'],
            host=db_config['host'],
            port=db_config['port']
        )
        
        # Create a cursor for executing queries
        cur = conn.cursor()
        
        # Execute a simple query
        cur.execute('SELECT VERSION();')
        
        # Fetch the result
        db_version = cur.fetchone()
        print(f"Successfully connected to the database. Version: {db_version[0]}")
        
        # Close the cursor and the connection
        cur.close()
        conn.close()
        
        return True
    except OperationalError as e:
        print(f"An error occurred: {e}")
        return False
    
def init_db_pools(dbs_config):
    db_pools = {}
    for db_config in dbs_config:
        connInfo = f"dbname={db_config['name']} user={db_config['user']} password={db_config['password']} host={db_config['host']} port={db_config.get('port', 5432)}"
        pool_key = f"{db_config['name']}@{db_config['host']}"
        try:
            db_pools[pool_key] = psycopg_pool.ConnectionPool(connInfo, min_size=1, max_size=10)
        except:
            db_pools[pool_key] = False
    return db_pools

def fetch_db(db_uuid, dbs_config):
    for db_config in dbs_config:
        if db_config['uuid'] == db_uuid:
            return db_config

def execute_query(query, db_config):
    try:
        # Connect to the PostgreSQL database
        with psycopg.connect(
                dbname=db_config['name'],
                user=db_config['user'],
                password=db_config['password'],
                host=db_config['host'],
                port=db_config['port']) as conn:
            
            # Automatically commit unless a transaction is explicitly started
            conn.autocommit = True
            
            with conn.cursor() as cur:
                # Execute each command separately
                cur.execute('SELECT VERSION();')
                print(cur.fetchall())  # Print database version information
                
                # Create extension if not exists (for pgcrypto, necessary for gen_random_uuid())
                cur.execute('CREATE EXTENSION IF NOT EXISTS pgcrypto;')
                print(query)
                # Execute the provided query
                cur.execute(query)

        return True
    except OperationalError as e:
        print(f"An error occurred: {e}")
        return False