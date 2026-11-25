# Project Documentation — TruthLens

**Base Repository:** `DJDarkCyber/Fake-News-Detector` (MIT License, commit `41d22c8`)  
**Adaptation Branch:** `feat/truthlens-adaptation`

---

## 1. System Architecture

TruthLens uses a decoupled client-server architecture:
1. **React SPA (`app/fake-news-detector-frontend/`)** — Built with Create React App (`react-scripts@5.0.1`), React Router v6, React Bootstrap 2.8, and a centralized Axios client (`src/api/client.js`) pointing to `REACT_APP_API_BASE_URL` (default `http://127.0.0.1:8000`).
2. **Django REST Framework API (`app/FakeNewsDetectorAPI/`)** — Serves four modular apps under `core/`:
   - `core.usercheckbytitle`: Lazy-loads `models/nb_model.pkl` and `models/vectorizer_model.pkl` via `core/model.py` and exposes `POST /api/usercheck/title/`.
   - `core.chatbot`: Stateless Gemini integration via `google-genai` (`core/chatbot/services.py`) exposing `POST /api/chat/` and `GET /api/chat/status/`.
   - `core.newsquiz`: SQLite-backed quiz (`NewsQuizData`, populated from `game_data/game_data.csv`) exposing `GET /api/quiz/` and `POST /api/quiz/`.
   - `core.livenews`: Optional Guardian Open Platform integration (`LiveNews`) exposing `GET /api/live/`, `GET /api/live/status/`, `POST /api/live/refresh/`, and `GET /api/category/<category>/`.

---

## 2. Verified ML Pipeline & Label Semantics

- **Training Dataset (`FakeNewsDetection_AIProject.ipynb`):** `WELFake_Dataset.csv` (72,134 rows: `title`, `text`, `label`).
- **Label Convention:** Verified directly from `game_data/game_data.csv` and notebook cells 8–10, 22, 26, and 41–43:
  - `0` = **Real news** (e.g., Reuters political/policy wire headlines)
  - `1` = **Fake news** (e.g., sensationalized/hoax headlines)
- **Production Artifacts (`app/FakeNewsDetectorAPI/models/`):**
  - `vectorizer_model.pkl`: `CountVectorizer(stop_words='english')` with **26,645** title vocabulary terms.
  - `nb_model.pkl`: `MultinomialNB(alpha=1.0, fit_prior=True)` with `classes_ = [0, 1]`.
- **Reproduced Evaluation (`game_data.csv`, 1,000 rows):**
  - Title-only accuracy of `nb_model.pkl`: **90.7%** (479 class-0 Real, 521 class-1 Fake).
  - Notebook `title + text` held-out test split (23,805 rows): **89%** (`MultinomialNB`), **94%** (`RandomForestClassifier(n_estimators=300)`). Note: the deployed `.pkl` files use the title-only Naive Bayes model.
- **Critical Upstream Bug Fixed:** Upstream `UserCheckViewSet`, `LiveNewsPrediction`, and `NewsQuizViewSet` mapped `1 -> True` ("Real news"), inverting every prediction and quiz answer. TruthLens fixes this mapping across all three modules so `0 -> Real (True)` and `1 -> Fake (False)`.

---

## 3. API Contracts

### `POST /api/usercheck/title/`
- **Request:** `{ "user_news": "<string, 3..5000 chars>" }`
- **Response (`200 OK`):**
  ```json
  {
    "prediction": true,
    "predicted_label": "Real",
    "raw_class": 0,
    "model_score": 0.9717,
    "model_scores": { "real": 0.9717, "fake": 0.0283 },
    "model_info": "MultinomialNB + CountVectorizer (26,645-term title vocabulary)",
    "disclaimer": "This is an automated model prediction, not proof that a claim is true or false. Verify important information with independent and primary sources."
  }
  ```
- **Errors:** `400` (empty/short/oversized/non-string input), `503` (model `.pkl` unavailable).

### `POST /api/chat/`
- **Request:**
  ```json
  {
    "message": "What does this classifier prediction mean?",
    "history": [{ "role": "user", "content": "..." }],
    "analysis_context": {
      "input_text": "...",
      "predicted_label": "Fake",
      "raw_class": 1,
      "model_score": 0.9912,
      "model_scores": { "real": 0.0088, "fake": 0.9912 }
    }
  }
  ```
- **Response (`200 OK`):**
  ```json
  {
    "reply": "...",
    "model": "gemini-2.5-flash",
    "has_analysis_context": true,
    "disclaimer": "Assistant guidance is educational and does not verify live breaking claims or replace independent primary-source checking."
  }
  ```
- **Errors:** `400` (empty/oversized message or invalid history/context), `429` (Gemini quota/rate limit), `503` (missing/invalid `GEMINI_API_KEY`), `504` (provider timeout), `502` (empty/malformed Gemini output).

### `GET /api/quiz/` & `POST /api/quiz/`
- `GET /api/quiz/` returns `{ "id", "news_title", "news_description" }` (`404` if DB empty; omits `label`).
- `POST /api/quiz/` accepts `{ "id": <int>, "answer": <bool> }` (`True` = Real, `False` = Fake) and returns `{ "result", "correct", "actual_is_real", "actual_label" }`.

### `GET /api/live/`, `GET /api/live/status/`, `POST /api/live/refresh/`, `GET /api/category/<category>/`
- `GET /api/live/` returns latest 10 stored `LiveNews` objects.
- `GET /api/live/status/` returns `{ "configured": <bool>, "stored_count": <int>, "message": "..." }`.
- `POST /api/live/refresh/` fetches Guardian headlines if `GUARDIAN_API_KEY` is configured (`503` if unset, `502` on upstream failure).

---

## 4. Security & Production Checklist

- `.env` is ignored by `.gitignore`; `.env.example` holds placeholders only.
- `GEMINI_API_KEY` and `GUARDIAN_API_KEY` are read strictly server-side in `settings.py`; never exposed to React.
- Chatbot logs record only error types/status codes, never API keys or user message contents.
- Before production deployment: set `DJANGO_DEBUG=False`, configure a strong `DJANGO_SECRET_KEY`, restrict `DJANGO_ALLOWED_HOSTS` to the deployed backend domain, and restrict `CORS_ALLOWED_ORIGINS` to the deployed frontend origin (`CORS_ALLOW_ALL_ORIGINS=False`).

---

## 5. Final Assignment Requirement Matrix

| Requirement | Status | Evidence / Notes |
| --- | --- | --- |
| Repository audit (`docs/REPOSITORY_AUDIT.md`) | **Complete** | `docs/REPOSITORY_AUDIT.md` created from direct inspection & execution |
| Preserve Django + React + ML pipeline | **Complete** | Same stack retained; label-inversion & Guardian startup crash fixed |
| News analysis UI & responsible-use notice | **Complete** | `checkbytitle.js`, limitation banner, uncalibrated score label, 400/503/timeout handling |
| News Quiz & Live Monitoring verified | **Complete** | Quiz graded server-side; Live Monitoring gracefully handles optional `GUARDIAN_API_KEY` |
| Backend Gemini Media Literacy Chatbot | **Partial** | `POST /api/chat/` + `ChatbotPanel.js` built & verified with mocked `google-genai` and live missing-key `503`; live Gemini API verification awaits student's `GEMINI_API_KEY` in `.env` |
| Automated backend & frontend tests | **Complete** | 19 Django tests + 4 React Testing Library tests passing |
| 3 AI Tools documented (`AI_TOOL_USAGE.md`) | **Partial** | Antigravity + Gemini integration recorded; third external tool (e.g., ChatGPT) awaiting student's recorded session |
| Screenshots & live Gemini 12-prompt evaluation | **Not started** | Manual student step once `GEMINI_API_KEY` is added and app is running in browser |
| Production deployment | **Not started** | Awaiting student approval/execution per Constraint H (no unapproved external deployment) |
