# workers-rust

`axum` HTTP service, binds `127.0.0.1` by default (override with `BIND_HOST`/`PORT`). Called
synchronously by `api-go` right after a jar upload; never talks to the DB directly.

Every route except `/healthz` requires the `X-Internal-Secret` header to match
`INTERNAL_SHARED_SECRET` (same env var name the Go API uses on its side of the link).

## Endpoints

- `POST /v1/scan-jar` — body `{ "job_id": <int>, "file_path": "<absolute path>" }`. Validates the
  file is a well-formed zip under the size cap, contains `plugin.yml`/`paper-plugin.yml`, has no
  path-traversal entry names, computes its SHA256, and runs a conservative static heuristic scan
  over `.class` entries (flags for review, never auto-rejects). Responds
  `{ job_id, sha256, valid, flagged, reasons: [...] }`; the Go API decides the final
  `plugin_versions.status` from this.
- `POST /v1/thumbnail` — multipart form with a `file` field (icon/screenshot image). Resizes to
  fit 512x512 and returns `image/png` bytes.
- `GET /healthz` — unauthenticated liveness check.

## Malware scanning seam

`src/heuristics.rs` defines a `ScanEngine` trait; `HeuristicEngine` (the current, string-matching
implementation) is the only implementor. Wiring in a real AV engine later (e.g. ClamAV over its
socket protocol) means adding a new `ScanEngine` impl and swapping it in `scan.rs` — no other
code changes.

## Build

```
cargo build            # or cargo check for a faster syntax/type pass
cargo build --release
```
