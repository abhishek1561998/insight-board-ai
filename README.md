# InsightBoard Dependency Engine

Take-home implementation for **InsightBoard AI**. This project converts meeting transcripts into a validated task dependency graph with persistence, async jobs, idempotent submissions, and interactive graph UI.

## Assignment Level Coverage

- Level 1 (Required): Completed
- Level 2 (Bonus): Completed
- Level 3 (Bonus): Completed

## Tech Stack

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS, React Flow
- Backend: Express, TypeScript
- Database: SQLite
- LLM API: OpenAI (with deterministic heuristic fallback if `OPENAI_API_KEY` is not set)

## Monorepo Structure

```text
insightAI/
  apps/
    api/
      data/
      src/
        config/
        db/
        lib/
        routes/
        services/
        worker/
    web/
      src/
        app/
        components/
        lib/
  packages/
    shared/
      src/
  data/
    input-transcript.txt
  scripts/
    submit-sample.mjs
  docs/
    ARCHITECTURE.md
```

## Core Features

### Level 1 - Robust Backend

- Strict LLM output schema (`id`, `description`, `priority`, `dependencies[]`)
- Dependency sanitization for hallucinated/non-existent IDs
- Cycle detection without crashing; cycle tasks flagged as `Error`
- Transcript + generated graph persistence in SQLite

### Level 2 - Async + Idempotency

- `POST /api/jobs` returns `jobId` immediately (`pending`)
- Poll with `GET /api/jobs/:jobId` until `completed`/`failed`
- Transcript hash (`sha256` on normalized text) enforces idempotent duplicate submissions

### Level 3 - Visualization + Interactive State

- Graph rendered with React Flow
- Visual states for `Ready`, `Blocked`, `Completed`, `Error`
- Clicking `Complete` unlocks dependent tasks via client-side state (no page refresh)

## API Contract

- `POST /api/jobs`

```json
{
  "transcript": "..."
}
```

Response:

```json
{
  "jobId": "clx...",
  "status": "pending",
  "deduplicated": false
}
```

- `GET /api/jobs/:jobId`

Returns status plus graph once completed.

## Cycle Detection Logic

- The backend builds a directed graph: task -> dependencies
- Tarjan's strongly connected components algorithm identifies cycles
- Any SCC with size > 1 is a cycle; self-loop also counts
- Tasks in cycles are marked `Error` with reason `Circular dependency detected`

## Idempotency Logic

- Input transcript is normalized (trim + lowercase + collapsed spaces)
- `sha256(normalizedTranscript)` is stored as unique `Submission.normalizedHash`
- Duplicate submissions return the existing job instead of regenerating tasks

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure env files:

```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
```

3. Initialize DB schema:

```bash
npm run db:init
```

4. Run API + Web:

```bash
npm run dev
```

- API: `http://localhost:8080`
- Web: `http://localhost:3000`

## Run With Provided Transcript

Your provided transcript is included at `data/input-transcript.txt`.

1. Start the API:

```bash
npm run dev -w @insightboard/api
```

2. In another terminal run:

```bash
npm run sample:run
```

## Tests

```bash
npm test
```

Covers:
- invalid dependency sanitization
- cycle detection behavior

## Deployment Notes

- Web can be deployed to Vercel
- API can be deployed to Render/Railway
- For production, switch SQLite to PostgreSQL and move queue to Redis/BullMQ

## Submission Checklist Mapping

- GitHub repository: this codebase
- Live hosted app: deploy web + api as above
- README includes: level completed, stack/LLM API, cycle detection, idempotency, setup steps
# insight-board-ai
