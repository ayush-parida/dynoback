from http.server import SimpleHTTPRequestHandler
import json
from urllib.parse import urlparse, parse_qs
import inspect

class HTTPRequestHandler(SimpleHTTPRequestHandler):
    config = {}
    routes = []
    def _set_headers(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        
        # Get the origin from the incoming request
        origin = self.headers.get('Origin')
        # Check if the origin is one of the allowed origins
        allowed_origins = self.config['origins']
        if origin in allowed_origins:
            self.send_header('Access-Control-Allow-Origin', origin)
        else:
            # Optionally, handle the case where the origin is not allowed
            self.send_header('Access-Control-Allow-Origin', 'null')  # Deny access, or handle as needed
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization')
        self.end_headers()
        
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
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._set_headers()
        
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
        # try:
            url = urlparse(self.path)
            path_parts = url.path.strip('/').split('/')
            query_params = parse_qs(url.query)
            query_params = {k: v[0] for k, v in query_params.items()}
            headers = dict(self.headers)

            for route in self.routes:
                route_parts = route['path'].strip('/').split('/')
                if route['method'] == method and self.matches_route(path_parts, route_parts):
                    
                    path_params = self.extract_path_params(route_parts, path_parts)
                    func_args = inspect.getfullargspec(route['function']).args
                    kwargs = {k: v for k, v in path_params.items() if k in func_args}
                    if 'body' in func_args:
                        kwargs['body'] = body
                    if 'query_params' in func_args:
                        kwargs['query_params'] = query_params
                    if 'headers' in func_args:
                        kwargs['headers'] = headers  
                        
                    result = route['function'](**kwargs)
                    print(result)
                    self._set_headers(status=result.get('status', 200))
                    self.end_headers()
                    self.wfile.write(json.dumps(result.get('response', {})).encode('utf-8'))
                    return

            self._set_headers(status=404)
            self.wfile.write(json.dumps({'message': 'Not Found'}).encode('utf-8'))
        # except Exception as e:
        #     # if e == 'Authorization':
        #     #     self._set_headers(status=401)
        #     #     self.wfile.write(json.dumps({'message': 'Invalid or expired token', 'error': str(e)}).encode('utf-8'))
        #     # else:
        #         self._set_headers(status=500)
        #         self.wfile.write(json.dumps({'message': 'Internal Server Error', 'error': str(e)}).encode('utf-8'))
            
