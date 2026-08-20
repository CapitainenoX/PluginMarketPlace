# Deployment

Two paths: Docker Compose (easier onboarding) or systemd (recommended — Go/Rust are static
binaries, smaller RAM footprint). Pick one; both terminate TLS at Cloudflare, no inbound ports
on the host either way.

## 1. Build each service

- **api-go**: `cd api-go && CGO_ENABLED=0 go build -o mc-api ./cmd/api` (pure-Go sqlite driver,
  no cgo needed)
- **workers-rust**: `cd workers-rust && cargo build --release` → `target/release/workers-rust`
- **web-node**: `cd web-node && npm ci && npm run build` (add `output: "standalone"` to
  `next.config.ts` first if using the Docker path)

## 2a. Docker Compose path

```
cp deploy/.env.example deploy/.env   # fill in real secrets
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

Builds all three images (`deploy/docker/*.Dockerfile`), wires them on the internal `mc-internal`
network, and shares the `mc-data` named volume between `api-go` and `workers-rust` for uploaded
jars/images. Only `api-go` (8080) and `web-node` (3000) publish ports; `workers-rust` is
internal-only.

## 2b. systemd path (bare metal, primary path)

```
sudo useradd -r -s /usr/sbin/nologin mcmarket
sudo mkdir -p /opt/mcmarket/bin /opt/mcmarket/data /etc/mcmarket
sudo cp api-go/mc-api workers-rust/target/release/workers-rust /opt/mcmarket/bin/
# rename the rust binary to mc-workers to match the unit file, or edit ExecStart
sudo cp -r web-node /opt/mcmarket/web-node
sudo cp deploy/.env.example /etc/mcmarket/api.env      # trim to api-go vars, edit
sudo cp deploy/.env.example /etc/mcmarket/workers.env  # trim to workers-rust vars, edit
sudo cp deploy/.env.example /etc/mcmarket/web.env      # trim to web-node vars, edit
sudo chown -R mcmarket:mcmarket /opt/mcmarket
sudo cp deploy/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mc-api mc-workers mc-web
```

`INTERNAL_SHARED_SECRET` must be identical in `api.env` and `workers.env`. `mc-workers` binds
`127.0.0.1` by default — on the same host as `mc-api`, so the internal traffic never leaves
loopback and is never tunneled, per the plan.

## 3. Install cloudflared and point it at the tunnel

```
cloudflared tunnel login
cloudflared tunnel create mc-marketplace
cloudflared tunnel route dns mc-marketplace mc-marketplace.corelabs.network
cloudflared tunnel route dns mc-marketplace mc-api.corelabs.network
cp deploy/cloudflared/config.yml.template ~/.cloudflared/config.yml
# edit config.yml: fill in the real tunnel id (from `tunnel create` output)
# and the credentials-file path it prints
cloudflared tunnel run mc-marketplace
```

Or run it as a service: `cloudflared service install` after `config.yml` is filled in.

## 4. Verify

- `curl http://localhost:8080/v1/categories` → JSON (api-go up)
- `curl http://localhost:3000` → HTML (web-node up)
- `curl -H "X-Internal-Token: $INTERNAL_SHARED_SECRET" http://localhost:8081/healthz` → `ok`
  (workers-rust up; healthz itself is unauthenticated, this just confirms the port)
- Through the tunnel: `https://mc-marketplace.corelabs.network` and
  `https://mc-api.corelabs.network/v1/categories` both resolve once DNS propagates
- `journalctl -u mc-api -u mc-workers -u mc-web -f` (systemd) or
  `docker compose -f deploy/docker-compose.yml logs -f` (Compose) to confirm no crash loops
