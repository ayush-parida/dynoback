from http.server import SimpleHTTPRequestHandler
import json
from urllib.parse import urlparse, parse_qs
import inspect
class HTTPRequestHandler(SimpleHTTPRequestHandler):
    routes = []
       
    def matches_route(self, path_parts, route_parts):
        if len(path_parts) != len(route_parts):
            return False
        return all(rp.startswith('<') and rp.endswith('>') or rp == pp 
                   for rp, pp in zip(route_parts, path_parts))

    def extract_path_params(self, route_parts, path_parts):
        path_params = {}
        for route_part, path_part in zip(route_parts, path_parts):
            if route_part.startswith('<') and route_part.endswith('>'):
                param_name = route_part.strip('<>')
                path_params[param_name] = path_part
        return path_params
    
    def do_GET(self):
        self.handle_get_request()

    def do_POST(self):
        self.handle_post_or_put_request("POST")

    def do_PUT(self):
        self.handle_post_or_put_request("PUT")

    def do_DELETE(self):
        self.handle_delete_request()

    def handle_get_request(self):
        self.general_handle_request("GET", {})

    def handle_post_or_put_request(self, method):
        body = {}
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        body = json.loads(post_data.decode('utf-8'))
        self.general_handle_request(method, body)

    def handle_delete_request(self):
        self.general_handle_request("DELETE", {})

    def general_handle_request(self, method, body):
        try:
            url = urlparse(self.path)
            path_parts = url.path.strip('/').split('/')
            query_params = parse_qs(url.query)
            query_params = {k: v[0] for k, v in query_params.items()}

            for route in self.routes:
                if route['method'] != method:
                    continue

                route_parts = route['path'].strip('/').split('/')
                if self.matches_route(path_parts, route_parts):
                    path_params = self.extract_path_params(route_parts, path_parts)
                    func_args = inspect.getfullargspec(route['function']).args

                    # Include 'query_params' only if it's expected by the handler function
                    kwargs = {**path_params, **({'body': body} if 'body' in func_args else {})}
                    if 'query_params' in func_args:
                        kwargs['query_params'] = query_params

                    response_data = route['function'](**kwargs)
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(response_data).encode('utf-8'))
                    return

            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error_message = json.dumps({'message': 'Not Found'})
            self.wfile.write(error_message.encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error_message = json.dumps({'message': 'Internal Server Error', 'error': str(e)})
            self.wfile.write(error_message.encode('utf-8'))