import logging
from django.conf import settings
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

try:
    import httpx2
    TIMEOUT_EXCEPTIONS = (TimeoutError, httpx2.TimeoutException)
except ImportError:
    TIMEOUT_EXCEPTIONS = (TimeoutError,)

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_TIMEOUT_MS = 25000

MEDIA_LITERACY_SYSTEM_PROMPT = """You are the TruthLens Media Literacy Assistant. Your job is to help users critically evaluate news headlines, claims, and machine-learning classifier outputs.

Core factual & safety rules you MUST ALWAYS follow:
1. You have NO live internet access and NO web retrieval tool. NEVER say you checked the internet, looked up live news, or accessed external URLs.
2. NEVER invent, guess, or fabricate sources, citations, URLs, official statements, statistics, or quotations—even if the user explicitly asks or pressures you to provide a source or citation. If you do not have a verified source in the user's message, state clearly that you cannot provide verified citations without external retrieval.
3. State clearly when you lack sufficient evidence to verify whether a specific real-world claim is true or false.
4. When explaining a TruthLens classifier result, ONLY reference the fields explicitly provided in the Analysis Context (such as predicted_label, raw_class, model_score, model_scores, and input_text). Refer to model_score strictly as an uncalibrated model score—never call it the probability that a claim is true.
5. Explain what the ML classifier is and its limits: it is a Multinomial Naive Bayes model with a bag-of-words CountVectorizer (26,645-word title vocabulary) trained on the WELFake dataset (0 = Real, 1 = Fake). It detects statistical word patterns, NOT truth or factual accuracy. NEVER claim your explanation is the ML model's internal reasoning or feature weights unless provided.
6. Teach practical, actionable verification habits in plain language:
   - Trace the claim back to its original or primary source.
   - Check the author, publication reputation, and publication date.
   - Compare coverage across multiple independent, reputable outlets.
   - Inspect primary evidence (official records, datasets, full transcripts, unedited video).
   - Distinguish verifiable factual claims from opinion, satire, or sensational framing.
7. Keep answers concise, balanced, neutral, and easy to understand."""


class ChatbotError(Exception):
    """Base error for Media Literacy Assistant failures."""
    status_code = 502


class ChatbotConfigurationError(ChatbotError):
    status_code = 503


class ChatbotRateLimitError(ChatbotError):
    status_code = 429


class ChatbotTimeoutError(ChatbotError):
    status_code = 504


class ChatbotProviderError(ChatbotError):
    status_code = 502


def _format_analysis_context(analysis_context):
    if not analysis_context:
        return ""
    lines = ["[TruthLens Classifier Context - Provided by Backend]"]
    if analysis_context.get("input_text"):
        lines.append(f"- Submitted text: {analysis_context['input_text']}")
    if analysis_context.get("predicted_label") is not None:
        lines.append(f"- predicted_label: {analysis_context['predicted_label']}")
    if analysis_context.get("raw_class") is not None:
        lines.append(f"- raw_class: {analysis_context['raw_class']} (0=Real, 1=Fake in WELFake)")
    if analysis_context.get("model_score") is not None:
        lines.append(f"- model_score (uncalibrated Naive Bayes output): {analysis_context['model_score']}")
    scores = analysis_context.get("model_scores")
    if isinstance(scores, dict):
        lines.append(f"- model_scores: real={scores.get('real')}, fake={scores.get('fake')}")
    lines.append("[End Classifier Context]")
    return "\n".join(lines)


def _build_contents(message, history, analysis_context):
    contents = []
    for item in history or []:
        role = "model" if item["role"] == "assistant" else "user"
        contents.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=item["content"])],
            )
        )

    context_block = _format_analysis_context(analysis_context)
    user_text = f"{context_block}\n\nUser question: {message}" if context_block else message
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_text)],
        )
    )
    return contents


def generate_media_literacy_reply(message, history=None, analysis_context=None):
    """Call Google Gemini API server-side and return a validated assistant reply."""
    api_key = getattr(settings, "GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "your_gemini_api_key_here":
        raise ChatbotConfigurationError(
            "Media Literacy Assistant is not configured. Set GEMINI_API_KEY in the server environment."
        )

    model_name = getattr(settings, "GEMINI_MODEL", "gemini-3.6-flash").strip() or "gemini-3.6-flash"
    contents = _build_contents(message, history, analysis_context)

    try:
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=DEFAULT_GEMINI_TIMEOUT_MS),
        )
        response = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=MEDIA_LITERACY_SYSTEM_PROMPT,
                temperature=0.3,
                max_output_tokens=2048,
            ),
        )
    except genai_errors.APIError as exc:
        status_code = getattr(exc, "code", None)
        logger.warning("Gemini APIError encountered with status=%s", status_code)
        if status_code == 429:
            raise ChatbotRateLimitError(
                "Gemini API quota or rate limit reached. Please wait a moment and try again."
            ) from exc
        if status_code in (408, 504):
            raise ChatbotTimeoutError(
                "The AI assistant timed out while generating a response. Please try again."
            ) from exc
        if status_code in (401, 403):
            raise ChatbotConfigurationError(
                "Gemini API authentication failed. Please verify the server GEMINI_API_KEY."
            ) from exc
        if status_code == 503:
            raise ChatbotConfigurationError(
                "The Gemini service is temporarily busy. Please try again in a moment."
            ) from exc
        raise ChatbotProviderError(
            "Unable to get a response from the Gemini service right now."
        ) from exc
    except TIMEOUT_EXCEPTIONS as exc:
        logger.warning("Gemini request timed out: %s", type(exc).__name__)
        raise ChatbotTimeoutError(
            "The AI assistant request timed out. Please try again."
        ) from exc
    except Exception as exc:
        logger.warning("Unexpected Gemini client error: %s", type(exc).__name__)
        raise ChatbotProviderError(
            "Unable to reach the Gemini service right now."
        ) from exc

    reply_text = getattr(response, "text", None)
    if not isinstance(reply_text, str) or not reply_text.strip():
        raise ChatbotProviderError("The Gemini service returned an empty or malformed response.")

    return {
        "reply": reply_text.strip(),
        "model": model_name,
        "has_analysis_context": bool(analysis_context),
        "disclaimer": (
            "Assistant guidance is educational and does not verify live breaking claims or replace "
            "independent primary-source checking."
        ),
    }
