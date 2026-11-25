from rest_framework import serializers
from .models import NewsQuizData


class NewsQuizSerializer(serializers.ModelSerializer):
    """Serializer for news quiz prompt (withholds answer label until graded)."""

    class Meta:
        model = NewsQuizData
        fields = ('id', 'news_title', 'news_description')


class NewsQuizAnsweredSerializer(serializers.Serializer):
    """Serializer for user's answer submission (answer=True means Real, False means Fake)."""

    id = serializers.IntegerField(min_value=1)
    answer = serializers.BooleanField()
