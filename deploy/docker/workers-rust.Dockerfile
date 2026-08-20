# Multi-stage build for workers-rust. Build context must be the repo root, e.g.:
#   docker build -f deploy/docker/workers-rust.Dockerfile -t mcmarket-workers .

FROM rust:1-slim-bookworm AS build
WORKDIR /src
COPY workers-rust/ .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /src/target/release/workers-rust /app/workers-rust
# Binds 127.0.0.1 by default (see BIND_HOST) — inside a container that means
# only reachable from within the container's own network namespace, so
# api-go must run in the same container/pod or BIND_HOST must be widened to
# the compose network's internal address (see docker-compose.yml).
EXPOSE 8081
ENTRYPOINT ["/app/workers-rust"]
