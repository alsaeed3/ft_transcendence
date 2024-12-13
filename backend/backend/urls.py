from api.views import RegisterView, LoginView, Enable2FAView, Verify2FAView, Disable2FAView, LogoutView, RedirectTo42View, Handle42AuthView, TournamentProxyView, CustomTokenVerifyView
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/user/register/", RegisterView.as_view(), name="register"),
    path("api/user/login/", LoginView.as_view(), name="login"),
	path('api/user/logout/', LogoutView.as_view(), name='logout'),
	path("api/user/2fa/enable/", Enable2FAView.as_view(), name="enable_2fa"),
    path("api/user/2fa/verify/", Verify2FAView.as_view(), name="verify_2fa"),
    path("api/user/2fa/disable/", Disable2FAView.as_view(), name="disable_2fa"),
	path("api/user/token/refresh/", TokenRefreshView.as_view(), name='token_refresh'),
	path('api/user/token/verify/', CustomTokenVerifyView.as_view(), name='token_verify'),
	path("api/auth/42/", RedirectTo42View.as_view(), name='auth_42'),
    path("api/auth/42/redirect/", Handle42AuthView.as_view(), name='auth_42_redirect'),
	path('api/user/tournaments/', TournamentProxyView.as_view(), name='create_tournament')
]
