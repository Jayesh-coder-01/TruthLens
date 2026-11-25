from rest_framework import serializers


MAX_NEWS_INPUT_LENGTH = 5000
MIN_NEWS_INPUT_LENGTH = 3


class UserCheckSerializer(serializers.Serializer):
    """Validates user-submitted headline or article text for classifier inference."""

    user_news = serializers.CharField(
        required=True,
        allow_blank=True,
        trim_whitespace=False,
        error_messages={
            "required": "Please provide 'user_news' text to analyze.",
            "blank": "Please enter a news headline or text to analyze.",
        },
    )

    def validate_user_news(self, value):
        if not isinstance(value, str):
            raise serializers.ValidationError("Input must be a text string.")
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Please enter a news headline or text to analyze.")
        if len(cleaned) < MIN_NEWS_INPUT_LENGTH:
            raise serializers.ValidationError(
                f"Input is too short. Please enter at least {MIN_NEWS_INPUT_LENGTH} characters."
            )
        if len(cleaned) > MAX_NEWS_INPUT_LENGTH:
            raise serializers.ValidationError(
                f"Input exceeds maximum length of {MAX_NEWS_INPUT_LENGTH} characters."
            )
        return cleaned
