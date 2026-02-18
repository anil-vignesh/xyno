from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Grants access only to users with role='admin'."""
    message = 'Admin role required.'

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'admin'
        )
