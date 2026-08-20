mod auth;
mod heuristics;
mod scan;
mod thumbnail;

use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tracing_subscriber::EnvFilter;

pub struct AppState {
    pub internal_token: String,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let internal_token = std::env::var("INTERNAL_SHARED_SECRET").unwrap_or_default();
    if internal_token.is_empty() {
        tracing::warn!("INTERNAL_SHARED_SECRET is not set — all authenticated routes will reject every request");
    }

    let port = std::env::var("PORT").unwrap_or_else(|_| "8081".into());
    let bind_host = std::env::var("BIND_HOST").unwrap_or_else(|_| "127.0.0.1".into());

    let state = Arc::new(AppState { internal_token });

    let protected = Router::new()
        .route("/v1/scan-jar", post(scan::handle_scan_jar))
        .route("/v1/thumbnail", post(thumbnail::handle_thumbnail))
        .route_layer(middleware::from_fn_with_state(state.clone(), auth::require_internal_token));

    let app = Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .merge(protected)
        .with_state(state);

    let addr = format!("{bind_host}:{port}");
    tracing::info!("workers-rust listening on {addr}");
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("failed to bind listener");
    axum::serve(listener, app).await.expect("server error");
}
