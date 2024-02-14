import json
from core.server import init_db_pools

def map_field_to_postgres_type(field):
    """Maps a JSON schema field to a PostgreSQL column type, constraints, and default values based on options."""
    type_mapping = {
        'text': 'TEXT',
        'editor': 'TEXT',
        'number': 'INTEGER',
        'bool': 'BOOLEAN',
        'email': 'TEXT',
        'url': 'TEXT',
        'date': 'TIMESTAMP WITHOUT TIME ZONE',
        'select': 'TEXT',
        'file': 'TEXT',
        'json': 'JSONB',
        'relation': 'UUID'
    }

    col_type = type_mapping.get(field['type'], 'TEXT')
    constraints = []
    default_value = field.get('options', {}).get('default', None)

    if default_value is not None:
        default_clause = f"DEFAULT '{default_value}'"
    else:
        default_clause = ''

    if field.get('options'):
        options = field['options']
        if field['type'] in ['text', 'email', 'url', 'editor'] and options.get('nonEmpty'):
            constraints.append('NOT NULL')
        if field['type'] == 'number':
            if options.get('min') is not None:
                constraints.append(f"CHECK ({field['name']} >= {options['min']})")
            if options.get('max') is not None:
                constraints.append(f"CHECK ({field['name']} <= {options['max']})")
            if options.get('noDecimal'):
                col_type = 'INTEGER'
        if field['type'] == 'bool' and options.get('nonFalsey'):
            default_clause = "DEFAULT TRUE"
        if field['type'] == 'date':
            if options.get('minDate'):
                constraints.append(f"CHECK ({field['name']} >= '{options['minDate']}')")
            if options.get('maxDate'):
                constraints.append(f"CHECK ({field['name']} <= '{options['maxDate']}')")
        if field['type'] == 'select':
            if options.get('values'):
                values_list = ', '.join([f"'{value}'" for value in options['values']])
                constraints.append(f"CHECK ({field['name']} IN ({values_list}))")
            if options.get('nonEmpty'):
                constraints.append('NOT NULL')
        if field['type'] == 'json' and options.get('maxSize'):
            # Note: maxSize handling might be more complex and require application-level validation
            pass
        if field['type'] == 'relation':
            related_table = field['options'].get('relatedTableName')
            related_column = field['options'].get('relatedColumnName', 'uuid')
            cascade = "ON DELETE CASCADE" if field['options'].get('cascadeDelete') else ""
            constraints.append(f"REFERENCES {related_table}({related_column}) {cascade}".strip())

            if field['options'].get('nonEmpty'):
                constraints.append('NOT NULL')

    # Combine type, constraints, and default clause
    column_definition = f"{col_type} {' '.join(constraints)} {default_clause}".strip()
    return column_definition


def generate_postgres_create_table(json_schema):
    """Generates a PostgreSQL CREATE TABLE statement from a JSON schema, including special handling based on table type."""
    table_name = json_schema['name']
    table_type = json_schema.get('type', 'base')  # Default to 'base' if not specified
    
    # Common columns for all tables
    columns_definitions = [
        "uuid UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        "created TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP",
        "updated TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP",
        "is_active BOOLEAN DEFAULT TRUE"
    ]
    
    # Additional columns for 'auth' table type
    if table_type == 'auth':
        columns_definitions.extend([
            "username TEXT UNIQUE",
            "email TEXT UNIQUE",
            "verified BOOLEAN DEFAULT FALSE",
            "show_email BOOLEAN DEFAULT TRUE",
            "password TEXT"
        ])
    
    for field in json_schema.get('schema', []):
        column_definition = f"{field['name']} {map_field_to_postgres_type(field)}"
        columns_definitions.append(column_definition)
    
    # Handle relations and file fields within the loop if necessary
    # This could involve adding FOREIGN KEY constraints or handling file storage references
    
    create_table_statement = f"CREATE TABLE {table_name} (\n    " + ",\n    ".join(columns_definitions) + "\n);"
    return create_table_statement

def generate_alter_table_statements(old_schema, new_schema):
    """Generates ALTER TABLE statements for schema updates, including handling for default values and relation changes."""
    old_fields = {field['name']: field for field in old_schema.get('schema', [])}
    new_fields = {field['name']: field for field in new_schema.get('schema', [])}
    table_name = new_schema['name']
    statements = []

    # Handle removed fields
    for old_field_name in set(old_fields) - set(new_fields):
        statements.append(f"ALTER TABLE {table_name} DROP COLUMN IF EXISTS {old_field_name} CASCADE;")

    # Handle added, modified fields, and default values
    for new_field_name, new_field in new_fields.items():
        column_definition = map_field_to_postgres_type(new_field)
        if new_field_name not in old_fields:
            # Add new column along with its type and default value if specified
            statements.append(f"ALTER TABLE {table_name} ADD COLUMN {new_field_name} {column_definition};")
        else:
            old_field = old_fields[new_field_name]
            old_column_definition = map_field_to_postgres_type(old_field)
            # Check if the column type or constraints have changed
            if column_definition != old_column_definition:
                # If type has changed, generate ALTER COLUMN TYPE statement
                # This assumes column_definition starts with the type info
                col_type = column_definition.split()[0]
                statements.append(f"ALTER TABLE {table_name} ALTER COLUMN {new_field_name} TYPE {col_type};")
            # Check and update default value if it has changed or needs to be added
            if 'default' in new_field.get('options', {}):
                default_value = new_field['options']['default']
                statements.append(f"ALTER TABLE {table_name} ALTER COLUMN {new_field_name} SET DEFAULT '{default_value}';")
            elif 'default' in old_field.get('options', {}) and 'default' not in new_field.get('options', {}):
                # Remove default if it was in old field but not in new
                statements.append(f"ALTER TABLE {table_name} ALTER COLUMN {new_field_name} DROP DEFAULT;")

    # Ensure standard fields are present (uuid, created, updated, is_active)
    standard_fields = [
        ("uuid", "UUID PRIMARY KEY DEFAULT gen_random_uuid()"),
        ("created", "TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP"),
        ("updated", "TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP"),
        ("is_active", "BOOLEAN DEFAULT TRUE")
    ]
    for field_name, field_definition in standard_fields:
        if field_name not in new_fields:
            statements.append(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {field_name} {field_definition};")

    return statements

def fetch_current_schema(conn, table_name):
    current_schema = []
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = %s
            ORDER BY ordinal_position;
        """, (table_name,))
        for row in cur.fetchall():
            # Simplified schema representation
            field = {
                'name': row[0],
                'type': row[1],  # You might need to map PostgreSQL data types to your schema's data type representation
                'required': row[2] == 'NO',
                'default': row[3],
                # Add more attributes as necessary
            }
            current_schema.append(field)
    return {'name': table_name, 'schema': current_schema}

def read_json_schemas(file_path='pb_schema.json'):
    with open(file_path, 'r') as file:
        return json.load(file)

def table_exists(conn, table_name):
    with conn.cursor() as cur:
        cur.execute("SELECT to_regclass(%s);", (table_name,))
        return cur.fetchone()[0] is not None

def execute_statements(conn, statements):
    """Executes a list of SQL statements with basic error handling."""
    with conn.cursor() as cur:
        for statement in statements:
            try:
                cur.execute(statement)
            except Exception as e:
                conn.rollback()  # Roll back any changes made during the transaction
                print(f"Error executing statement: {statement}\nError: {e}")
                return False  # Optionally, halt execution on error
        conn.commit()
    return True

def get_conn_string(db_conns, conn_id):
    for conn in db_conns:
        if conn["id"] == conn_id:
            return f'{conn["name"]}@{conn["host"]}'
    return "Connection ID not found"

def process_schemas(db_pools, db_conns, schemas):
    for schema in schemas:
        # Retrieve the connection pool using the provided ID in the schema entry.
        db_pool_id = schema['connectionPoolId']
        db_pool_name = get_conn_string(db_conns, db_pool_id)
        db_pool = db_pools.get(db_pool_name)
        if not db_pool:
            print(f"Database pool {db_pool_name} not found.")
            continue
        if not db_pool:
            print(f"Database pool {db_pool_name} not found.")
            continue
        
        with db_pool.connection() as conn:
            table_name = schema['name']
            if not table_exists(conn, table_name):
                create_statement = generate_postgres_create_table(schema)
                print(create_statement)
                execute_statements(conn, [create_statement])
                print(f"Table {table_name} created in pool {db_pool_name}.")
            else:
                # Fetch current schema logic would be here
                # For now, just showing a placeholder for how you might call the alter statements
                current_schema = fetch_current_schema(conn, table_name)
                alter_statements = generate_alter_table_statements(current_schema, schema)
                if alter_statements:
                    execute_statements(conn, alter_statements)
                    print(f"Table {table_name} updated in pool {db_pool_name}.")

def main():
    db_conns = [
        {   
            "id": "ab12",
            "name": "dynoback",
            "user": "infiginiadmin",
            "password": "infigini123",
            "host": "43.204.12.237",
            "port": 5433
        },
    ]
    db_pools = init_db_pools(db_conns)
    
    schemas = read_json_schemas()
    process_schemas(db_pools, db_conns, schemas)

if __name__ == "__main__":
    main()
