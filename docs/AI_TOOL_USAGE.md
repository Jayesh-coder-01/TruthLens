# AI Tool Usage Log — TruthLens

In accordance with assignment integrity rules, tools are only marked as **Used** when verifiable outputs exist in the repository.

| Tool | Role in Project | Status | Verified Contribution & Evidence |
| --- | --- | --- | --- |
| **Google Antigravity** | Repository audit, debugging, backend/frontend implementation, test creation, documentation | **Used (Verified)** | Audited upstream repo (`docs/REPOSITORY_AUDIT.md`), discovered & fixed WELFake label inversion and Guardian import-thread crash, built TruthLens UI, implemented `/api/chat/` and 23 automated tests (`docs/TEST_REPORT.md`). |
| **Google Gemini API (`google-genai`)** | Runtime AI model powering the Media Literacy Assistant (`/api/chat/`) | **Integrated & Mock-Tested (Live Key Pending)** | Server-side integration implemented in `app/FakeNewsDetectorAPI/core/chatbot/services.py` with strict anti-hallucination system prompt and error handling (`400`/`429`/`502`/`503`/`504`); verified via mocked `genai.Client` tests and live `503` unconfigured check. Live responses require student's `GEMINI_API_KEY` in `.env`. |
| **ChatGPT (or third external AI tool)** | Requirement analysis, prompt refinement, test-case brainstorming / viva review | **Pending Student Execution** | *To be completed and evidenced by the student team (record date, prompt, changes accepted/rejected, and evidence link in `docs/PROMPT_LOG.md`).* |
