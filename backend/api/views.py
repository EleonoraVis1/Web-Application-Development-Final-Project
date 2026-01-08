from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, Avg
from django.http import JsonResponse
from rest_framework import status, generics, permissions
from django.contrib.auth import authenticate
from rest_framework.exceptions import ValidationError 
from django.contrib.auth.models import User
from rest_framework import viewsets

from .serializers import MyTokenRefreshSerializer, UserSerializer, MemeSerializer, RunnerSerializer, VoteSerializer, RunnerCreateSerializer, QuizSerializer, QuizSubmitSerializer, StorySerializer, ReactionSerializer, WebsiteRatingSerializer, TimelineEventSerializer, TimelineReferenceSerializer, MyTokenObtainPairSerializer, MileageResultSerializer, MileageInputSerializer
from .models import Meme, Runner, Vote, Quiz, Answer, Story, Reaction, WebsiteRating, TimelineEvent, TimelineReference, MileageResult
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated
from .permissions import IsOwnerOrAdmin
from rest_framework.permissions import IsAdminUser
from django.shortcuts import render
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.decorators import login_required, user_passes_test

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView

from django.db.models import Q

import json
import time
from django.http import StreamingHttpResponse

import logging
logger = logging.getLogger(__name__)

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "username": request.user.username,
            "is_staff": request.user.is_staff
        })

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

class MyTokenRefreshView(TokenRefreshView):
    serializer_class = MyTokenRefreshSerializer



class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"message": f"Hello {request.user.username}, you are authenticated"})


class Register(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "User created successfully",
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "is_admin": user.is_staff
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class Login(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        logger.info(f"Login attempt for username={request.data.get('username')}")
        user = authenticate(username=username, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "Login successful",
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "is_admin": user.is_staff
            }, status=status.HTTP_200_OK)
        logger.warning(f"Failed login attempt for username={request.data.get('username')}")
        return Response({"error": "Invalid username or password"}, status=status.HTTP_400_BAD_REQUEST)


class MemeListCreateView(generics.ListCreateAPIView):
    queryset = Meme.objects.all().order_by('-created_at')
    serializer_class = MemeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        logger.info(f"New meme being created by user {self.request.user.id}")
        serializer.save(user=self.request.user)

class MemeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Meme.objects.all()
    serializer_class = MemeSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]



class RunnerListView(generics.ListAPIView):
    queryset = Runner.objects.all()
    serializer_class = RunnerSerializer

class RunnerManageView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Runner.objects.all()
    serializer_class = RunnerCreateSerializer
    permission_classes = [IsAdminUser]


class VoteCreateView(generics.CreateAPIView):
    serializer_class = VoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        logger.info(f"Vote attempt by user {self.request.user.id}")
        if Vote.objects.filter(user=user).exists():
            logger.warning(f"User {self.request.user.id} tried to vote twice")
            raise ValidationError("You have already voted.")
        serializer.save(user=user)
        logger.info(f"Vote recorded for user {self.request.user.id}")

class RunnerCreateView(generics.CreateAPIView):
    queryset = Runner.objects.all()
    serializer_class = RunnerCreateSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

class QuizRunnersView(generics.ListAPIView):
    serializer_class = RunnerSerializer

    def get_queryset(self):
        return Runner.objects.filter(is_quiz_runner=True).order_by("quiz_order")

class QuizListView(generics.ListAPIView):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer

class QuizDetailView(generics.RetrieveAPIView):
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer

class QuizSubmitView(APIView):
    
    def post(self, request):
        permission_classes = [IsAuthenticated]
        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quiz_id = serializer.validated_data["quiz"]
        selected_answers = serializer.validated_data["answers"]
        logger.info(f"Quiz submission by user {request.user.id}: {request.data}")
        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            return Response({"error": "Quiz not found"}, status=404)

        if quiz.has_correct_answers:
            correct_count = Answer.objects.filter(
                id__in=selected_answers,
                is_correct=True
            ).count()

            total = quiz.questions.count()

            return Response({
                "quiz": quiz.id,
                "score": correct_count,
                "total": total,
                "passed": correct_count == total
            })

        else:
            return Response({
                "quiz": quiz.id,
                "result": selected_answers
            })

class StoryListCreateView(generics.ListCreateAPIView):
    queryset = Story.objects.all().order_by("-created_at")
    serializer_class = StorySerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class StoryDeleteView(generics.DestroyAPIView):
    queryset = Story.objects.all()
    permission_classes = [IsAdminUser]

class ReactionCreateView(generics.CreateAPIView):
    serializer_class = ReactionSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        story_id = kwargs.get("story_id")
        story = Story.objects.get(id=story_id)

        if Reaction.objects.filter(user=request.user, story=story).exists():
            return Response({"detail": "You already reacted to this story."},
                            status=status.HTTP_400_BAD_REQUEST)

        reaction = Reaction.objects.create(user=request.user, story=story)
        serializer = self.get_serializer(reaction)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class UserWebsiteRatingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rating_obj, created = WebsiteRating.objects.get_or_create(user=request.user)
        serializer = WebsiteRatingSerializer(rating_obj)
        return Response(serializer.data)

    def post(self, request):
        rating_obj, created = WebsiteRating.objects.get_or_create(user=request.user)
        serializer = WebsiteRatingSerializer(rating_obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class TimelineEventListView(generics.ListAPIView):
    queryset = TimelineEvent.objects.all()
    serializer_class = TimelineEventSerializer

class TimelineEventManageView(viewsets.ModelViewSet):
    queryset = TimelineEvent.objects.all()
    serializer_class = TimelineEventSerializer
    permission_classes = [IsAdminUser]

class TimelineReferenceViewSet(viewsets.ModelViewSet):
    queryset = TimelineReference.objects.all()
    serializer_class = TimelineReferenceSerializer
    permission_classes = [IsAdminUser]

class TimelineReferencePublicList(generics.ListAPIView):
    serializer_class = TimelineReferenceSerializer

    def get_queryset(self):
        event_id = self.kwargs["event_id"]
        return TimelineReference.objects.filter(event_id=event_id)



class MileageResultView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logger.info(f"Mileage GET requested by user {request.user.id}")

        latest = MileageResult.objects.filter(user=request.user).order_by("-created_at").first()
        if not latest:
            logger.info(f"No mileage results found for user {request.user.id}")
            return Response({"message": "No mileage results yet"}, status=200)

        logger.info(f"Returning latest mileage result for user {request.user.id}")
        serializer = MileageResultSerializer(latest)
        return Response(serializer.data)

    def post(self, request):
        logger.info(f"Mileage POST requested by user {request.user.id} with data: {request.data}")

        input_serializer = MileageInputSerializer(data=request.data)

        if not input_serializer.is_valid():
            logger.warning(
                f"Invalid mileage input for user {request.user.id}: {input_serializer.errors}"
            )
            return Response(input_serializer.errors, status=400)

        try:
            age = request.data.get("age")
            injury = request.data.get("injury")
            desired = request.data.get("desiredMileage")
            

            if desired is None:
                return Response({"error": "Mileage missing"}, status=400)

            try:
                desired = int(desired)
            except ValueError:
                return Response({"error": "Invalid mileage"}, status=400)

            logger.info(
                f"Valid input for user {request.user.id}: age={age}, injury={injury}, desired={desired}"
            )
            if age == "twentyless":
                jump = 3 if injury == "yes" else 4
                start = 20 if injury == "yes" else 25
                desired = min(desired, 70)
            elif age == "fiftymore":
                jump = 2 if injury == "yes" else 3
                start = 15 if injury == "yes" else 20
                desired = min(desired, 50)
            else:
                jump = 3 if injury == "yes" else 4
                start = 20

            start = min(start, desired)

            weeks = max(0, round((desired - start) / jump))
            logger.info(
                f"Mileage calculated for user {request.user.id}: start={start}, "
                f"jump={jump}, weeks={weeks}, final_desired={desired}"
            )

            result = MileageResult.objects.create(
                user=request.user,
                age=age,
                injury=injury,
                desired_mileage=desired,
                start_mileage=start,
                jump=jump,
                weeks=weeks
            )

            logger.info(f"Mileage result saved for user {request.user.id}, id={result.id}")

            serializer = MileageResultSerializer(result)
            history = MileageResult.objects.filter(user=request.user).order_by("-created_at")
            history_serializer = MileageResultSerializer(history, many=True)

            return Response({
                "latest": serializer.data,
                "history": history_serializer.data
            }, status=201)

        except Exception as e:
            logger.error(
                f"Unexpected error during mileage POST for user {request.user.id}: {str(e)}",
                exc_info=True
            )
            return Response({"error": "Internal server error"}, status=500)


def stats_dashboard(request):

    total_runners = Runner.objects.count()

    top_runner = (
        Vote.objects.values('runner__name')
        .annotate(count=Count('id'))
        .order_by('-count')
        .first()
    )
    if top_runner:
        most_voted_runner = top_runner['runner__name']
        top_votes = top_runner['count']
    else:
        most_voted_runner = None
        top_votes = 0

    total_memes = Meme.objects.count()

    memes_by_category = (
        Meme.objects.values('category')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    if memes_by_category:
        top_meme_category = memes_by_category[0]['category']
        top_meme_count = memes_by_category[0]['count']
    else:
        top_meme_category = None
        top_meme_count = 0

    avg_mileage = MileageResult.objects.aggregate(
        avg=Avg('desired_mileage')
    )['avg']

    return JsonResponse({
        "total_runners": total_runners,
        "most_voted_runner": most_voted_runner,
        "top_votes": top_votes,

        "total_memes": total_memes,
        "memes_by_category": list(memes_by_category),
        "top_meme_category": top_meme_category,
        "top_meme_count": top_meme_count,

        "average_desired_mileage": avg_mileage,
    })

class StorySearchView(APIView):
    permission_classes = [IsAuthenticated] 

    def get(self, request):
        query = request.GET.get("q", "")
        
        if not query:
            return Response({"results": []})

        stories = Story.objects.filter(
            Q(content__icontains=query)
        ).order_by("-created_at")

        serializer = StorySerializer(stories, many=True)
        return Response({"results": serializer.data})


def current_vote_results():
    results = Vote.objects.values('runner').annotate(count=Count('id'))
    return {item['runner']: item['count'] for item in results}

def votes_sse_stream(request):

    def event_stream():
        last_data = None
        while True:
            data = current_vote_results()
            payload = json.dumps(data)

            if payload != last_data:
                yield f"data: {payload}\n\n"
                last_data = payload

            time.sleep(1)  

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response

class MileageHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = MileageResult.objects.filter(user=request.user)

        age_filter = request.GET.get("age")  
        if age_filter:
            queryset = queryset.filter(age=age_filter)

        sort = request.GET.get("sort")  
        if sort == "asc":
            queryset = queryset.order_by("desired_mileage")
        elif sort == "desc":
            queryset = queryset.order_by("-desired_mileage")
        else:
            queryset = queryset.order_by("-created_at")  

        serializer = MileageResultSerializer(queryset, many=True)
        return Response(serializer.data)


def index_page(request):
    return render(request, "api/index.html")
def register_page(request):
    return render(request, "api/register.html")

def login_page(request):
    return render(request, 'api/login.html')


