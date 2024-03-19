def map_field_to_postgres_type(name, field):
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

    # Replace spaces with underscores in field names
    field_name = name.replace(' ', '_')
    
    col_type = type_mapping.get(field['type'], 'TEXT')
    constraints = []
    default_value = field.get('default', None)

    if default_value is not None:
        default_clause = f"DEFAULT '{default_value}'"
        default_clause = '' #removing default for now
    else:
        default_clause = ''

    if field.get('required'):
        constraints.append('NOT NULL')

    if field.get('unique'):
        constraints.append('UNIQUE')

    if 'options' in field:
        options = field['options']
        if field['type'] in ['text', 'email', 'url', 'editor'] and options.get('nonEmpty', field.get('required')):
            constraints.append('NOT NULL')
        if field['type'] == 'number':
            if options.get('min') is not None:
                constraints.append(f"CHECK ({field_name} >= {options['min']})")
            if options.get('max') is not None:
                constraints.append(f"CHECK ({field_name} <= {options['max']})")
            if options.get('noDecimal'):
                col_type = 'INTEGER'
        if field['type'] == 'bool' and options.get('nonFalsey'):
            default_clause = "DEFAULT TRUE"
        if field['type'] == 'date':
            if options.get('minDate'):
                constraints.append(f"CHECK ({field_name} >= '{options['minDate']}')")
            if options.get('maxDate'):
                constraints.append(f"CHECK ({field_name} <= '{options['maxDate']}')")
        if field['type'] == 'select':
            if options.get('values'):
                values_list = ', '.join([f"'{value}'" for value in options['values']])
                constraints.append(f"CHECK ({field_name} IN ({values_list}))")
            if options.get('nonEmpty', field.get('required')):
                constraints.append('NOT NULL')

        if field['type'] == 'relation':
            related_table = options.get('relatedTableName')
            related_column = options.get('relatedColumnName', 'uuid')
            cascade = "ON DELETE CASCADE" if options.get('cascadeDelete') else ""
            constraints.append(f"REFERENCES {related_table}({related_column}) {cascade}".strip())
            if options.get('nonEmpty', field.get('required')):
                constraints.append('NOT NULL')

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
        column_definition = f"{field['name'].replace(' ', '_')} {map_field_to_postgres_type(field['name'], field)}"
        columns_definitions.append(column_definition)
    
    # Handle relations and file fields within the loop if necessary
    # This could involve adding FOREIGN KEY constraints or handling file storage references
    
    create_table_statement = f"CREATE TABLE {table_name} (\n    " + ",\n    ".join(columns_definitions) + "\n);"
    return create_table_statement

def generate_postgres_alter_table_statements(old_schema, new_schema):
    """Generates ALTER TABLE statements for schema updates, including handling for default values, unique constraints, and required (NOT NULL) constraints."""
    old_fields = {field['name'].replace(' ', '_'): field for field in old_schema.get('schema', [])}
    new_fields = {field['name'].replace(' ', '_'): field for field in new_schema.get('schema', [])}
    table_name = old_schema['name']
    statements = []

    # Handle removed fields
    for old_field_name in set(old_fields) - set(new_fields):
        statements.append(f"ALTER TABLE {table_name} DROP COLUMN IF EXISTS \"{old_field_name}\" CASCADE;")

    for new_field_name, new_field in new_fields.items():
        new_field_name_sanitized = new_field_name.replace(' ', '_')
        column_definition = map_field_to_postgres_type(new_field_name, new_field)
        if new_field_name_sanitized not in old_fields:
            statements.append(f"ALTER TABLE {table_name} ADD COLUMN \"{new_field_name_sanitized}\" {column_definition};")
        else:
            old_field = old_fields[new_field_name_sanitized]
            old_column_definition = map_field_to_postgres_type(new_field_name, old_field)
            if column_definition != old_column_definition:
                col_type = column_definition.split(' ')[0]
                statements.append(f"ALTER TABLE {table_name} ALTER COLUMN \"{new_field_name_sanitized}\" TYPE {col_type};")
            
            # Handling default value changes or additions
            new_default = new_field.get('options', {}).get('default')
            old_default = old_field.get('options', {}).get('default')
            if new_default is not None:
                statements.append(f"ALTER TABLE {table_name} ALTER COLUMN \"{new_field_name_sanitized}\" SET DEFAULT '{new_default}';")
            elif old_default is not None and new_default is None:
                statements.append(f"ALTER TABLE {table_name} ALTER COLUMN \"{new_field_name_sanitized}\" DROP DEFAULT;")

            # Handling removal of NOT NULL if required
            if old_field.get('required') and not new_field.get('required'):
                statements.append(f"ALTER TABLE {table_name} ALTER COLUMN \"{new_field_name_sanitized}\" DROP NOT NULL;")
            elif not old_field.get('required') and new_field.get('required'):
                statements.append(f"ALTER TABLE {table_name} ALTER COLUMN \"{new_field_name_sanitized}\" SET NOT NULL;")

        # Handling unique constraint changes
        old_unique = old_field.get('unique', False) if old_field else False
        new_unique = new_field.get('unique', False)
        unique_constraint_name = f"{table_name}_{new_field_name_sanitized}_key"
        unique_index_name = f"idx_{table_name}_{new_field_name_sanitized}_unique"
        
        if old_unique and not new_unique:
            # Drop the unique index if the unique constraint should be removed
            # statements.append(f"DROP INDEX IF EXISTS \"{unique_index_name}\";")
            statements.append(f"ALTER TABLE {table_name} DROP CONSTRAINT {unique_constraint_name};")
        elif not old_unique and new_unique:
            # Create a unique index if the unique constraint should be added
            # statements.append(f"CREATE UNIQUE INDEX \"{unique_index_name}\" ON {table_name} ({new_field_name_sanitized});")
            pass

    return statements

def generate_postgres_drop_table_statement(table_name):
    """Generates a PostgreSQL DROP TABLE statement for a given table name."""
    # Sanitizing the table name to prevent SQL injection
    sanitized_table_name = table_name.replace('"', '').replace(';', '')
    drop_table_statement = f"DROP TABLE IF EXISTS \"{sanitized_table_name}\" CASCADE;"
    return drop_table_statement
