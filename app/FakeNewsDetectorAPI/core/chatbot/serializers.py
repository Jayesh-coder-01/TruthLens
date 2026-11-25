from rest_framework import serializers


MAX_CHAT_MESSAGE_LENGTH = 2000
MAX_HISTORY_TURNS = 12


class ChatHistoryItemSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    content = serializers.CharField(max_length=MAX_CHAT_MESSAGE_LENGTH, allow_blank=False)


class AnalysisContextSerializer(serializers.Serializer):
    """Only accepts verified fields returned by the TruthLens classifier endpoint."""

    input_text = serializers.CharField(max_length=5000, required=False, allow_blank=True)
    predicted_label = serializers.ChoiceField(choices=['Real', 'Fake'], required=False)
    raw_class = serializers.ChoiceField(choices=[0, 1], required=False)
    model_score = serializers.FloatField(min_value=0.0, max_value=1.0, required=False)
    model_scores = serializers.DictField(
        child=serializers.FloatField(min_value=0.0, max_value=1.0),
        required=False,
    )


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(
        required=True,
        allow_blank=True,
        trim_whitespace=False,
        error_messages={
            "required": "Please enter a question for the Media Literacy Assistant.",
            "blank": "Message cannot be empty.",
        },
    )
    history = ChatHistoryItemSerializer(many=True, required=False, default=list)
    analysis_context = AnalysisContextSerializer(required=False, allow_null=True, default=None)

    def validate_message(self, value):
        if not isinstance(value, str):
            raise serializers.ValidationError("Message must be a text string.")
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Message cannot be empty.")
        if len(cleaned) > MAX_CHAT_MESSAGE_LENGTH:
            raise serializers.ValidationError(
                f"Message exceeds maximum length of {MAX_CHAT_MESSAGE_LENGTH} characters."
            )
        return cleaned

    def validate_history(self, value):
        if len(value) > MAX_HISTORY_TURNS:
            return value[-MAX_HISTORY_TURNS:]
        return value
