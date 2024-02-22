import json
import psycopg
from psycopg import OperationalError

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