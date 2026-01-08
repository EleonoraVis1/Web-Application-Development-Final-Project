from django.urls import path, include
from . import views
from .views import Register, Login, ProtectedView, MemeListCreateView, MemeDetailView, RunnerListView, RunnerManageView, VoteCreateView, RunnerCreateView, CurrentUserView, QuizRunnersView, QuizListView, QuizDetailView, QuizSubmitView, StoryListCreateView, StoryDeleteView, ReactionCreateView, UserWebsiteRatingView, TimelineEventListView, TimelineEventManageView,  TimelineReferenceViewSet, TimelineReferencePublicList, MyTokenObtainPairView, MyTokenRefreshView, MileageResultView, MileageHistoryView, StorySearchView
from .views import VoteCreateView, votes_sse_stream

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from django_prometheus import exports

from rest_framework.routers import DefaultRouter
from api import error_handlers

handler400 = 'api.error_handlers.handler400'
handler403 = 'api.error_handlers.handler403'
handler404 = 'api.error_handlers.handler404'
handler500 = 'api.error_handlers.handler500'

router = DefaultRouter()

router.register(r'timeline-events', TimelineEventManageView, basename='timeline-events')
router.register("references", TimelineReferenceViewSet, basename="references")

urlpatterns = [
    path('protected/', ProtectedView.as_view()),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', MyTokenRefreshView.as_view(), name='token_refresh'),
    path('memes/', MemeListCreateView.as_view(), name='meme-list-create'),
    path('memes/<int:pk>/', MemeDetailView.as_view(), name='meme-detail'),
    path("vote/", VoteCreateView.as_view(), name="vote"),
    path("vote/stream/", votes_sse_stream, name="votes-stream"),
    path("runners/", RunnerListView.as_view(), name="runner-list"),
    path("runners/create/", RunnerCreateView.as_view(), name="runner-create"),
    path("runners/<int:pk>/", RunnerManageView.as_view(), name="runner-manage"),
    path("users/me/", CurrentUserView.as_view(), name="user-me"),
    path("login/", views.login_page, name="login-page"),
    path("", views.index_page, name="home"),
    path("", include("django_prometheus.urls")),
    path("register/", views.register_page, name="register-page"),  
    path("register-user/", views.Register.as_view(), name="register-api"),
    path("runners/quiz/", QuizRunnersView.as_view(), name="quiz-runners"),
    path("quizzes/", QuizListView.as_view(), name="quiz-list"),
    path("quizzes/<int:pk>/", QuizDetailView.as_view(), name="quiz-detail"),
    path("quizzes/submit/", QuizSubmitView.as_view(), name="quiz-submit"),
    path("stories/", StoryListCreateView.as_view(), name="stories"),
    path("stories/<int:story_id>/react/", ReactionCreateView.as_view(), name="story-react"),
    path("stories/<int:pk>/delete/", StoryDeleteView.as_view(), name="story-delete"),
    path("stories/search/", StorySearchView.as_view(), name="story-search"),
    path("website-rating/", UserWebsiteRatingView.as_view(), name="website-rating"),
    path("timeline/", TimelineEventListView.as_view(), name="timeline-list"),
    path("", include(router.urls)),
    path("events/<int:event_id>/references/", TimelineReferencePublicList.as_view()),
    path("mileage/", MileageResultView.as_view(), name="mileage"),
    path("mileage/history/", MileageHistoryView.as_view(), name="mileage-history"),
    path("metrics/", exports.ExportToDjangoView, name="django-metrics"),
    path("stats/", views.stats_dashboard, name="stats-dashboard"),

]


