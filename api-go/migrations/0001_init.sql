-- 0001_init.sql
-- Full schema for the marketplace. Applied by the embedded migration runner
-- (see internal/db/migrate.go) at process startup, in a single transaction.

CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE, -- sha256 hex of the opaque session token; token itself never stored
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    expires_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

CREATE TABLE api_keys (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    key_prefix TEXT NOT NULL, -- short, non-secret, shown in dashboard listings for identification
    key_hash   TEXT NOT NULL UNIQUE, -- sha256 hex of the full token; token itself never stored
    scope      TEXT NOT NULL CHECK (scope IN ('full', 'upload_only', 'mcp')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    revoked_at TEXT
);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

CREATE TABLE categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE plugins (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    summary         TEXT NOT NULL DEFAULT '',
    description     TEXT NOT NULL DEFAULT '',
    owner_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden', 'banned')),
    downloads_count INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_plugins_owner_id ON plugins(owner_id);
CREATE INDEX idx_plugins_category_id ON plugins(category_id);
CREATE INDEX idx_plugins_status ON plugins(status);

-- FTS5 external-content table, kept in sync with `plugins` via triggers below.
CREATE VIRTUAL TABLE plugins_fts USING fts5(
    name, summary, description,
    content='plugins', content_rowid='id'
);

CREATE TRIGGER plugins_fts_ai AFTER INSERT ON plugins BEGIN
    INSERT INTO plugins_fts(rowid, name, summary, description)
    VALUES (new.id, new.name, new.summary, new.description);
END;

CREATE TRIGGER plugins_fts_ad AFTER DELETE ON plugins BEGIN
    INSERT INTO plugins_fts(plugins_fts, rowid, name, summary, description)
    VALUES ('delete', old.id, old.name, old.summary, old.description);
END;

CREATE TRIGGER plugins_fts_au AFTER UPDATE ON plugins BEGIN
    INSERT INTO plugins_fts(plugins_fts, rowid, name, summary, description)
    VALUES ('delete', old.id, old.name, old.summary, old.description);
    INSERT INTO plugins_fts(rowid, name, summary, description)
    VALUES (new.id, new.name, new.summary, new.description);
END;

CREATE TABLE plugin_versions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id      INTEGER NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    version        TEXT NOT NULL,
    changelog      TEXT NOT NULL DEFAULT '',
    mc_version_min TEXT NOT NULL,
    mc_version_max TEXT NOT NULL,
    file_path      TEXT NOT NULL,
    file_sha256    TEXT NOT NULL,
    file_size      INTEGER NOT NULL,
    downloads_count INTEGER NOT NULL DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'pending_scan' CHECK (status IN ('pending_scan', 'approved', 'rejected')),
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (plugin_id, version)
);
CREATE INDEX idx_plugin_versions_plugin_id ON plugin_versions(plugin_id);
CREATE INDEX idx_plugin_versions_status ON plugin_versions(status);

CREATE TABLE plugin_tags (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id INTEGER NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    tag       TEXT NOT NULL,
    UNIQUE (plugin_id, tag)
);
CREATE INDEX idx_plugin_tags_plugin_id ON plugin_tags(plugin_id);

CREATE TABLE plugin_images (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id  INTEGER NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    kind       TEXT NOT NULL CHECK (kind IN ('icon', 'screenshot')),
    file_path  TEXT NOT NULL,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_plugin_images_plugin_id ON plugin_images(plugin_id);

-- One row per scan attempt of a version. In Phase 1 this is populated by the
-- DEV_AUTO_APPROVE bypass (see internal/httpapi/scanjobs.go); Phase 4's Rust
-- worker will populate it for real.
CREATE TABLE scan_jobs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    version_id  INTEGER NOT NULL REFERENCES plugin_versions(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    result_json TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_scan_jobs_version_id ON scan_jobs(version_id);

-- Reported by the (future) Paper plugin's UpdateChecker to identify distinct
-- installs of a version, for install/update telemetry. Not read by anything
-- in Phase 1 beyond the write path.
CREATE TABLE install_fingerprints (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id    INTEGER NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
    version_id   INTEGER NOT NULL REFERENCES plugin_versions(id) ON DELETE CASCADE,
    fingerprint  TEXT NOT NULL, -- opaque hash supplied by the reporting server, not PII
    reported_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (plugin_id, fingerprint)
);
CREATE INDEX idx_install_fingerprints_plugin_id ON install_fingerprints(plugin_id);

CREATE TABLE audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action      TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id   TEXT,
    meta_json   TEXT NOT NULL DEFAULT '{}',
    ip          TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
