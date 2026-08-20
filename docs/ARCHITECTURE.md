# Architecture — current state (Phase 1 complete)

This doc is a quick-orientation snapshot for whoever picks up the next phase. See the original
plan for full context; this only covers what actually exists in the repo right now.

## What's built: `api-go/`

A working Go REST API (chi router, no ORM) backed by a single SQLite file.

- **DB**: `api-go/migrations/0001_init.sql` — full schema (users, sessions, api_keys,
  categories, plugins + FTS5 `plugins_fts`, plugin_versions, plugin_tags, plugin_images,
  scan_jobs, install_fingerprints, audit_log). Applied by a small embedded migration runner
  (`internal/db/db.go`) — not `golang-migrate`; see "Deviations" below. WAL mode,
  `foreign_keys=ON`, `busy_timeout=5000` set at connection open. `modernc.org/sqlite` (pure Go,
  no CGO) is the driver.
- **Query layer**: `internal/db/*.go`, one file per entity (`users.go`, `plugins.go`,
  `versions.go`, ...). Hand-written `database/sql`, not `sqlc` — see "Deviations".
- **Auth**: `internal/auth/` — argon2id password hashing, opaque random session tokens and API
  keys (only SHA256 hashes stored). `internal/httpapi/auth_handlers.go` implements
  register/login/logout/me. Session cookie is httpOnly, SameSite=Lax, Secure when
  `COOKIE_SECURE=true`.
- **Routes**: `internal/httpapi/server.go` wires every route from the plan — plugins CRUD,
  versions (multipart upload, download w/ counter increment, status), categories, search,
  dashboard (uploads, api-keys), `/v1/mc/*`, `/v1/admin/*`, and internal `/internal/v1/scan-jobs/*`.
- **Middleware**: `internal/httpapi/middleware.go` — request logging, panic recovery, CORS
  (env-configurable origin), per-IP token-bucket rate limiting (tighter bucket on `/v1/auth/*`),
  session/API-key auth, upload size cap (100MB, `http.MaxBytesReader`).
- **Audit logging**: every mutating action (register, login, logout, plugin create/update/delete,
  version create, api-key create/revoke, admin approve/ban, scan-job complete) writes an
  `audit_log` row.
- **Entry point**: `cmd/api/main.go` — reads config from env (see `.env.example`), opens the DB,
  ensures data dirs exist, starts the HTTP server.

## DEV ONLY — must change before Phase 4

`internal/httpapi/version_handlers.go`, in `handleUploadVersion`: when `DEV_AUTO_APPROVE=true`
(the local-dev default), a freshly uploaded version is marked `approved` immediately instead of
staying `pending_scan`, because there's no scan worker yet to move it forward. Every place this
happens is commented `DEV ONLY / TODO Phase 4`. **Turn this off (`DEV_AUTO_APPROVE=false`) once
the Rust worker is wired up**, or uploads will bypass the entire jar-scanning pipeline in
production.

The `/internal/v1/scan-jobs/{id}/complete` endpoint (`internal/httpapi/scanjobs_handlers.go`) is
the real callback surface for that worker — it already exists, requires the
`X-Internal-Secret` header to match `INTERNAL_SHARED_SECRET`, and 403s if that env var is unset.
It is not called by anything yet because DEV_AUTO_APPROVE short-circuits the flow before it's
needed. Bind this route to `127.0.0.1` only when deploying (never tunnel it) — that's a Phase 4
deployment concern, not something the Go code itself enforces.

## Everything else: stubbed placeholders only

`workers-rust/`, `web-node/`, `plugin-paper/`, `mcp-server/`, `deploy/` each contain only a
`README.md` describing what phase builds them and what goes there. `shared/openapi.yaml` is a
placeholder — no contract has been written yet; `api-go/internal/httpapi/*.go` is the current
source of truth for request/response shapes until a future phase backfills the OpenAPI spec.

## Deviations from the original plan (and why)

- **No `golang-migrate`**: a single forward-only migration file doesn't need a full migration
  framework and its driver dependency. `internal/db/db.go` has a ~40-line embedded-runner
  instead (tracks applied files in a `schema_migrations` table).
- **No `sqlc`**: hand-written typed query methods on `*db.Store` (one file per entity). Small
  surface area at this stage; revisit if the query layer grows unwieldy.
- **No `SESSION_SIGNING_KEY`**: sessions and API keys are opaque random tokens where only the
  SHA256 hash is persisted — there's no HMAC step that would need a signing key. Documented in
  `api-go/.env.example`.
- **No `/v1/plugins/{slug}/images` endpoint**: `plugin_images` table exists but no upload route
  was in the Phase 1 task's explicit route list, so it wasn't built. (Noticed this is referenced
  by `mcp-server/README.md`'s `upload_asset` tool description, written concurrently in another
  session — that route will need to land before that tool works.)

## Smoke-tested flow (Phase 1 acceptance)

register -> login -> me -> create plugin -> upload version (multipart) -> DEV_AUTO_APPROVE
marks it `approved` -> dashboard/uploads lists it -> download streams the exact bytes back and
increments both `plugin_versions.downloads_count` and `plugins.downloads_count` -> `audit_log`
has one row per mutating action. See the task's status report for pass/fail detail.
