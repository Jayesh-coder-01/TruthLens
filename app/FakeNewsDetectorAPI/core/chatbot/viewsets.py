from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .serializers import ChatRequestSerializer
from .services import ChatbotError, generate_media_literacy_reply


class ChatbotViewSet(viewsets.ViewSet):
    """Stateless REST viewset for the Gemini-powered Media Literacy Assistant."""

    http_method_names = ('get', 'post', )
    serializer_class = ChatRequestSerializer

    def create(self, request):
        """Validate user prompt and return a Media Literacy Assistant response from Gemini."""
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = generate_media_literacy_reply(
                message=serializer.validated_data['message'],
                history=serializer.validated_data.get('history', []),
                analysis_context=serializer.validated_data.get('analysis_context'),
            )
        except ChatbotError as exc:
            return Response(
                {"error": str(exc)},
                status=exc.status_code,
            )

        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='status')
    def assistant_status(self, request):
        """Report whether GEMINI_API_KEY is configured without revealing any secret."""
        api_key = getattr(settings, "GEMINI_API_KEY", "").strip()
        configured = bool(api_key and api_key != "your_gemini_api_key_here")
        return Response(
            {
                "configured": configured,
                "model": getattr(settings, "GEMINI_MODEL", "gemini-3.6-flash"),
            },
            status=status.HTTP_200_OK,
        )
