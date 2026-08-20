use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use std::sync::Arc;

use crate::AppState;

/// Every route behind this middleware requires the shared-secret header.
/// Same env var (`INTERNAL_SHARED_SECRET`) the Go API uses on its side of
/// the internal link, per the plan. Traffic is expected to stay on
/// 127.0.0.1 and never be tunneled, but the header check is still enforced
/// in case that assumption is ever violated (defense in depth).
pub async fn require_internal_token(
    State(state): State<Arc<AppState>>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    if state.internal_token.is_empty() {
        return Err(StatusCode::FORBIDDEN);
    }
    let provided = req
        .headers()
        .get("X-Internal-Secret")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if provided != state.internal_token {
        return Err(StatusCode::FORBIDDEN);
    }
    Ok(next.run(req).await)
}
