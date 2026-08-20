// Internal scan-jobs surface. This is the callback the Phase 4 Rust worker
// will hit after finishing a jar scan. It is NOT meant to be reachable from
// the public internet: bind the process to 127.0.0.1 (or firewall the
// route) in production, and always require the shared-secret header below.
//
// DEV ONLY / TODO Phase 4: right now nothing calls this in normal operation
// because DEV_AUTO_APPROVE short-circuits the scan step at upload time (see
// handleUploadVersion in version_handlers.go). This handler still exists so
// the route shape and auth are already in place for the real worker.
package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"mcmarket/api/internal/db"

	"github.com/go-chi/chi/v5"
)

func (s *Server) internalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.Cfg.InternalSharedSecret == "" {
			writeError(w, http.StatusForbidden, "internal endpoints disabled: INTERNAL_SHARED_SECRET not set")
			return
		}
		if r.Header.Get("X-Internal-Secret") != s.Cfg.InternalSharedSecret {
			writeError(w, http.StatusForbidden, "invalid internal shared secret")
			return
		}
		next.ServeHTTP(w, r)
	})
}

type completeScanJobRequest struct {
	Status     string `json:"status"` // "approved" or "rejected"
	ResultJSON string `json:"result_json"`
}

func (s *Server) handleInternalCompleteScanJob(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid scan job id")
		return
	}

	var req completeScanJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Status != "approved" && req.Status != "rejected" {
		writeError(w, http.StatusBadRequest, "status must be approved or rejected")
		return
	}

	job, err := s.Store.GetScanJobByID(id)
	if errors.Is(err, db.ErrNotFound) {
		writeError(w, http.StatusNotFound, "scan job not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load scan job")
		return
	}

	if err := s.Store.UpdateScanJobStatus(job.ID, "completed", req.ResultJSON); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update scan job")
		return
	}
	if err := s.Store.UpdateVersionStatus(job.VersionID, req.Status); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update version status")
		return
	}

	_ = s.Store.WriteAuditLog(nil, "scan_job.complete", "plugin_version", itoa(job.VersionID), `{"status":"`+req.Status+`"}`, clientIP(r))

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
