package httpapi

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"mcmarket/api/internal/db"

	"github.com/go-chi/chi/v5"
)

func versionResponse(v *db.PluginVersion) map[string]any {
	return map[string]any{
		"id":              v.ID,
		"plugin_id":       v.PluginID,
		"version":         v.Version,
		"changelog":       v.Changelog,
		"mc_version_min":  v.MCVersionMin,
		"mc_version_max":  v.MCVersionMax,
		"loaders":         strings.Split(v.Loaders, ","),
		"file_sha256":     v.FileSHA256,
		"file_size":       v.FileSize,
		"downloads_count": v.DownloadsCount,
		"status":          v.Status,
		"created_at":      v.CreatedAt,
	}
}

func (s *Server) handleListVersions(w http.ResponseWriter, r *http.Request) {
	plugin, err := s.Store.GetPluginBySlug(chi.URLParam(r, "slug"))
	if errors.Is(err, db.ErrNotFound) {
		writeError(w, http.StatusNotFound, "plugin not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load plugin")
		return
	}

	versions, err := s.Store.ListVersionsByPlugin(plugin.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list versions")
		return
	}

	showAll := canManagePlugin(r, plugin)
	out := make([]map[string]any, 0, len(versions))
	for i := range versions {
		if versions[i].Status != "approved" && !showAll {
			continue
		}
		out = append(out, versionResponse(&versions[i]))
	}
	writeJSON(w, http.StatusOK, map[string]any{"versions": out})
}

func (s *Server) handleUploadVersion(w http.ResponseWriter, r *http.Request) {
	plugin, err := s.Store.GetPluginBySlug(chi.URLParam(r, "slug"))
	if errors.Is(err, db.ErrNotFound) {
		writeError(w, http.StatusNotFound, "plugin not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load plugin")
		return
	}
	if !canManagePlugin(r, plugin) {
		writeError(w, http.StatusForbidden, "not the plugin owner")
		return
	}

	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid multipart form or file too large (max 100MB)")
		return
	}

	version := r.FormValue("version")
	if version == "" {
		writeError(w, http.StatusBadRequest, "version is required")
		return
	}
	changelog := r.FormValue("changelog")
	mcMin := r.FormValue("mc_version_min")
	mcMax := r.FormValue("mc_version_max")
	loaders := r.FormValue("loaders")
	if loaders == "" {
		loaders = "paper"
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	pluginDir := filepath.Join(s.Cfg.UploadDir, plugin.Slug)
	if err := os.MkdirAll(pluginDir, 0o755); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to prepare upload directory")
		return
	}

	// Filename is derived only from the plugin slug + submitted version
	// string (not the client-supplied header.Filename), so there's no
	// path-traversal surface from user input.
	safeName := slugify(version) + filepath.Ext(header.Filename)
	if filepath.Ext(safeName) == "" {
		safeName += ".jar"
	}
	destPath := filepath.Join(pluginDir, safeName)

	dest, err := os.Create(destPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to store upload")
		return
	}
	hasher := sha256.New()
	size, err := io.Copy(dest, io.TeeReader(file, hasher))
	dest.Close()
	if err != nil {
		os.Remove(destPath)
		writeError(w, http.StatusInternalServerError, "failed to store upload")
		return
	}

	pv, err := s.Store.CreateVersion(db.CreateVersionParams{
		PluginID:     plugin.ID,
		Version:      version,
		Changelog:    changelog,
		MCVersionMin: mcMin,
		MCVersionMax: mcMax,
		Loaders:      loaders,
		FilePath:     destPath,
		FileSHA256:   hex.EncodeToString(hasher.Sum(nil)),
		FileSize:     size,
	})
	if err != nil {
		os.Remove(destPath)
		writeError(w, http.StatusConflict, "this version already exists for this plugin")
		return
	}

	job, err := s.Store.CreateScanJob(pv.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to enqueue scan job")
		return
	}

	uid := currentUser(r).ID
	_ = s.Store.WriteAuditLog(&uid, "version.create", "plugin_version", itoa(pv.ID), `{"plugin_slug":"`+plugin.Slug+`","version":"`+version+`"}`, clientIP(r))

	// DEV ONLY: skip the scan pipeline entirely and approve immediately.
	// Must be false in production (see WorkerInternalURL path below).
	if s.Cfg.DevAutoApprove {
		_ = s.Store.UpdateScanJobStatus(job.ID, "completed", `{"dev_auto_approve":true}`)
		_ = s.Store.UpdateVersionStatus(pv.ID, "approved")
		_ = s.Store.WriteAuditLog(&uid, "version.dev_auto_approve", "plugin_version", itoa(pv.ID), "{}", clientIP(r))
		pv.Status = "approved"
	} else if s.Cfg.WorkerInternalURL != "" {
		status, resultJSON := s.scanJarSync(job.VersionID, destPath)
		_ = s.Store.UpdateScanJobStatus(job.ID, "completed", resultJSON)
		_ = s.Store.UpdateVersionStatus(pv.ID, status)
		_ = s.Store.WriteAuditLog(&uid, "scan_job.complete", "plugin_version", itoa(pv.ID), `{"status":"`+status+`"}`, clientIP(r))
		pv.Status = status
	}
	// else: WORKER_INTERNAL_URL unset and DEV_AUTO_APPROVE false — version
	// stays pending_scan until an admin/operator configures scanning.

	writeJSON(w, http.StatusCreated, versionResponse(pv))
}

func (s *Server) handleGetVersion(w http.ResponseWriter, r *http.Request) {
	pv, plugin, err := s.loadVersion(r)
	if err != nil {
		writeError(w, http.StatusNotFound, "version not found")
		return
	}
	if pv.Status != "approved" && !canManagePlugin(r, plugin) {
		writeError(w, http.StatusNotFound, "version not found")
		return
	}
	writeJSON(w, http.StatusOK, versionResponse(pv))
}

func (s *Server) handleVersionStatus(w http.ResponseWriter, r *http.Request) {
	pv, plugin, err := s.loadVersion(r)
	if err != nil {
		writeError(w, http.StatusNotFound, "version not found")
		return
	}
	if !canManagePlugin(r, plugin) {
		writeError(w, http.StatusForbidden, "not the plugin owner")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": pv.Status})
}

func (s *Server) handleDownloadVersion(w http.ResponseWriter, r *http.Request) {
	pv, plugin, err := s.loadVersion(r)
	if err != nil {
		writeError(w, http.StatusNotFound, "version not found")
		return
	}
	if pv.Status != "approved" && !canManagePlugin(r, plugin) {
		writeError(w, http.StatusNotFound, "version not found")
		return
	}

	f, err := os.Open(pv.FilePath)
	if err != nil {
		writeError(w, http.StatusNotFound, "file missing on disk")
		return
	}
	defer f.Close()

	_ = s.Store.IncrementVersionDownloads(pv.ID)
	_ = s.Store.IncrementPluginDownloads(plugin.ID)

	w.Header().Set("Content-Disposition", `attachment; filename="`+plugin.Slug+"-"+pv.Version+`.jar"`)
	w.Header().Set("Content-Type", "application/java-archive")
	http.ServeContent(w, r, filepath.Base(pv.FilePath), fileModTime(pv.FilePath), f)
}

type scanJarRequest struct {
	JobID    int64  `json:"job_id"`
	FilePath string `json:"file_path"`
}

type scanJarResponse struct {
	SHA256  string   `json:"sha256"`
	Valid   bool     `json:"valid"`
	Flagged bool     `json:"flagged"`
	Reasons []string `json:"reasons"`
}

// scanJarSync calls the Rust worker synchronously and returns the resulting
// version status ("approved" or "rejected") plus a JSON blob recorded on the
// scan job row. Any failure to reach the worker rejects the version rather
// than silently publishing an unscanned jar.
func (s *Server) scanJarSync(jobID int64, filePath string) (string, string) {
	reqBody, _ := json.Marshal(scanJarRequest{JobID: jobID, FilePath: filePath})
	req, err := http.NewRequest(http.MethodPost, s.Cfg.WorkerInternalURL+"/v1/scan-jar", bytes.NewReader(reqBody))
	if err != nil {
		return "rejected", `{"error":"failed to build scan request"}`
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Secret", s.Cfg.InternalSharedSecret)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "rejected", `{"error":"scan worker unreachable"}`
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "rejected", `{"error":"scan worker returned non-200"}`
	}

	var result scanJarResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "rejected", `{"error":"invalid scan worker response"}`
	}

	resultJSON, _ := json.Marshal(result)
	if !result.Valid || result.Flagged {
		return "rejected", string(resultJSON)
	}
	return "approved", string(resultJSON)
}

func (s *Server) loadVersion(r *http.Request) (*db.PluginVersion, *db.Plugin, error) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return nil, nil, db.ErrNotFound
	}
	pv, err := s.Store.GetVersionByID(id)
	if err != nil {
		return nil, nil, err
	}
	plugin, err := s.Store.GetPluginByID(pv.PluginID)
	if err != nil {
		return nil, nil, err
	}
	return pv, plugin, nil
}
