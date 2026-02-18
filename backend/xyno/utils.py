def get_environment_from_request(request, default='sandbox'):
    """
    Return the environment to use for this request.

    Developers are always locked to sandbox regardless of the X-Environment
    header they send. Admins may switch freely between sandbox and production.
    Unauthenticated requests (e.g. SetPasswordView) fall back to the default.
    """
    user = getattr(request, 'user', None)
    if user and user.is_authenticated and getattr(user, 'role', 'developer') == 'developer':
        return 'sandbox'

    env = request.META.get('HTTP_X_ENVIRONMENT', default).lower()
    return env if env in ('sandbox', 'production') else default
