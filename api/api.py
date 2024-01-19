def handle_api():
    return {'response': 'API server running'}

def handle_info(query_params):
    response = {'response': 'Info API'}
    check = query_params.get('check')
    if check is not None:
        response['check'] = query_params['check']
    return response

def handle_info_detail(id, query_params):
    response = {'response': f'Selected user {id}'}
    # Safely get 'check' parameter
    check = query_params.get('check')
    if check is not None:
        response['check'] = check
    return response

def handle_user(id, query_params):
    response = {'response': f'Selected user {id}'}
    check = query_params.get('check')
    if check is not None:
        response['check'] = check
    expanded = query_params.get('expanded')
    if expanded is not None:
        response['expanded'] = expanded
    return response

def handle_types(id, active, parent, query_params):
    response = {'response': f'Selected type {id}, active {active}, parent {parent}'}
    check = query_params.get('check')
    if check is not None:
        response['check'] = check
    expanded = query_params.get('expanded')
    if expanded is not None:
        response['expanded'] = expanded
    return response

def post_info(body, query_params):
    response = body
    if query_params != {}:
        response['params'] = query_params
    return response

def put_info(id, body, query_params):
    response = body
    response['element'] = id
    if query_params != {}:
        response['params'] = query_params
    return response

def delete_info(id):
    return {"Deleted": id}

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

