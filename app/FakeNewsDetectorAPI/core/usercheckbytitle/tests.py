from unittest.mock import patch
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from core.model import LIMITATION_NOTICE, ModelUnavailableError, reset_model_cache


class UserCheckAPITests(APITestCase):
    def tearDown(self):
        reset_model_cache()
        super().tearDown()

    def test_valid_real_headline_maps_class_0_to_real(self):
        response = self.client.post(
            '/api/usercheck/title/',
            {
                'user_news': (
                    'Bobby Jindal, raised Hindu, uses story of Christian conversion '
                    'to woo evangelicals for potential 2016 bid'
                )
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIs(data['prediction'], True)
        self.assertEqual(data['predicted_label'], 'Real')
        self.assertEqual(data['raw_class'], 0)
        self.assertIn('model_score', data)
        self.assertIn('model_scores', data)
        self.assertEqual(data['disclaimer'], LIMITATION_NOTICE)

    def test_valid_fake_headline_maps_class_1_to_fake(self):
        response = self.client.post(
            '/api/usercheck/title/',
            {
                'user_news': (
                    "SATAN 2: Russia unvelis an image of its terrifying new 'SUPERNUKE' "
                    "- Western world takes notice"
                )
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIs(data['prediction'], False)
        self.assertEqual(data['predicted_label'], 'Fake')
        self.assertEqual(data['raw_class'], 1)
        self.assertGreaterEqual(data['model_score'], 0.0)
        self.assertLessEqual(data['model_score'], 1.0)

    def test_empty_and_whitespace_inputs_return_400(self):
        for bad_payload in [{}, {'user_news': ''}, {'user_news': '   \n\t  '}, {'user_news': 'ab'}]:
            response = self.client.post('/api/usercheck/title/', bad_payload, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_excessive_length_input_returns_400(self):
        response = self.client.post(
            '/api/usercheck/title/',
            {'user_news': 'a' * 5001},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('core.usercheckbytitle.viewsets.predict_headline', side_effect=ModelUnavailableError('Missing pkl'))
    def test_model_unavailable_returns_503(self, _mock_predict):
        response = self.client.post(
            '/api/usercheck/title/',
            {'user_news': 'Parliament debates budget proposal this week'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn('error', response.json())

    @override_settings(BASE_DIR='D:\\nonexistent_truthlens_dir')
    def test_missing_model_files_raise_model_unavailable(self):
        reset_model_cache()
        response = self.client.post(
            '/api/usercheck/title/',
            {'user_news': 'Parliament debates budget proposal this week'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
