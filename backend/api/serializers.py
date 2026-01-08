from django.contrib.auth.models import User
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import Quiz, Question, Answer, Meme, Runner, Vote, Story, Reaction, WebsiteRating, TimelineEvent, TimelineReference, MileageResult
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data['password'])
        return super(UserSerializer, self).create(validated_data)

class MemeSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(use_url=True)
    class Meta:
        model = Meme
        fields = ['id', 'user', 'title', 'image', 'category', 'created_at']
        read_only_fields = ['user', 'created_at']

class RunnerSerializer(serializers.ModelSerializer):
    votes = serializers.IntegerField(source='vote_set.count', read_only=True)

    class Meta:
        model = Runner
        fields = ['id', 'name', 'image', 'description', 'votes']

class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ['runner']

class RunnerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Runner
        fields = ['name', 'image', 'description']

class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ["id", "text", "is_correct"]

class QuestionSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True)

    class Meta:
        model = Question
        fields = ["id", "text", "answers"]

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True)

    class Meta:
        model = Quiz
        fields = ["id", "title", "has_correct_answers", "questions"]

class QuizSubmitSerializer(serializers.Serializer):
    quiz = serializers.IntegerField()
    answers = serializers.ListField(child=serializers.IntegerField())


class StorySerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    reactions_count = serializers.IntegerField(source="reactions.count", read_only=True)

    class Meta:
        model = Story
        fields = ["id", "author", "author_username", "content", "created_at", "reactions_count"]
        read_only_fields = ["author"]


class ReactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reaction
        fields = ["id", "user", "story", "created_at"]
        read_only_fields = ["user"]

class WebsiteRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteRating
        fields = ["rating"]


class TimelineReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimelineReference
        fields = "__all__"


class TimelineEventSerializer(serializers.ModelSerializer):
    references = TimelineReferenceSerializer(many=True, read_only=True)
    class Meta:
        model = TimelineEvent
        fields = ['id', 'year', 'description', 'references',  'order']


class MyTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        refresh = RefreshToken(attrs['refresh'])
        user = refresh.user

        data['is_admin'] = user.is_staff
        return data


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['is_admin'] = user.is_staff
        
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['is_admin'] = self.user.is_staff
        
        return data


class MileageResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = MileageResult
        fields = "__all__"
        read_only_fields = ["user", "start_mileage", "jump", "weeks"]

class MileageInputSerializer(serializers.Serializer):
    age = serializers.ChoiceField(choices=["twentyless", "twentyforty", "fiftymore"])
    injury = serializers.ChoiceField(choices=["yes", "no"])
    desiredMileage = serializers.IntegerField(min_value=1)
