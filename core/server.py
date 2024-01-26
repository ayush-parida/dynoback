from http.server import HTTPServer
from api.handler import HTTPRequestHandler
from api.api import routes
from api.admin import loadAdminApi



def start_server(config):
    run(ip=config['ip'], port=config['port'], server_class=HTTPServer, handler_class=HTTPRequestHandler, routes=routes, config=config)

def run(ip, port, server_class, handler_class, routes, config):
    server_address = (ip, port)
    httpd = server_class(server_address, handler_class)
    loadAdminApi(config)
    httpd.RequestHandlerClass.routes = routes  # Pass routes to the HTTPRequestHandler class
    print(f'Starting httpd on port {port}...')
    httpd.serve_forever()