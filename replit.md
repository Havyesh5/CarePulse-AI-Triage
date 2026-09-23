# CarePulse AI

CarePulse AI helps people organize symptoms, identify emergency warning signs, and prepare for a conversation with a healthcare professional without making diagnoses.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required secret: `SESSION_SECRET` — signs short-lived auth tokens
- Optional secret: `GEMINI_API_KEY` — powers structured Gemini symptom analysis; a safe local fallback remains available

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/carepulse-ai/src/` — React routes, authenticated shell, forms, and triage views
- `artifacts/api-server/src/routes/` — auth, dashboard, assessment, and health endpoints
- `artifacts/api-server/src/lib/triage.ts` — emergency red-flag interception, Gemini prompt, and safe fallback analysis
- `lib/api-spec/openapi.yaml` — source of truth for the generated API client and Zod schemas
- `lib/db/src/schema/` — PostgreSQL schema for users and assessments

## Architecture decisions

- The frontend uses generated OpenAPI hooks so forms, cache invalidation, and response shapes stay aligned with the server.
- Auth uses bearer JWTs signed with the existing `SESSION_SECRET`; passwords are hashed before storage.
- Emergency keywords are intercepted before the model call and can only increase urgency, never reduce it.
- AI output is normalized to the app's camelCase contract while the model is instructed to return the requested snake_case JSON shape.

## Product

- Public safety-first landing page with a persistent emergency notice.
- Account registration/login with refresh-safe sessions.
- Multi-step symptom intake covering age, biological sex, symptoms, duration, severity, conditions, and medications.
- AI-assisted triage detail with urgency, possible causes to discuss, actions, clinician questions, red flags, and disclaimer.
- Searchable, filterable assessment history and dashboard summary.

## User preferences

- Keep medical guidance non-diagnostic and show the full disclaimer on evaluation views.

## Gotchas

- Use the managed workflow for the web build; Vite requires workflow-provided `PORT` and `BASE_PATH`.
- After changing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`.
- After changing `lib/db/src/schema`, run `pnpm --filter @workspace/db run push` and refresh library declarations with `pnpm run typecheck:libs`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
