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
        'select': 'TEXT[]',  # Updated to always use an array
        'file': 'TEXT',
        'json': 'JSONB',
        'relation': 'UUID'  # Updated to always use an array
    }

    # Replace spaces with underscores in field names
    field_name = name.replace(' ', '_')
    
    col_type = type_mapping.get(field['type'], 'TEXT')
    constraints = []
    default_value = field.get('default', None)

    if default_value is not None:
        default_clause = ''  # removing default for now, as you've indicated

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
            constraints.append("DEFAULT TRUE")
        if field['type'] == 'date':
            if options.get('minDate'):
                constraints.append(f"CHECK ({field_name} >= '{options['minDate']}')")
            if options.get('maxDate'):
                constraints.append(f"CHECK ({field_name} <= '{options['maxDate']}')")
        if field['type'] == 'select':
            if options.get('values'):
                values_list = ', '.join([f"'{value}'" for value in options['values']])
                constraints.append(f"CHECK ({field_name}::TEXT[] <@ ARRAY[{values_list}])")
            if options.get('nonEmpty', field.get('required')):
                constraints.append('NOT NULL')
        if field['type'] == 'relation':
            related_table = options.get('relatedTableName')
            related_column = options.get('relatedColumnName', 'uuid')
            cascade = "ON DELETE CASCADE" if options.get('cascadeDelete') else ""
            constraints.append(f"REFERENCES {related_table}({related_column}) {cascade}".strip())
            if options.get('nonEmpty', field.get('required')):
                constraints.append('NOT NULL')

    column_definition = f"{field_name} {col_type} {' '.join(constraints)}".strip()
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
        column_definition = f" {map_field_to_postgres_type(field['name'], field)}"
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
        
    # Handle changes in existing fields
    for new_field_name, new_field in new_fields.items():
        new_field_name_sanitized = new_field_name.replace(' ', '_')
        print("=========++>>")
        print(new_field_name_sanitized)
        print(old_fields)
        print("=========++>>")
        if new_field_name_sanitized in old_fields:
            old_field = old_fields[new_field_name_sanitized]
            old_column_definition = map_field_to_postgres_type(new_field_name, old_field)
            new_column_definition = map_field_to_postgres_type(new_field_name, new_field)
            # If column definition changed
            if new_column_definition != old_column_definition:
                col_type = new_column_definition.split(' ')[0]
                statements.append(f"ALTER TABLE {table_name} ALTER COLUMN \"{new_field_name_sanitized}\" TYPE {col_type};")
            
            # Handling default value changes or additions
            new_default = new_field.get('options', {}).get('default')
            old_default = old_field.get('options', {}).get('default')
            if new_default is not None and new_default != old_default:
                statements.append(f"ALTER TABLE {table_name} ALTER COLUMN \"{new_field_name_sanitized}\" SET DEFAULT '{new_default}';")
            elif old_default is not None and new_default is None:
                statements.append(f"ALTER TABLE {table_name} ALTER COLUMN \"{new_field_name_sanitized}\" DROP DEFAULT;")

            # Handling removal of NOT NULL if required
            old_required = old_field.get('required', False)
            new_required = new_field.get('required', False)
            if old_required and not new_required:
                statements.append(f"ALTER TABLE {table_name} ALTER COLUMN \"{new_field_name_sanitized}\" DROP NOT NULL;")
            elif not old_required and new_required:
                statements.append(f"ALTER TABLE {table_name} ALTER COLUMN \"{new_field_name_sanitized}\" SET NOT NULL;")
            
            # Handling unique constraint changes
            old_unique = old_field.get('unique', False)
            new_unique = new_field.get('unique', False)
            if old_unique != new_unique:
                unique_constraint_name = f"{table_name}_{new_field_name_sanitized}_key"
                if new_unique:
                    statements.append(f"ALTER TABLE {table_name} ADD CONSTRAINT {unique_constraint_name} UNIQUE (\"{new_field_name_sanitized}\");")
                else:
                    statements.append(f"ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {unique_constraint_name};")
            
            # Handling maxSelect constraint changes
            old_max_select = old_field.get('options', {}).get('maxSelect', 1)
            new_max_select = new_field.get('options', {}).get('maxSelect', 1)
            if old_max_select != new_max_select:
                if new_max_select == 1:
                    statements.append(f"ALTER TABLE {table_name} ALTER COLUMN \"{new_field_name_sanitized}\" SET NOT NULL;")
                    statements.append(f"ALTER TABLE {table_name} DROP CONSTRAINT IF EXISTS {table_name}_{new_field_name_sanitized}_max_select;")
                else:
                    statements.append(f"ALTER TABLE {table_name} ADD CONSTRAINT {table_name}_{new_field_name_sanitized}_max_select CHECK (cardinality(\"{new_field_name_sanitized}\") <= {new_max_select});")
        else:
            # New field handling
            column_definition = map_field_to_postgres_type(new_field_name, new_field)
            statements.append(f"ALTER TABLE {table_name} ADD COLUMN {column_definition};")
    return statements

def generate_postgres_drop_table_statement(table_name):
    """Generates a PostgreSQL DROP TABLE statement for a given table name."""
    # Sanitizing the table name to prevent SQL injection
    sanitized_table_name = table_name.replace('"', '').replace(';', '')
    drop_table_statement = f"DROP TABLE IF EXISTS \"{sanitized_table_name}\" CASCADE;"
    return drop_table_statement
