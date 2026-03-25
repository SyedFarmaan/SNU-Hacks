# CashFlow Copilot - Developer Agents

## Tech Stack
- **Languages**: Python (Backend), TypeScript/JavaScript (Frontend)
- **Frameworks**: FastAPI (Backend), React with Vite (Frontend)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **LLM**: Google Gemini API (Flash 1.5 for OCR, Pro 1.5 for CoT)
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts

## Project Status
**Current Phase**: Initial Scaffolding & Planning

**What Works**: Architecture design, Idea submission, 4-layer strategy defined.
**What's Next**: Database schema setup (Supabase), FastAPI & React project scaffolding, Layer 2 Math Engine.

## Context & Documentation
- **Source of Truth**: The `server/docs/` folder and `architecture.md` are the sources of truth. 
- **Future Plans**: Keep future plans in `architecture.md` or a `ROADMAP.md`. Maintain current state docs in `docs/`.

## Dev environment tips

* Read `docs/**/*.md` and `architecture.md` before modifying any subsystem.
* For backend: use `pytest` for logic verification.
* For frontend: use `npm run dev` and ensure responsive design.
* Write a brief technical spec to `docs/` before generating new major features.
* Pick filenames and organize new utility scripts autonomously.

## Testing instructions

* Place backend tests in `backend/tests/` and frontend tests in `frontend/src/tests/`.
* Never write throwaway test scripts; always place tests inside the main test suite.
* If a test fails, fix it. Do not remove the test.
* For financial math (Layers 2 & 3), deterministic unit tests are MANDATORY.

## Coding Standards
* **No Emojis in Code**: Do not use emojis in comments, variable names, or logging.
* **Strict Typing**: Use Pydantic models for FastAPI and TypeScript interfaces for React.
* **Keep files concise**: Extract helpers instead of large monolithic files. Aim for under 700 LOC.
* **Comments**: Add brief code comments for tricky financial logic (e.g., greedy optimization, runway math).
* **Deterministic Logic**: Layers 2 and 3 MUST NOT use LLM logic for calculations.

## PR & Git instructions

* Title format: `[<module_name>] <action>: <description>`
* Scope commits strictly to modified files.
* Never create or apply `git stash`.
* Never switch branches autonomously.

## Project boundaries & safety

* Never drop a database or delete configuration files without explicit capitalized user confirmation (e.g., "YES, DELETE IT").
* Never edit files inside `node_modules/` or venv directories.
* **Accuracy is Critical**: This is a financial app; calculations must be 100% accurate.

## Other
* Whenever you make any change, make sure to update the documentation in the architecture.md file in the `docs/` directory.
