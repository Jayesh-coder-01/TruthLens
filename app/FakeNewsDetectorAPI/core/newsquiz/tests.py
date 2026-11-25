from rest_framework import status
from rest_framework.test import APITestCase

from core.newsquiz.models import NewsQuizData


class NewsQuizAPITests(APITestCase):
    def test_empty_quiz_table_returns_404(self):
        response = self.client.get('/api/quiz/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_quiz_get_does_not_leak_label_and_post_grades_welfake_mapping(self):
        # In WELFake / game_data.csv: label=False (0) is Real, label=True (1) is Fake
        real_item = NewsQuizData.objects.create(
            news_title='Central bank publishes quarterly inflation report',
            news_description='Official statistics release.',
            label=False,
        )
        fake_item = NewsQuizData.objects.create(
            news_title='UNBELIEVABLE! SECRET ALIEN BASE FOUND UNDER SUBWAY',
            news_description='Sensational hoax story.',
            label=True,
        )

        get_resp = self.client.get('/api/quiz/')
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertNotIn('label', get_resp.json())

        # Answering True (Real) for real_item (label=False / 0) should be correct
        resp_real_correct = self.client.post(
            '/api/quiz/',
            {'id': real_item.id, 'answer': True},
            format='json',
        )
        self.assertEqual(resp_real_correct.status_code, status.HTTP_200_OK)
        self.assertIs(resp_real_correct.json()['correct'], True)
        self.assertEqual(resp_real_correct.json()['actual_label'], 'Real')

        # Answering False (Fake) for fake_item (label=True / 1) should be correct
        resp_fake_correct = self.client.post(
            '/api/quiz/',
            {'id': fake_item.id, 'answer': False},
            format='json',
        )
        self.assertEqual(resp_fake_correct.status_code, status.HTTP_200_OK)
        self.assertIs(resp_fake_correct.json()['correct'], True)
        self.assertEqual(resp_fake_correct.json()['actual_label'], 'Fake')

    def test_quiz_missing_id_and_invalid_body(self):
        resp_missing = self.client.post('/api/quiz/', {'id': 99999, 'answer': True}, format='json')
        self.assertEqual(resp_missing.status_code, status.HTTP_404_NOT_FOUND)

        resp_invalid = self.client.post('/api/quiz/', {'id': 'abc'}, format='json')
        self.assertEqual(resp_invalid.status_code, status.HTTP_400_BAD_REQUEST)
