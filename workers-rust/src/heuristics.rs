//! Static heuristic scanning of jar contents.
//!
//! This is a conservative, string-matching pass over class file bytes — it
//! flags for manual admin review, it never auto-rejects on its own. The
//! `ScanEngine` trait is the seam for wiring in a real AV engine (e.g. a
//! ClamAV daemon over its socket protocol) later without touching callers:
//! swap `HeuristicEngine` for a `ClamAvEngine` that implements the same
//! trait and nothing else in the pipeline changes.

/// Markers that commonly appear in plugins doing something an admin should
/// eyeball before approving: process spawning, reflection abuse, and a
/// couple of common obfuscator signatures. Intentionally coarse — false
/// positives are cheap (they just mean a human looks), false negatives
/// are not something a substring scan can meaningfully avoid.
const SUSPICIOUS_MARKERS: &[&str] = &[
    "java/lang/Runtime",
    "Runtime.exec",
    "getRuntime",
    "ProcessBuilder",
    "java/lang/ProcessBuilder",
    "Ljava/lang/Runtime;",
    // obfuscator / packer signatures
    "proguard",
    "allatori",
    "zelix",
    "stringer",
];

pub struct ScanFinding {
    pub entry_name: String,
    pub reason: String,
}

pub trait ScanEngine {
    fn scan_entry(&self, entry_name: &str, data: &[u8]) -> Vec<ScanFinding>;
}

pub struct HeuristicEngine;

impl ScanEngine for HeuristicEngine {
    fn scan_entry(&self, entry_name: &str, data: &[u8]) -> Vec<ScanFinding> {
        let mut findings = Vec::new();
        for marker in SUSPICIOUS_MARKERS {
            if contains_bytes(data, marker.as_bytes()) {
                findings.push(ScanFinding {
                    entry_name: entry_name.to_string(),
                    reason: format!("contains marker '{marker}'"),
                });
            }
        }
        findings
    }
}

fn contains_bytes(haystack: &[u8], needle: &[u8]) -> bool {
    if needle.is_empty() || haystack.len() < needle.len() {
        return false;
    }
    haystack.windows(needle.len()).any(|w| w == needle)
}
