# Test Report — TruthLens

**Test Date:** 2026-11-25  
**Environment:** Windows, Python `3.14.6`, Django `5.2.19`, DRF `3.18.3`, Node `v24.13.0`, npm `11.6.2`

---

## 1. Baseline Checks (Before Code Changes)

| Check | Command | Result | Observed Output |
| --- | --- | --- | --- |
| Upstream `requirements.txt` install | `pip install -r app/FakeNewsDetectorAPI/requirements.txt` | **FAIL** | `scikit-learn==1.5.0` failed Cython/Meson build on Python 3.14 (`ERROR: Cython requires python3 dependency`). |
| Baseline Django tests | `python manage.py test` | **FAIL (0 tests)** | `Found 0 test(s). Ran 0 tests in 0.000s. NO TESTS RAN` (exit code 1). |
| Baseline URL import / Live thread | `python manage.py shell -c "import FakeNewsDetectorAPI.urls"` | **ERROR in thread** | `Thread-1 (auto_refresh_news)` crashed with `KeyError: 'response'`; Guardian API returned `401 {"message": "Unauthorized"}`. |
| Baseline frontend tests | `npm test -- --watchAll=false --passWithNoTests` | **0 tests** | `No tests found, exiting with code 0`. |
| Baseline frontend build | `npm run build` | **PASS (13 warnings)** | Compiled with 13 ESLint warnings (`alt-text`, `img-redundant-alt`, `exhaustive-deps`, `no-unused-vars`). |

---

## 2. Final Automated Test Suite (After Final Edits)

### Backend Tests (`app/FakeNewsDetectorAPI/`)
- **Command:** `.\.venv\Scripts\python.exe manage.py check` -> **PASS** (`System check identified no issues (0 silenced).`)
- **Command:** `.\.venv\Scripts\python.exe manage.py test` -> **PASS (`Ran 19 tests in 8.181s — OK`)**
  - `core.usercheckbytitle.tests.UserCheckAPITests` (6 tests):
    - Class `0` ("Bobby Jindal...") -> `200`, `prediction=True`, `predicted_label="Real"`, `raw_class=0`, `model_score`, `disclaimer`
    - Class `1` ("SATAN 2...") -> `200`, `prediction=False`, `predicted_label="Fake"`, `raw_class=1`
    - Empty / blank / `<3` chars / `>5000` chars -> `400`
    - Model unavailable (`ModelUnavailableError` & missing `.pkl` path) -> `503`
  - `core.newsquiz.tests.NewsQuizAPITests` (3 tests):
    - Empty DB -> `404`
    - `GET /api/quiz/` omits `label`; `POST /api/quiz/` grades WELFake `0=Real (True)`, `1=Fake (False)`
    - Missing quiz ID -> `404`; invalid payload -> `400`
  - `core.livenews.tests.LiveNewsAPITests` (3 tests):
    - Unconfigured `GUARDIAN_API_KEY` status (`200`, `configured=False`) and refresh (`503`)
    - Case-insensitive category & section filtering
    - Mocked Guardian API refresh persists article with fixed `0=Real` mapping
  - `core.chatbot.tests.ChatbotAPITests` (7 tests, using mocked `google.genai.Client`):
    - Empty / blank / `>2000` char / invalid history role -> `400`
    - Missing `GEMINI_API_KEY` -> `200` on `/api/chat/status/` (`configured=False`), `503` on `/api/chat/`
    - Valid reply with `analysis_context` + system-prompt guardrail check -> `200`
    - Rate limit (`APIError 429`) -> `429`
    - Timeout (`TimeoutError`) -> `504`
    - Empty provider response -> `502`

### Frontend Tests & Build (`app/fake-news-detector-frontend/`)
- **Command:** `npm test -- --watchAll=false` -> **PASS (`Test Suites: 1 passed, 4 passed, 4 total`)**
  - `CheckByTitle` empty validation + classifier result + limitation notice
  - `CheckByTitle` backend-down error banner
  - `ChatbotPanel` missing-key warning + attached context + Gemini reply rendering (mocked `apiClient`)
  - `NewsQuiz` `GET /api/quiz/` + `POST /api/quiz/` grading (mocked `apiClient`)
- **Command:** `npm run build` -> **PASS (`Compiled successfully.`, 0 ESLint warnings)**

---

## 3. Live HTTP Server Smoke Test (`manage.py runserver`)

Executed against live `python manage.py runserver 127.0.0.1:8009 --noreload` with `Origin: http://localhost:3000`:
- `POST /api/usercheck/title/` (real headline) -> `200`, `Access-Control-Allow-Origin: http://localhost:3000`, `predicted_label: "Real"`, `raw_class: 0`, `model_score: 1.0`
- `POST /api/usercheck/title/` (blank) -> `400`, `{"user_news": ["Please enter a news headline or text to analyze."]}`
- `GET /api/quiz/` -> `200`, keys `['id', 'news_title', 'news_description']`
- `POST /api/quiz/` -> `200`, `{'result': False, 'correct': False, 'actual_is_real': False, 'actual_label': 'Fake'}`
- `GET /api/live/status/` -> `200`, `{'configured': False, 'stored_count': 0, ...}`
- `GET /api/chat/status/` -> `200`, `{'configured': False, 'model': 'gemini-2.5-flash'}`
- `POST /api/chat/` (no `GEMINI_API_KEY` set) -> `503`, `{'error': 'Media Literacy Assistant is not configured. Set GEMINI_API_KEY in the server environment.'}`

---

## 4. Pending Manual Verification (Requires Student `GEMINI_API_KEY` & Browser)
- Live end-to-end Google Gemini API responses in `/assistant` (including the 12 adversarial prompts in Follow-up 3).
- Visual inspection of desktop & mobile browser viewports and capturing assignment screenshots.
