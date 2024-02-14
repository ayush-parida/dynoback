from http.server import HTTPServer, SimpleHTTPRequestHandler
from api.handler import HTTPRequestHandler
from api.api import routes
from api.admin import loadAdminApi
import psycopg_pool
import subprocess

def init_db_pools(dbs_config):
    db_pools = {}
    for db_config in dbs_config:
        connInfo = f"dbname={db_config['name']} user={db_config['user']} password={db_config['password']} host={db_config['host']} port={db_config.get('port', 5432)}"
        pool_key = f"{db_config['name']}@{db_config['host']}"
        db_pools[pool_key] = psycopg_pool.ConnectionPool(connInfo, min_size=1, max_size=10)
    return db_pools

def start_angular_app():
    # Start the Angular app; ensure the working directory is correctly set
    subprocess.Popen(["npm", "run", "start"], cwd="../dynoback-ui")

def start_server(config):
    db_pool = init_db_pools(config['dbs'])
    # Start the Angular application before starting the HTTP server
    start_angular_app()
    run(ip=config['ip'], port=config['port'], server_class=HTTPServer, handler_class=HTTPRequestHandler, routes=routes, config=config, db_pool=db_pool)

def make_custom_handler(handler, routes, config, db_pool):
    class ArgumentsHTTPRequestHandler(handler):
        def __init__(self, *args, **kwargs):
            self.routes = routes
            self.config = config
            self.db_pool = db_pool
            # It's important to properly initialize the base class
            super().__init__(*args, **kwargs)
        
        # Your existing methods here, modified to use self.routes, self.config, and self.db_pool

    return ArgumentsHTTPRequestHandler

def run(ip, port, server_class, handler_class, routes, config, db_pool):
    server_address = (ip, port)
    handler_class_with_args = make_custom_handler(handler_class, routes, config, db_pool)
    httpd = server_class(server_address, handler_class_with_args)
    loadAdminApi(config)
    httpd.RequestHandlerClass.routes = routes
    print(f'Starting httpd on {ip}:{port}...')
    httpd.serve_forever()


