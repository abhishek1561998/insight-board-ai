# Architecture Notes

## Processing Flow

1. Frontend submits transcript to `POST /api/jobs`.
2. Backend computes normalized transcript hash.
3. If hash exists, backend returns existing job (`deduplicated: true`).
4. Else backend creates `Submission` + `Job(status=pending)`.
5. In-memory queue worker processes jobs sequentially:
   - `processing`
   - LLM extraction to strict JSON task list
   - dependency sanitization + cycle detection
   - persist graph JSON
   - mark `completed` or `failed`
6. Frontend polls `GET /api/jobs/:jobId` and renders graph when done.

## Data Model

- `Submission`
  - Stores original transcript
  - Unique `normalizedHash` for idempotency
- `Job`
  - Stores async processing state
  - Stores generated graph JSON and source model

## Why This Design

- Keeps Level 1 logic deterministic and testable in `lib/dependency-engine.ts`
- Handles real LLM latency with non-blocking API UX
- Avoids duplicate cost for repeat submissions
- Preserves full audit data (raw input + output graph)

## Production Extensions

- Replace in-memory queue with Redis/BullMQ
- Add authentication + per-user rate limiting
- Add retry policy and dead-letter queue for failed jobs
- Persist node completion states in DB for collaborative boards
- Replace SQLite with PostgreSQL and add indexes on `updatedAt`
