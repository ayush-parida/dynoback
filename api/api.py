def handle_api(headers):
    return {'response': 'API server running', 'headers': headers}

def handle_info(query_params, headers):
    response = {'response': 'Info API', 'headers': headers}
    check = query_params.get('check')
    if check is not None:
        response['check'] = query_params['check']
    return response

def handle_info_detail(id, query_params, headers):
    response = {'response': f'Selected user {id}', 'headers': headers}
    check = query_params.get('check')
    if check is not None:
        response['check'] = check
    return response

def handle_user(id, query_params, headers):
    response = {'response': f'Selected user {id}', 'headers': headers}
    check = query_params.get('check')
    if check is not None:
        response['check'] = check
    expanded = query_params.get('expanded')
    if expanded is not None:
        response['expanded'] = expanded
    return response

def handle_types(id, active, parent, query_params, headers):
    response = {'response': f'Selected type {id}, active {active}, parent {parent}', 'headers': headers}
    check = query_params.get('check')
    if check is not None:
        response['check'] = check
    expanded = query_params.get('expanded')
    if expanded is not None:
        response['expanded'] = expanded
    return response

def post_info(body, query_params, headers):
    response = {'body': body, 'params': query_params, 'headers': headers}
    return response

def put_info(id, body, query_params, headers):
    response = {'body': body, 'element': id, 'params': query_params, 'headers': headers}
    return response

def delete_info(id, headers):
    return {"Deleted": id, 'headers': headers}

routes = [
    {
        "path": "/api",
        "function": handle_api,
        "method": "GET"
    },
    {
        "path": "/api/info",
        "function": handle_info,
        "method": "GET"
    },
    {
        "path": "/api/info/<id>",
        "function": handle_info_detail,
        "method": "GET"
    },
    {
        "path": "/api/user/<id>",
        "function": handle_user,
        "method": "GET"
    },
    {
        "path": "/api/types/<id>/<active>/<parent>",
        "function": handle_types,
        "method": "GET"
    },
    {
        "path": "/api/info",
        "function": post_info,
        "method": "POST"
    },
    {
        "path": "/api/info/<id>",
        "function": put_info,
        "method": "PUT"
    },
    {
        "path": "/api/info/<id>",
        "function": delete_info,
        "method": "DELETE"
    }
]

def __add_route(path, function, method):
    new_route = {
        "path": path,
        "function": function,
        "method": method
    }
    routes.append(new_route)

def api_route(path, method):
    def decorator(func):
        __add_route(path, func, method)
        return func
    return decorator


