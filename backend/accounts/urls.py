from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    APIKeyViewSet,
    ForgotPasswordView,
    InviteUserView,
    RegisterView,
    ResetPasswordView,
    SetPasswordView,
    UserManagementViewSet,
    UserProfileView,
)

router = DefaultRouter()
router.register(r'api-keys', APIKeyViewSet, basename='api-key')
router.register(r'users', UserManagementViewSet, basename='user-management')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    # users/invite/ must come BEFORE include(router.urls) so the router
    # does not match "invite" as a pk in users/{pk}/
    path('users/invite/', InviteUserView.as_view(), name='invite-user'),
    path('set-password/', SetPasswordView.as_view(), name='set-password'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('', include(router.urls)),
]
