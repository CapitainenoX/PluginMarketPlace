use axum::{extract::Json, http::StatusCode};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;

use crate::heuristics::{HeuristicEngine, ScanEngine};

/// Sanity cap on jar size — matches the 100MB upload cap enforced on the Go
/// side (api-go/internal/config/config.go MaxUploadBytes), checked again
/// here since this service doesn't trust the caller.
const MAX_JAR_BYTES: u64 = 100 << 20;

#[derive(Deserialize)]
pub struct ScanJarRequest {
    pub job_id: i64,
    pub file_path: String,
}

#[derive(Serialize)]
pub struct ScanJarResponse {
    pub job_id: i64,
    pub sha256: String,
    pub valid: bool,
    pub flagged: bool,
    pub reasons: Vec<String>,
}

pub async fn handle_scan_jar(
    Json(req): Json<ScanJarRequest>,
) -> Result<Json<ScanJarResponse>, (StatusCode, String)> {
    let job_id = req.job_id;
    let path = req.file_path.clone();

    let result = tokio::task::spawn_blocking(move || scan_jar_blocking(&path))
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("scan task panicked: {e}")))?;

    match result {
        Ok((sha256, valid, flagged, reasons)) => Ok(Json(ScanJarResponse {
            job_id,
            sha256,
            valid,
            flagged,
            reasons,
        })),
        Err(e) => Err((StatusCode::BAD_REQUEST, e)),
    }
}

fn scan_jar_blocking(path: &str) -> Result<(String, bool, bool, Vec<String>), String> {
    let mut reasons = Vec::new();

    let metadata = std::fs::metadata(path).map_err(|e| format!("cannot stat file: {e}"))?;
    if metadata.len() > MAX_JAR_BYTES {
        return Ok((String::new(), false, false, vec!["file exceeds max allowed size".into()]));
    }
    if metadata.len() == 0 {
        return Ok((String::new(), false, false, vec!["file is empty".into()]));
    }

    // SHA256 over the raw file bytes, independent of ZIP parsing.
    let mut file = File::open(path).map_err(|e| format!("cannot open file: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 64 * 1024];
    loop {
        let n = file.read(&mut buf).map_err(|e| format!("read error: {e}"))?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    let sha256 = hex_encode(&hasher.finalize());

    // Structural validation: must be a well-formed zip with no path
    // traversal entries and a plugin descriptor at the root.
    let file = File::open(path).map_err(|e| format!("cannot reopen file: {e}"))?;
    let mut archive = match zip::ZipArchive::new(file) {
        Ok(a) => a,
        Err(e) => {
            return Ok((sha256, false, false, vec![format!("not a valid zip/jar: {e}")]));
        }
    };

    let mut has_plugin_descriptor = false;
    let engine = HeuristicEngine;
    let mut flagged_reasons = Vec::new();

    for i in 0..archive.len() {
        let mut entry = match archive.by_index(i) {
            Ok(e) => e,
            Err(e) => {
                reasons.push(format!("corrupt zip entry at index {i}: {e}"));
                continue;
            }
        };
        let name = entry.name().to_string();

        if is_traversal_entry(&name) {
            return Ok((
                sha256,
                false,
                false,
                vec![format!("path traversal entry rejected: {name}")],
            ));
        }

        if name == "plugin.yml" || name == "paper-plugin.yml" {
            has_plugin_descriptor = true;
        }

        if name.ends_with(".class") {
            let mut data = Vec::new();
            if entry.read_to_end(&mut data).is_ok() {
                for finding in engine.scan_entry(&name, &data) {
                    flagged_reasons.push(format!("{}: {}", finding.entry_name, finding.reason));
                }
            }
        }
    }

    if !has_plugin_descriptor {
        return Ok((
            sha256,
            false,
            false,
            vec!["missing plugin.yml or paper-plugin.yml".into()],
        ));
    }

    let flagged = !flagged_reasons.is_empty();
    reasons.extend(flagged_reasons);

    Ok((sha256, true, flagged, reasons))
}

/// Rejects any entry name that could escape the extraction directory:
/// `../` segments, absolute paths, or backslash-based traversal on
/// Windows-authored archives.
fn is_traversal_entry(name: &str) -> bool {
    if name.starts_with('/') || name.starts_with('\\') {
        return true;
    }
    if name.len() >= 2 && name.as_bytes()[1] == b':' {
        return true; // e.g. "C:\..."
    }
    name.split(['/', '\\']).any(|seg| seg == "..")
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
