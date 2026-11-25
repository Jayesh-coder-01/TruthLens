from django.db import models
import random


class NewsQuizDataManager(models.Manager):
    """A model manager to retrieve data from NewsQuizData."""

    def get_random_news(self):
        """Get a random news quiz item, or None if the table is empty."""
        count = self.all().count()
        if count == 0:
            return None
        random_index = random.randint(0, count - 1)
        return self.all()[random_index]

    def get_label_of_news(self, news_id):
        """Get the news item by its id, or None if not found."""
        try:
            return self.get(id=news_id)
        except NewsQuizData.DoesNotExist:
            return None


class NewsQuizData(models.Model):
    """Stores news headlines/descriptions and WELFake binary label (0=Real, 1=Fake)."""

    news_title = models.TextField()
    news_description = models.TextField()
    label = models.BooleanField()

    objects = NewsQuizDataManager()

    def __str__(self):
        return self.news_title
