# deploy

Deployment artifacts for all three backend services plus the frontend. See
`../docs/DEPLOYMENT.md` for the full walkthrough.

- `docker/*.Dockerfile` — per-service multi-stage builds (build context is the repo root)
- `docker-compose.yml` — all services + shared `mc-data` volume + internal network
- `systemd/*.service` — bare-metal alternative (primary path per the plan: static Go/Rust
  binaries, smaller footprint); comments in each unit list the build steps it expects first
- `cloudflared/config.yml.template` — ingress mapping for both public domains
- `.env.example` — every env var referenced across api-go/workers-rust/web-node/mcp-server
