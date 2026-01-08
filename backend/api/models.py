from django.db import models

# Create your models here.

from django.contrib.auth.models import User

class Meme(models.Model):
    CATEGORY_CHOICES = [
        ('gediminas', 'Gediminas Truskauskas'),
        ('usain', 'Usain Bolt'),
        ('eliud', 'Eliud Kipchoge'),
        ('general', 'General'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200, blank=True)
    image = models.ImageField(upload_to='memes/')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='general')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title or f"Meme by {self.user.username}"

class Runner(models.Model):
    name = models.CharField(max_length=100)
    image = models.ImageField(upload_to="runners/", null=True, blank=True)
    description = models.TextField(blank=True)
    is_quiz_runner = models.BooleanField(default=False)
    quiz_order = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return self.name


class Vote(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE) 
    runner = models.ForeignKey(Runner, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} → {self.runner.name}"

class Quiz(models.Model):
    title = models.CharField(max_length=255)
    
    has_correct_answers = models.BooleanField(default=False)

    def __str__(self):
        return self.title

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, related_name="questions", on_delete=models.CASCADE)
    text = models.TextField()

    def __str__(self):
        return f"{self.quiz.title} — {self.text}"

class Answer(models.Model):
    question = models.ForeignKey(Question, related_name="answers", on_delete=models.CASCADE)
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f"Answer to '{self.question.text}'"

class Story(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="stories")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Story by {self.author.username}"

class Reaction(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reactions")
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name="reactions")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "story"], name="unique_user_story_reaction")
        ]

    def __str__(self):
        return f"{self.user.username} → Story {self.story.id}"

class WebsiteRating(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="website_rating")
    rating = models.PositiveSmallIntegerField(default=0) 

    def __str__(self):
        return f"{self.user.username}: {self.rating} stars"

class TimelineEvent(models.Model):
    year = models.CharField(max_length=100)       
    description = models.TextField()
    order = models.PositiveIntegerField(default=0)  

    class Meta:
        ordering = ['order', 'year']

    def __str__(self):
        return f"{self.year}"

class TimelineReference(models.Model):
    event = models.ForeignKey(TimelineEvent, on_delete=models.CASCADE, related_name='references')
    title = models.CharField(max_length=255, blank=True)  # admin may leave empty
    description = models.TextField(blank=True) 
    question = models.CharField(max_length=500)
    answer = models.CharField(max_length=500)

    def __str__(self):
        return self.title or f"Reference for {self.event}"

class MileageResult(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    age = models.CharField(max_length=20)
    injury = models.CharField(max_length=10)
    desired_mileage = models.IntegerField()
    start_mileage = models.IntegerField()
    jump = models.IntegerField()
    weeks = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} mileage result"