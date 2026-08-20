# Multi-stage build for api-go. Build context must be the repo root, e.g.:
#   docker build -f deploy/docker/api-go.Dockerfile -t mcmarket-api .

FROM golang:1.25-alpine AS build
WORKDIR /src
COPY api-go/go.mod api-go/go.sum ./
RUN go mod download
COPY api-go/ .
# modernc.org/sqlite is a pure-Go driver, so CGO_ENABLED=0 gives a fully
# static binary.
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=build /out/api /app/api
# DB_PATH/UPLOAD_DIR default to ./data/... — mount the mc-data volume at /app/data.
ENV DB_PATH=/app/data/marketplace.db
ENV UPLOAD_DIR=/app/data/uploads
EXPOSE 8080
ENTRYPOINT ["/app/api"]
