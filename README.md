# TruthLens — Fake News Analysis & Media Literacy Web Application

> **Attribution & Origin:** TruthLens is a Prompt Engineering final-project fork/adaptation of [`DJDarkCyber/Fake-News-Detector`](https://github.com/DJDarkCyber/Fake-News-Detector) (MIT License, Copyright © 2023 DJDarkCyber). All upstream attribution and the original [MIT License](LICENSE) are preserved.

TruthLens helps users critically evaluate online news headlines without mistaking machine-learning predictions for factual proof. It preserves the original Django + React + Multinomial Naive Bayes architecture while fixing critical upstream bugs, adding responsible-use framing, and integrating a backend-mediated **Google Gemini Media Literacy Assistant**.

---

## Features

1. **Headline & Claim Classifier (`/checkbytitle` / `/analyze`)**
   - Uses the original `CountVectorizer` (26,645-term title vocabulary) + `MultinomialNB` model trained on `WELFake_Dataset.csv` (`0 = Real`, `1 = Fake`).
   - Displays `predicted_label`, `raw_class`, and uncalibrated `model_score` / `model_scores` alongside an explicit limitation notice:
     > *"This is an automated model prediction, not proof that a claim is true or false. Verify important information with independent and primary sources."*
   - Validates empty, whitespace, short (`< 3` chars), and oversized (`> 5000` chars) inputs with clear loading, error, and timeout states.
2. **Gemini Media Literacy Assistant (`/assistant`)**
   - Connects via `POST /api/chat/` to the Google Gemini API (`google-genai` SDK) using a server-side `GEMINI_API_KEY`.
   - Explains what ML scores mean, teaches primary-source claim verification, accepts optional classifier context from the Analyzer, and is strictly instructed never to fabricate sources or claim live web access.
3. **News Identification Quiz (`/newsquiz`)**
   - Serves random historical headlines from `game_data/game_data.csv` (first 1,000 rows of `WELFake_Dataset.csv`) via `GET /api/quiz/` (without leaking the answer) and grades submissions server-side via `POST /api/quiz/`.
4. **Optional Live Guardian Monitoring (`/` & `/category/:category`)**
   - Preserves the Guardian Open Platform integration (`GUARDIAN_API_KEY` via `.env`). If `GUARDIAN_API_KEY` is not set, the app degrades gracefully instead of crashing on startup.
5. **Methodology & Limitations (`/methodology`)**
   - Documents the verified training/inference pipeline, upstream bug fixes, and responsible-use boundaries.

---

## Tech Stack

- **Backend:** Python, Django (`>=5.2,<6.0` on Python 3.14; `4.2+` compatible on Python 3.10–3.12), Django REST Framework, `django-cors-headers`, `scikit-learn`, `pandas`, `beautifulsoup4`, `google-genai`, `python-dotenv`, SQLite.
- **Frontend:** React 18.2 (`react-scripts` 5.0.1 / Create React App), React Router v6, React Bootstrap 2.8 / Bootstrap 5.3, Axios, React Testing Library / Jest.

---

## Local Setup Instructions

### 1. Configure Environment Variables
Copy `.env.example` to `.env` at the repository root (or inside `app/FakeNewsDetectorAPI/.env`) and add your server-side `GEMINI_API_KEY`:

```bash
cp .env.example .env
```

Required / supported variables (never commit `.env`):
- `GEMINI_API_KEY` — Google Gemini API key (server-side only; required for live `/api/chat/` responses)
- `GEMINI_MODEL` — Defaults to `gemini-2.5-flash`
- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CORS_ALLOW_ALL_ORIGINS`
- `GUARDIAN_API_KEY` — Optional; enables on-demand Guardian live feed refresh
- `REACT_APP_API_BASE_URL` — Defaults to `http://127.0.0.1:8000`

### 2. Backend Setup (`app/FakeNewsDetectorAPI/`)

```bash
cd app/FakeNewsDetectorAPI
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py quiz_data_loader game_data/game_data.csv
python manage.py runserver
```

### 3. Frontend Setup (`app/fake-news-detector-frontend/`)

```bash
cd app/fake-news-detector-frontend
npm install
npm start
```

Open `http://localhost:3000`.

---

## Running Tests

- **Backend (19 Django/DRF tests):**
  ```bash
  cd app/FakeNewsDetectorAPI
  python manage.py test
  ```
- **Frontend (4 React Testing Library tests + production build):**
  ```bash
  cd app/fake-news-detector-frontend
  npm test -- --watchAll=false
  npm run build
  ```

---

## API Summary

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/usercheck/title/` | `POST` | Classify `{ "user_news": "..." }` with `MultinomialNB` |
| `/api/chat/` | `POST` | Send `{ "message", "history", "analysis_context" }` to Gemini |
| `/api/chat/status/` | `GET` | Check if `GEMINI_API_KEY` is configured |
| `/api/quiz/` | `GET` / `POST` | Fetch random quiz item (no label) / grade `{ "id", "answer" }` |
| `/api/live/` | `GET` | List up to 10 stored live-monitored articles |
| `/api/live/status/` | `GET` | Check if `GUARDIAN_API_KEY` is configured |
| `/api/live/refresh/` | `POST` | On-demand Guardian fetch & classify (requires `GUARDIAN_API_KEY`) |
| `/api/category/<category>/` | `GET` | Filter stored live articles by category or section |

---

## Documentation Index

- [docs/REPOSITORY_AUDIT.md](docs/REPOSITORY_AUDIT.md) — Phase 0 audit of upstream repo, ML pipeline, and defects
- [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md) — Architecture, API contracts, security checklist, and requirement matrix
- [docs/PROMPT_LOG.md](docs/PROMPT_LOG.md) — Initial five-part prompt and refinements log
- [docs/AI_TOOL_USAGE.md](docs/AI_TOOL_USAGE.md) — Verified AI tool contributions
- [docs/TEST_REPORT.md](docs/TEST_REPORT.md) — Executed commands and pass/fail verification results
