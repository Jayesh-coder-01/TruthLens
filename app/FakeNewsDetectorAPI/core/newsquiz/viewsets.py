from rest_framework import status, viewsets
from rest_framework.response import Response

from .models import NewsQuizData
from .serializers import NewsQuizAnsweredSerializer, NewsQuizSerializer


class NewsQuizViewSet(viewsets.ViewSet):
    """Viewset to serve random quiz headlines and verify user answers server-side."""

    http_method_names = ('get', 'post', )
    serializer_class = NewsQuizAnsweredSerializer

    def list(self, request):
        """Return a random quiz item without exposing its answer label."""
        news_for_quiz = NewsQuizData.objects.get_random_news()
        if news_for_quiz is None:
            return Response(
                {"error": "No quiz items are loaded in the database."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = NewsQuizSerializer(news_for_quiz)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request):
        """Grade user answer against WELFake ground truth (0/False=Real, 1/True=Fake)."""
        serializer = NewsQuizAnsweredSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        news_id = serializer.validated_data['id']
        user_answer_is_real = serializer.validated_data['answer']

        quiz_item = NewsQuizData.objects.get_label_of_news(news_id)
        if quiz_item is None:
            return Response(
                {"error": "Quiz item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # In game_data.csv (from WELFake), 0 (False) = Real news, 1 (True) = Fake news.
        actual_is_real = not bool(quiz_item.label)
        is_correct = actual_is_real == bool(user_answer_is_real)

        return Response(
            {
                "result": is_correct,
                "correct": is_correct,
                "actual_is_real": actual_is_real,
                "actual_label": "Real" if actual_is_real else "Fake",
            },
            status=status.HTTP_200_OK,
        )
