# InsightBoard Dependency Engine

A full-stack application that converts meeting transcripts into validated task dependency graphs using AI. Features async job processing, idempotent submissions, and an interactive graph visualization UI.

## Assignment Level Coverage

- **Level 1 (Required):** ✅ Completed
- **Level 2 (Bonus):** ✅ Completed
- **Level 3 (Bonus):** ✅ Completed

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, React Flow |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL (Vercel Postgres) |
| LLM | OpenAI GPT-4.1-mini (with heuristic fallback) |

## Monorepo Structure

```
insight-board-ai/
├── apps/
│   ├── api/                    # Express backend
│   │   └── src/
│   │       ├── config/         # Environment configuration
│   │       ├── db/             # Database client & repository
│   │       ├── lib/            # Dependency engine & utilities
│   │       ├── routes/         # API route handlers
│   │       ├── services/       # LLM & graph services
│   │       └── worker/         # Async job queue
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # App router pages
│           ├── components/     # React components
│           └── lib/            # API client & graph utilities
├── packages/
│   └── shared/                 # Shared TypeScript schemas
├── data/
│   └── input-transcript.txt    # Sample transcript
└── scripts/
    └── submit-sample.mjs       # CLI script to test API
```

## Core Features

### Level 1 - Robust Backend

- Strict LLM output schema (`id`, `description`, `priority`, `dependencies[]`)
- Dependency sanitization for hallucinated/non-existent IDs
- Cycle detection without crashing; cycle tasks flagged as `Error`
- Transcript + generated graph persistence in PostgreSQL

### Level 2 - Async + Idempotency

- `POST /api/jobs` returns `jobId` immediately (`pending`)
- Poll with `GET /api/jobs/:jobId` until `completed`/`failed`
- Transcript hash (`sha256` on normalized text) enforces idempotent duplicate submissions

### Level 3 - Visualization + Interactive State

- Graph rendered with React Flow
- Visual states for `Ready`, `Blocked`, `Completed`, `Error`
- Clicking `Complete` unlocks dependent tasks via client-side state (no page refresh)

## API Contract

### `POST /api/jobs`

Submit a transcript for processing.

**Request:**
```json
{
  "transcript": "Meeting notes discussing project tasks..."
}
```

**Response:**
```json
{
  "jobId": "abc123",
  "status": "pending",
  "deduplicated": false
}
```

### `GET /api/jobs/:jobId`

Poll for job status and retrieve results.

**Response (completed):**
```json
{
  "jobId": "abc123",
  "status": "completed",
  "tasks": [
    {
      "id": "task-1",
      "description": "Design database schema",
      "priority": "high",
      "dependencies": [],
      "state": "Ready"
    }
  ]
}
```

## Cycle Detection Logic

- The backend builds a directed graph: task → dependencies
- Tarjan's strongly connected components algorithm identifies cycles
- Any SCC with size > 1 is a cycle; self-loop also counts
- Tasks in cycles are marked `Error` with reason `Circular dependency detected`

## Idempotency Logic

- Input transcript is normalized (trim + lowercase + collapsed spaces)
- `sha256(normalizedTranscript)` is stored as unique `Submission.normalizedHash`
- Duplicate submissions return the existing job instead of regenerating tasks

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database (or use Vercel Postgres)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL=file:./data/dev.db

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-api-key-here
OPENAI_MODEL=gpt-4.1-mini

# Server
PORT=8080
WEB_ORIGIN=http://localhost:3000
```

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

### 3. Initialize database

```bash
npm run db:init
```

### 4. Start development servers

```bash
npm run dev
```

This starts both servers concurrently:
- **API:** http://localhost:8080
- **Web:** http://localhost:3000

## Testing with Sample Transcript

A sample transcript is included at `data/input-transcript.txt`.

**Option 1:** Use the web UI at http://localhost:3000

**Option 2:** Use the CLI script:

```bash
npm run sample:run
```

## Running Tests

```bash
npm test
```

Test coverage includes:
- Invalid dependency sanitization
- Cycle detection behavior
- Hash-based idempotency

## Deployment

### Vercel Deployment

Both apps can be deployed to Vercel:

1. **API:** Deploy `apps/api` as a serverless function
2. **Web:** Deploy `apps/web` as a Next.js app

### Environment Variables (Production)

**API (`apps/api`):**
| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | PostgreSQL connection string (auto-set with Vercel Postgres) |
| `OPENAI_API_KEY` | OpenAI API key for task extraction |
| `OPENAI_MODEL` | Model to use (default: `gpt-4.1-mini`) |
| `WEB_ORIGIN` | Frontend URL for CORS |

**Web (`apps/web`):**
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API and Web in development mode |
| `npm run build` | Build all packages and apps |
| `npm test` | Run test suite |
| `npm run db:init` | Initialize database schema |
| `npm run sample:run` | Submit sample transcript via CLI |
| `npm run lint` | Run linters across workspaces |
| `npm run format` | Format code with Prettier |
