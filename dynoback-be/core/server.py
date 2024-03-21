from http.server import HTTPServer, SimpleHTTPRequestHandler
from api.auth import Authentication
from api.dynamic_api import loadSchemasApi
from api.handler import HTTPRequestHandler
from api.api import routes
from api.admin import loadAdminApi
from api.database import loadDatabaseApi
from api.schema import loadSchemaApi
import subprocess




def start_angular_app():
    # Start the Angular app; ensure the working directory is correctly set
    # subprocess.Popen(["npm", "run", "start"], cwd="../dynoback-ui")
    subprocess.Popen("npm run start", shell=True, cwd="../dynoback-ui")

def start_server(config):
    # db_pool = init_db_pools(config['dbs'])
    # Start the Angular application before starting the HTTP server
    start_angular_app()
    run(ip=config['ip'], port=config['port'], server_class=HTTPServer, handler_class=HTTPRequestHandler, routes=routes, config=config)

def make_custom_handler(handler, routes, config):
    class ArgumentsHTTPRequestHandler(handler):
        def __init__(self, *args, **kwargs):
            self.routes = routes
            self.config = config
            # It's important to properly initialize the base class
            super().__init__(*args, **kwargs)
        
        # Your existing methods here, modified to use self.routes, self.config, and self.db_pool

    return ArgumentsHTTPRequestHandler

def run(ip, port, server_class, handler_class, routes, config):
    server_address = (ip, port)
    handler_class_with_args = make_custom_handler(handler_class, routes, config)
    httpd = server_class(server_address, handler_class_with_args)
    authentication = Authentication(config)
    loadAdminApi(config, authentication)
    loadDatabaseApi(config, authentication)
    loadSchemaApi(config, authentication)
    loadSchemasApi(config, authentication)
    httpd.RequestHandlerClass.routes = routes
    print(f'Starting httpd on {ip}:{port}...')
    httpd.serve_forever()


