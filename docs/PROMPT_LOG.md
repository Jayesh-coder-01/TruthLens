# Prompt Engineering Log — TruthLens

This log records the initial five-part prompt and refinements used to adapt `DJDarkCyber/Fake-News-Detector` into **TruthLens**. Entries only record interactions actually executed and verified; placeholders are marked clearly where the student team must append their own external tool sessions (such as ChatGPT or live `GEMINI_API_KEY` testing).

---

## Entry 1 — Initial Five-Part Master Adaptation Prompt
- **Date:** 2026-11-25
- **Tool Name:** Google Antigravity
- **Five-Part Structure:**
  - **Role:** Senior full-stack software engineer, DRF specialist, React engineer, applied ML engineer, QA engineer, and UI/UX designer.
  - **Task:** Adapt `DJDarkCyber/Fake-News-Detector` into TruthLens: audit the repo, preserve & verify Django/React/ML/quiz/monitoring, improve UI, add a Google Gemini Media Literacy Assistant chatbot, add responsible-use notices, tests, setup instructions, and assignment docs.
  - **Context:** Third-semester Prompt Engineering final project; starter README claims must be verified from code/notebook; ML outputs must never be presented as authoritative fact-checks.
  - **Constraints:** Audit before editing (`docs/REPOSITORY_AUDIT.md`), preserve stack & preprocessing, label predictions/scores honestly, implement server-side Gemini chatbot (`GEMINI_API_KEY` in env), keep `.env` out of Git, no fabricated metrics/citations/sources, no unapproved deployment.
  - **Output Format:** Phased execution (Phase 0 Audit -> Phase 1 Plan -> Phase 2 Core Analysis -> Phase 3 Gemini Chatbot -> Phase 4 Quality & Docs -> Phase 5 Final Handover).
- **Why Used:** To establish strict engineering, ML-honesty, security, and documentation guardrails across the full adaptation lifecycle.
- **Summary of AI Output:** Produced repository audit (`docs/REPOSITORY_AUDIT.md`), uncovered critical label-inversion and Guardian startup-thread bugs, fixed backend inference/quiz/monitoring, implemented `/api/chat/` with `google-genai`, redesigned the React UI to TruthLens, and added 19 backend + 4 frontend tests.
- **Accepted / Changed / Rejected:**
  - *Accepted:* Preserved `MultinomialNB` + `CountVectorizer` `.pkl` pipeline and Django + React stack.
  - *Changed during execution:* Upgraded Django from `4.2.3` to `5.2.19` and DRF to `3.18.3` after observing Python 3.14 `BaseContext.__copy__` test-client crash on 5xx responses, and unpinned `scikit-learn==1.5.0` / removed unused `psycopg2==2.9.9` due to Python 3.14 wheel availability.
- **Verification:** `python manage.py test` (19 tests OK), `npm test -- --watchAll=false` (4 tests OK), `npm run build` (0 warnings), live `runserver` HTTP smoke test.
- **Evidence Paths:** [docs/REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md), [docs/TEST_REPORT.md](TEST_REPORT.md), branch `feat/truthlens-adaptation`.

---

## Entry 2 — Backend Label-Mapping & Python 3.14 Compatibility Refinement
- **Date:** 2026-11-25
- **Tool Name:** Google Antigravity (Diagnostic Investigation)
- **Why Used:** Baseline verification revealed two blockers: (1) `game_data.csv` and `nb_model.pkl` use `0 = Real`, `1 = Fake`, which upstream views inverted; (2) `Django 4.2.3` crashed in `django.template.context.BaseContext.__copy__` on Python 3.14 when logging 5xx responses during tests.
- **Summary of AI Output:** Verified predictions on `game_data.csv` (90.7% title-only accuracy), fixed `0 = Real (True)` / `1 = Fake (False)` in `core/model.py`, `core/newsquiz/viewsets.py`, and `core/livenews/viewsets.py`, and validated `django==5.2.19` + `djangorestframework>=3.15.2` on Python 3.14.6.
- **Verification:** `core/usercheckbytitle/tests.py`, `core/newsquiz/tests.py`, and live HTTP calls in `TEST_REPORT.md`.

---

## Entry 3 — Pending Student Team Entries (To Be Appended After Manual Steps)
- **ChatGPT Session (Prompt Design / Test Brainstorming):** *Not yet recorded by student team. Append date, exact prompt, output summary, and screenshot/transcript path after running.*
- **Live Gemini API 12-Prompt Evaluation (Follow-up 3):** *Pending valid `GEMINI_API_KEY` in `.env`.*
