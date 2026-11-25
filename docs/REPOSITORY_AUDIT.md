# Repository Audit — `DJDarkCyber/Fake-News-Detector` (TruthLens Adaptation)

**Audit Date:** 2026-11-25  
**Upstream Repository:** `https://github.com/DJDarkCyber/Fake-News-Detector` (commit `41d22c8`, MIT License, Copyright (c) 2023 DJDarkCyber)  
**Working Branch:** `feat/truthlens-adaptation`

---

## 1. Repository Tree & Tech Stack

### Top-Level Structure
- `FakeNewsDetection_AIProject.ipynb` — 66-cell Colab/Jupyter notebook ("Naan Mudhalvan AI Fake News Detection Project")
- `README.md` — Upstream documentation describing Live News Monitoring, News Quiz, and Check News by Title
- `LICENSE` — MIT License (`DJDarkCyber`, 2023)
- `.gitignore` — Toptal gitignore for VisualStudio, Python, Django, React (ignores `.env`, `db.sqlite3`, `.venv`, `node_modules`, `build/`)
- `app/FakeNewsDetectorAPI/` — Django 4.2.3 + Django REST Framework 3.14.0 backend (SQLite database)
- `app/fake-news-detector-frontend/` — React 18.2.0 SPA bootstrapped with Create React App (`react-scripts` 5.0.1), Bootstrap 5.3.1, React-Bootstrap 2.8.0, Axios 1.5.0, React Router v6.15.0

### Verified Install & Run Commands
- **Frontend (`app/fake-news-detector-frontend/`):**
  - Build tool: **Create React App (`react-scripts@5.0.1`)** (verified in `package.json`, not Vite).
  - Install: `npm install` (installed 1,540 packages cleanly on Node `v24.13.0` / npm `11.6.2`).
  - Dev server: `npm start`
  - Tests: `npm test -- --watchAll=false` (baseline: `No tests found`).
  - Production build: `npm run build` (baseline: compiled with 13 ESLint warnings, 0 errors).
- **Backend (`app/FakeNewsDetectorAPI/`):**
  - Environment observed: Python `3.14.6` on Windows.
  - Upstream `requirements.txt` contains: `django==4.2.3`, `djangorestframework==3.14.0`, `django-filter==24.2`, `django-cors-headers==4.4.0`, `psycopg2==2.9.9`, `scikit-learn==1.5.0`, `requests==2.32.3`.
  - **Observed setup failure:** Running `pip install -r requirements.txt` on Python 3.14.6 failed because `scikit-learn==1.5.0` has no Python 3.14 wheel and fails Meson/Cython source build (`ERROR: Cython requires python3 dependency for link testing`). Additionally, `psycopg2==2.9.9` is unused (`settings.py` uses SQLite), while `pandas` (used by `quiz_data_loader.py`) and `beautifulsoup4` (used by `core/livenews/viewsets.py`) are **missing** from `requirements.txt`.
  - Workaround verified in `.venv`: installing `django==4.2.3`, `djangorestframework==3.14.0`, `django-filter==24.2`, `django-cors-headers==4.4.0`, `requests==2.32.3`, `beautifulsoup4`, `pandas`, `scikit-learn` (1.9.1 wheel), `google-genai`, `python-dotenv`.
  - Migrations: `python manage.py migrate` (succeeded, creating `db.sqlite3`).
  - Quiz loader: `python manage.py quiz_data_loader game_data/game_data.csv` (loaded 1,000 rows).
  - Baseline backend tests: `python manage.py test` -> `Found 0 test(s)` (exited with code 1).

---

## 2. ML Pipeline & Inference Trace

### End-to-End Request Flow (`Check News by Title`)
1. **Frontend (`src/components/checkbytitle.js`):**
   - Captures textarea input into `inputNewsTitle`.
   - Submits `POST http://127.0.0.1:8000/api/usercheck/title/` with JSON `{ "user_news": inputNewsTitle }`.
   - Reads `response.data.prediction`: if `true`, renders `"Predicted as real news!"` (`toast.success("Real news!")`); otherwise renders `"Predicted as fake news!"`.
2. **Routing (`FakeNewsDetectorAPI/urls.py` -> `core/routers.py`):**
   - `/api/` routes to `SimpleRouter` registering `usercheck/title` -> `UserCheckViewSet`.
3. **Serialization (`core/usercheckbytitle/serializers.py`):**
   - `UserCheckSerializer` validates `user_news = serializers.CharField()`.
4. **Model Loading & Inference (`core/model.py` & `core/usercheckbytitle/viewsets.py`):**
   - Loads `models/nb_model.pkl` and `models/vectorizer_model.pkl` via `pickle.load` at class definition time.
   - Calls `self.vect_model.transform([input_data])` -> `self.nb_model.predict(vectorized_text)`.
   - Converts `prediction[0]` to boolean: `prediction_bool = True if prediction[0] == 1 else False`.
   - Returns `{ "prediction": prediction_bool }`.

### Verified Model Artifacts & Notebook Evidence
- **Saved artifacts (`app/FakeNewsDetectorAPI/models/`):**
  - `nb_model.pkl`: `sklearn.naive_bayes.MultinomialNB(alpha=1.0, fit_prior=True)` with `classes_ = [0, 1]`, pickled with `scikit-learn 1.2.2` (triggers `InconsistentVersionWarning` under 1.9.1, though inference still runs).
  - `vectorizer_model.pkl`: `sklearn.feature_extraction.text.CountVectorizer(stop_words='english', lowercase=True, ngram_range=(1, 1), token_pattern='(?u)\\b\\w\\w+\\b')` with **26,645** vocabulary terms.
- **Notebook (`FakeNewsDetection_AIProject.ipynb`):**
  - Dataset: `WELFake_Dataset.csv` (72,134 rows: `title`, `text`, `label`).
  - Note on notebook artifacts vs. backend artifacts: The notebook trains `nb_classifier` and `RandomForestClassifier(n_estimators=300)` on `df["title"] + df["text"]` (196,520 vocabulary features in Cell 57), achieving **89% test accuracy** for `MultinomialNB` (on 23,805 test samples: class 0 F1=0.89, class 1 F1=0.89) and **94% test accuracy** for Random Forest. However, the saved `vectorizer_model.pkl` in the backend has 26,645 features and achieves **90.7% accuracy on `game_data.csv` titles** vs. 81.7% on `title + text`, confirming the deployed `nb_model.pkl` / `vectorizer_model.pkl` were trained on **titles only** (consistent with Cell 45 loading an earlier `nb_model.pkl`).
  - No separate custom regex/stemming preprocessing is applied in either the deployed `CountVectorizer` or the notebook's `CountVectorizer(stop_words='english')` step (Cell 36/46).

---

## 3. Feature Verification & Critical Bugs Found

### Critical Bug 1: Inverted Label Mapping (`0` vs `1`) Across Backend & Quiz
- **Evidence from `game_data/game_data.csv` (first 1,000 rows of `WELFake_Dataset.csv`, Cell 10) and `FakeNewsDetection_AIProject.ipynb`:**
  - `label = 0` corresponds to **Real** mainstream news (e.g., row 2 `"Bobby Jindal, raised Hindu, uses story of Christian conversion..."`, row 9 `"May Brexit offer would hurt, cost EU citizens - EU parliament"`, row 10 `"Schumer calls on Trump to appoint official to oversee Puerto Rico relief"`, Cell 26 Reuters article `label = 0`, Cell 41–43 Reuters prediction = `array([0])`).
  - `label = 1` corresponds to **Fake / unreliable / sensational** items (e.g., row 0 `"LAW ENFORCEMENT ON HIGH ALERT Following Threats Against Cops And Whites..."`, row 1 `"UNBELIEVABLE! OBAMA'S ATTORNEY GENERAL SAYS MOST CHARLOTTE RIOTERS WERE 'PEACEFUL'..."`, row 3 `"SATAN 2: Russia unvelis an image of its terrifying new 'SUPERNUKE'..."`, row 11 `"WATCH: HILARIOUS AD Calls Into Question Health Of Aging Clinton Crime Family Bosses"`).
  - Evaluating `nb_model.pkl` on `game_data.csv` confirms `nb_model.pkl` predicts `0` for `"Bobby Jindal..."` (`[0.972, 0.028]`) and `1` for `"SATAN 2..."` (`[0.001, 0.999]`).
- **Upstream inversion:**
  - `UserCheckViewSet` sets `prediction_bool = True if prediction[0] == 1 else False`, and `checkbytitle.js` treats `prediction === true` as `"Predicted as real news!"`. Thus, **fake news (`1`) is reported as Real, and real news (`0`) is reported as Fake**.
  - `LiveNewsPrediction` (`core/livenews/viewsets.py` line 69) has the exact same inversion (`True if prediction[0] == 1 else False`).
  - `NewsQuizViewSet` (`core/newsquiz/viewsets.py` line 33) and `newsquiz.js` (line 42) treat `label == 1` (`True`) as `"Real News"`, inverting the quiz answers against `game_data.csv`.

### Critical Bug 2: Live News Monitoring Crashes on Import & Has Hardcoded Expired Key
- `core/livenews/viewsets.py` starts `auto_refresh_thread` (`while True` every 10s) **at module import time** (line 100–102). Importing `FakeNewsDetectorAPI.urls` during `migrate`, `quiz_data_loader`, or `runserver` immediately executes a Guardian API request.
- Observed error when importing `FakeNewsDetectorAPI.urls`:
  - `requests.get("https://content.guardianapis.com/search?api-key=e705adff-ca49-414e-89e2-7edede919e2e")` returned **HTTP 401 `{"message": "Unauthorized"}`**.
  - `Thread-1` crashed with `KeyError: 'response'` at line 21 of `core/livenews/viewsets.py`.
  - `GET /api/live/` returns `200 []` (0 articles). Home page renders `"Not enough data to display :("` because it requires `liveNewsData.length >= 10`.
- Additional defects in `core/livenews/viewsets.py`:
  - Hardcoded API key in source code.
  - Fragile HTML scraping (`soup.find_all('article')[0].find_all('img', class_='dcr-evn1e9')`) with no error handling or request timeouts.
  - `Header.js` category links pass `sectionId`-style slugs (e.g., `usnews`, `politics`, `business`) to `/api/category/<Category>/`, which filters `news_category` (`pillarName`, e.g. `News`, `Sport`, `Arts`, `Lifestyle`, `Opinion`).

### Other Verified Bugs & Gaps
1. **News Quiz (`core/newsquiz/` & `newsquiz.js`):**
   - `GET /api/quiz/` works when `game_data.csv` is loaded, but returns `label` directly in the GET payload (exposing the answer before submission) and returns `None` (DRF AssertionError) if the table is empty.
   - `POST /api/quiz/` crashes with `AttributeError` if `id` is not found and returns `None` on invalid serializer input.
   - `NewsQuizData.__str__` returns `{self.news_title}` (a Python `set` instead of a `str`).
   - Frontend `newsquiz.js` grades the quiz client-side instead of calling `POST /api/quiz/`.
2. **Frontend CheckByTitle (`checkbytitle.js`):**
   - Hardcoded `http://127.0.0.1:8000` URL.
   - No whitespace validation, max-length validation, timeout handling, or server-error feedback when input is non-empty and the backend fails.
   - Misleading UI copy (`"Real news!"` / `"Fake news!"` / `"Predicted as real news!"`) with no limitations notice.
3. **Frontend Date Formatting (`home.js`, `category.js`):**
   - Uses `.getDay()` (weekday 0–6) instead of `.getDate()` (day of month) and zero-indexed `.getMonth()` without `+ 1`.
4. **Tests & Security:**
   - 0 backend tests (`Found 0 test(s)`), 0 frontend tests.
   - `DEBUG = True`, hardcoded `SECRET_KEY`, `ALLOWED_HOSTS = ['*']`, `CORS_ALLOW_ALL_ORIGINS = True` in `settings.py`.
   - No `.env.example`, no Gemini chatbot endpoint or UI, no `docs/` folder.

---

## 4. Unknowns & Environment Status
- `GEMINI_API_KEY` / `GOOGLE_API_KEY` are currently **not set** in the local shell environment (must be supplied via `.env` by the team for live Gemini responses; backend must fail safely when absent and tests will mock provider calls plus allow live smoke-testing once a key is provided).
- Live Guardian news fetching cannot succeed with the upstream hardcoded key (`401 Unauthorized`); requires an optional `GUARDIAN_API_KEY` env var if live polling is enabled.

---

## 5. High-Level Remediation Plan (Phase 1 Preview)
1. **Backend Stabilization & Correctness:** Fix label mapping (`0 = Real`, `1 = Fake`) across classifier inference, live news, and quiz; add input validation, scores/labels, safe `livenews` handling (no import-time crash thread, optional `GUARDIAN_API_KEY`), and environment-driven `settings.py` (`python-dotenv`, `.env.example`).
2. **Gemini Media Literacy Chatbot:** Add `POST /api/chat/` backed by `google-genai` using `GEMINI_API_KEY`, strict media-literacy system prompt (no fabricated sources, no claiming live internet checks, explicit ML-limitation framing), input validation, and structured error handling.
3. **Frontend TruthLens Redesign (preserving React + Bootstrap stack):** Rebrand UI to **TruthLens**, centralize API base URL (`REACT_APP_API_BASE_URL`), build cohesive News Analyzer (with limitation notice, loading/validation/error/timeout states, model score display), Media Literacy Chatbot (with context handoff from analyzer), preserved Quiz (graded via `POST /api/quiz/`), graceful Monitoring view, and Methodology & Responsible-Use section.
4. **Testing & Assignment Documentation:** Add Django unit/API tests + React Testing Library tests, update `README.md`, and complete `docs/PROJECT_DOCUMENTATION.md`, `docs/PROMPT_LOG.md`, `docs/AI_TOOL_USAGE.md`, and `docs/TEST_REPORT.md`.
