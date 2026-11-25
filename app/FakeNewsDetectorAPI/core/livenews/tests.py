from unittest.mock import MagicMock, patch
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from core.livenews.models import LiveNews


class LiveNewsAPITests(APITestCase):
    @override_settings(GUARDIAN_API_KEY='')
    def test_status_and_refresh_when_guardian_key_missing(self):
        status_resp = self.client.get('/api/live/status/')
        self.assertEqual(status_resp.status_code, status.HTTP_200_OK)
        self.assertIs(status_resp.json()['configured'], False)

        refresh_resp = self.client.post('/api/live/refresh/')
        self.assertEqual(refresh_resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_category_filter_matches_section_and_pillar(self):
        LiveNews.objects.create(
            title='World leaders meet for climate summit',
            publication_date='2026-01-15T10:00:00Z',
            news_category='News',
            prediction=True,
            section_id='world',
            section_name='World news',
            type='article',
            web_url='https://example.com/world-1',
            img_url='None',
        )
        resp_section = self.client.get('/api/category/world/')
        self.assertEqual(resp_section.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_section.json()), 1)

        resp_pillar = self.client.get('/api/category/News/')
        self.assertEqual(resp_pillar.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_pillar.json()), 1)

    @override_settings(GUARDIAN_API_KEY='test-guardian-key')
    @patch('core.livenews.viewsets.requests.get')
    def test_refresh_fetches_and_stores_articles_safely(self, mock_get):
        guardian_resp = MagicMock()
        guardian_resp.status_code = 200
        guardian_resp.json.return_value = {
            'response': {
                'results': [
                    {
                        'webTitle': 'Bobby Jindal, raised Hindu, uses story of Christian conversion to woo evangelicals for potential 2016 bid',
                        'webPublicationDate': '2026-01-15T10:00:00Z',
                        'pillarName': 'News',
                        'sectionId': 'us-news',
                        'sectionName': 'US news',
                        'type': 'article',
                        'webUrl': 'https://example.com/article-1',
                    }
                ]
            }
        }
        article_resp = MagicMock()
        article_resp.status_code = 404
        mock_get.side_effect = [guardian_resp, article_resp]

        refresh_resp = self.client.post('/api/live/refresh/')
        self.assertEqual(refresh_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(refresh_resp.json()['fetched'], 1)

        stored = LiveNews.objects.get(web_url='https://example.com/article-1')
        self.assertIs(stored.prediction, True)
