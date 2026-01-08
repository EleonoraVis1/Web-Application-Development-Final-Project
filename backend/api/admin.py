from django.contrib import admin

# Register your models here.

from .models import Vote, Story, WebsiteRating, Runner, Quiz, Question, Answer, MileageResult, Reaction, TimelineEvent, TimelineReference, Meme

class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 2

class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    inlines = [QuestionInline]

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    inlines = [AnswerInline]

admin.site.register(Answer)

admin.site.register(Runner)
admin.site.register(MileageResult)
admin.site.register(Meme)
admin.site.register(TimelineEvent)
admin.site.register(TimelineReference)

admin.site.register(Vote)
admin.site.register(Story)
admin.site.register(Reaction)

admin.site.register(WebsiteRating)

