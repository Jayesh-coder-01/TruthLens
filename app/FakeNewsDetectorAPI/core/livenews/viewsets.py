import logging
from bs4 import BeautifulSoup
from django.conf import settings
from django.db.models import Q
import requests
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.model import ModelUnavailableError, predict_headline
from .models import LiveNews
from .serializers import LiveNewsDetailedSerializer

logger = logging.getLogger(__name__)

GUARDIAN_SEARCH_URL = "https://content.guardianapis.com/search"
REQUEST_TIMEOUT_SECONDS = 10


def _scrape_article_image(url):
    """Best-effort extraction of an article image; returns 'None' if unavailable."""
    try:
        resp = requests.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
        if resp.status_code != 200:
            return "None"
        soup = BeautifulSoup(resp.content, 'html.parser')
        articles = soup.find_all('article')
        if not articles:
            return "None"
        imgs = articles[0].find_all('img')
        for img in imgs:
            src = img.get("src")
            if src:
                return src
    except requests.RequestException:
        return "None"
    return "None"


def fetch_and_update_live_news():
    """
    Fetch headlines from The Guardian Open Platform when GUARDIAN_API_KEY is configured,
    classify each title with the ML model, and store new rows in SQLite.
    """
    api_key = getattr(settings, "GUARDIAN_API_KEY", "").strip()
    if not api_key:
        return {
            "configured": False,
            "fetched": 0,
            "error": "GUARDIAN_API_KEY is not configured.",
        }

    try:
        response = requests.get(
            GUARDIAN_SEARCH_URL,
            params={"api-key": api_key},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        logger.warning("Guardian API request failed: %s", type(exc).__name__)
        return {
            "configured": True,
            "fetched": 0,
            "error": "Unable to reach Guardian API.",
        }

    if response.status_code != 200:
        return {
            "configured": True,
            "fetched": 0,
            "error": f"Guardian API returned HTTP {response.status_code}.",
        }

    payload = response.json()
    results = payload.get("response", {}).get("results", [])
    inserted = 0

    for article in results:
        web_url = article.get("webUrl")
        title = article.get("webTitle")
        pub_date = article.get("webPublicationDate")
        if not web_url or not title or not pub_date:
            continue

        if LiveNews.objects.filter(web_url=web_url).exists():
            continue

        try:
            prediction_result = predict_headline(title)
        except ModelUnavailableError as exc:
            return {"configured": True, "fetched": inserted, "error": str(exc)}

        LiveNews.objects.create(
            title=title,
            publication_date=pub_date,
            news_category=article.get("pillarName") or "Undefined",
            prediction=prediction_result["prediction"],
            section_id=article.get("sectionId") or "unknown",
            section_name=article.get("sectionName") or "Unknown",
            type=article.get("type") or "article",
            web_url=web_url,
            img_url=_scrape_article_image(web_url),
        )
        inserted += 1

    return {"configured": True, "fetched": inserted, "error": None}


class LiveNewsPrediction(viewsets.ViewSet):
    """Viewset for viewing stored live-monitored Guardian articles and optional manual refresh."""

    http_method_names = ('get', 'post', )

    def list(self, request):
        """Return the latest 10 stored live-monitored articles."""
        all_live_news = LiveNews.objects.all().order_by('-id')[:10]
        serializer = LiveNewsDetailedSerializer(all_live_news, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, pk=None):
        """Return a specific live-monitored article by primary key."""
        try:
            news_prediction = LiveNews.objects.get(pk=pk)
        except LiveNews.DoesNotExist:
            return Response({"error": "News not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = LiveNewsDetailedSerializer(news_prediction)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='status')
    def monitor_status(self, request):
        """Report whether Guardian live monitoring is configured and how many articles are stored."""
        configured = bool(getattr(settings, "GUARDIAN_API_KEY", "").strip())
        return Response(
            {
                "configured": configured,
                "stored_count": LiveNews.objects.count(),
                "message": (
                    "Guardian live monitoring is configured."
                    if configured
                    else "Live monitoring is optional and disabled (GUARDIAN_API_KEY is not set)."
                ),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post'], url_path='refresh')
    def refresh(self, request):
        """Trigger an on-demand Guardian API refresh when GUARDIAN_API_KEY is configured."""
        outcome = fetch_and_update_live_news()
        if not outcome["configured"]:
            return Response(outcome, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        if outcome["error"]:
            return Response(outcome, status=status.HTTP_502_BAD_GATEWAY)
        return Response(outcome, status=status.HTTP_200_OK)


class LiveNewsByCategory(viewsets.ViewSet):
    """Filter stored live-monitored articles by pillar/category or section slug."""

    http_method_names = ('get', )

    def list(self, request, category=None):
        if category is None or not category.strip():
            return Response(
                {'error': 'Category not provided in the URL'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        clean_cat = category.strip()
        live_news = LiveNews.objects.filter(
            Q(news_category__iexact=clean_cat)
            | Q(section_id__iexact=clean_cat)
            | Q(section_name__iexact=clean_cat)
        ).order_by('-id')[:10]
        serializer = LiveNewsDetailedSerializer(live_news, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
