from rest_framework import status, viewsets
from rest_framework.response import Response

from core.model import ModelUnavailableError, predict_headline
from .serializers import UserCheckSerializer


class UserCheckViewSet(viewsets.ViewSet):
    """Viewset to analyze user-submitted news headlines/text with the ML classifier."""

    http_method_names = ('post', )
    serializer_class = UserCheckSerializer

    def create(self, request):
        """Validate input text and return classifier prediction with model scores."""
        serializer = UserCheckSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        input_data = serializer.validated_data['user_news']
        try:
            result = predict_headline(input_data)
        except ModelUnavailableError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(result, status=status.HTTP_200_OK)
