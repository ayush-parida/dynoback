from http.server import HTTPServer
from api.handler import HTTPRequestHandler
from api.api import routes

def start_server(config):
    run(port=config['port'], server_class=HTTPServer, handler_class=HTTPRequestHandler, routes=routes)

def run(port, server_class, handler_class, routes):
    server_address = ('0.0.0.0', port)
    httpd = server_class(server_address, handler_class)
    httpd.RequestHandlerClass.routes = routes  # Pass routes to the HTTPRequestHandler class
    print(f'Starting httpd on port {port}...')
    httpd.serve_forever()