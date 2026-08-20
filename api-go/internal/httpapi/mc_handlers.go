package httpapi

import (
	"errors"
	"net/http"

	"mcmarket/api/internal/db"
)

// handleCheckUpdates is polled by the (future) Paper plugin's UpdateChecker.
// GET /v1/mc/check-updates?plugin=<slug>&version=<installed-version>
func (s *Server) handleCheckUpdates(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Query().Get("plugin")
	installed := r.URL.Query().Get("version")
	if slug == "" {
		writeError(w, http.StatusBadRequest, "plugin query param is required")
		return
	}

	plugin, err := s.Store.GetPluginBySlug(slug)
	if errors.Is(err, db.ErrNotFound) {
		writeError(w, http.StatusNotFound, "plugin not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load plugin")
		return
	}

	latest, err := s.Store.LatestApprovedVersion(plugin.ID)
	if errors.Is(err, db.ErrNotFound) {
		writeJSON(w, http.StatusOK, map[string]any{"update_available": false})
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load latest version")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"update_available": installed != latest.Version,
		"latest_version":   versionResponse(latest),
	})
}

type reportFingerprintRequest struct {
	PluginSlug  string `json:"plugin_slug"`
	VersionID   int64  `json:"version_id"`
	Fingerprint string `json:"fingerprint"`
}

// handleReportFingerprint records that a distinct server install has a given
// version installed. Used for future install/update telemetry; nothing else
// reads this table in Phase 1.
func (s *Server) handleReportFingerprint(w http.ResponseWriter, r *http.Request) {
	var req reportFingerprintRequest
	if err := decodeJSON(r, &req); err != nil || req.PluginSlug == "" || req.Fingerprint == "" || req.VersionID == 0 {
		writeError(w, http.StatusBadRequest, "plugin_slug, version_id, and fingerprint are required")
		return
	}

	plugin, err := s.Store.GetPluginBySlug(req.PluginSlug)
	if errors.Is(err, db.ErrNotFound) {
		writeError(w, http.StatusNotFound, "plugin not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load plugin")
		return
	}

	if err := s.Store.UpsertInstallFingerprint(plugin.ID, req.VersionID, req.Fingerprint); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to record fingerprint")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "recorded"})
}
