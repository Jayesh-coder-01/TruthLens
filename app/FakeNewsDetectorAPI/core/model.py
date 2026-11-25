import os
import pickle
import threading
from django.conf import settings


class ModelUnavailableError(RuntimeError):
    """Raised when the trained classifier or vectorizer artifact cannot be loaded."""


_model_lock = threading.Lock()
_cached_models = None

LIMITATION_NOTICE = (
    "This is an automated model prediction, not proof that a claim is true or false. "
    "Verify important information with independent and primary sources."
)


def load_models(force_reload=False):
    """Load and cache the Naive Bayes classifier and CountVectorizer artifacts."""
    global _cached_models
    if _cached_models is not None and not force_reload:
        return _cached_models

    with _model_lock:
        if _cached_models is not None and not force_reload:
            return _cached_models

        nb_model_path = os.path.join(settings.BASE_DIR, "models", "nb_model.pkl")
        vectorizer_model_path = os.path.join(settings.BASE_DIR, "models", "vectorizer_model.pkl")

        if not os.path.exists(nb_model_path) or not os.path.exists(vectorizer_model_path):
            raise ModelUnavailableError("Classifier model files are missing from models/ directory.")

        try:
            with open(nb_model_path, "rb") as nb_file:
                nb_model = pickle.load(nb_file)
            with open(vectorizer_model_path, "rb") as vect_file:
                vect_model = pickle.load(vect_file)
        except Exception as exc:
            raise ModelUnavailableError("Failed to load classifier model artifacts.") from exc

        _cached_models = (nb_model, vect_model)
        return _cached_models


def reset_model_cache():
    """Clear the cached models (used in tests)."""
    global _cached_models
    with _model_lock:
        _cached_models = None


def predict_headline(text):
    """
    Run inference using the CountVectorizer + MultinomialNB pipeline.

    In the WELFake training dataset and game_data.csv:
      - raw_class == 0 corresponds to Real news (is_real = True)
      - raw_class == 1 corresponds to Fake news (is_real = False)
    """
    nb_model, vect_model = load_models()
    vectorized_text = vect_model.transform([text])
    raw_class = int(nb_model.predict(vectorized_text)[0])
    is_real = raw_class == 0

    classes = list(getattr(nb_model, "classes_", [0, 1]))
    probas = nb_model.predict_proba(vectorized_text)[0]
    score_by_class = {int(cls): float(prob) for cls, prob in zip(classes, probas)}

    real_score = round(score_by_class.get(0, 0.0), 4)
    fake_score = round(score_by_class.get(1, 0.0), 4)
    predicted_score = round(score_by_class.get(raw_class, 0.0), 4)

    return {
        "prediction": is_real,
        "predicted_label": "Real" if is_real else "Fake",
        "raw_class": raw_class,
        "model_score": predicted_score,
        "model_scores": {
            "real": real_score,
            "fake": fake_score,
        },
        "model_info": "MultinomialNB + CountVectorizer (26,645-term title vocabulary)",
        "disclaimer": LIMITATION_NOTICE,
    }
