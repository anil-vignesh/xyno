def get_environment_from_request(request, default='sandbox'):
    env = request.META.get('HTTP_X_ENVIRONMENT', default).lower()
    return env if env in ('sandbox', 'production') else default
