package httpapi

import (
	"net/http"
	"strconv"

	"mcmarket/api/internal/auth"
	"mcmarket/api/internal/db"

	"github.com/go-chi/chi/v5"
)

// handleDashboardUploads lists all plugins owned by the current user, across
// every status (including pending/hidden), with their versions.
func (s *Server) handleDashboardUploads(w http.ResponseWriter, r *http.Request) {
	user := currentUser(r)
	plugins, err := s.Store.ListPlugins(db.ListPluginsParams{
		Statuses: []string{"pending", "approved", "hidden", "banned"},
		Limit:    100,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list uploads")
		return
	}

	out := make([]map[string]any, 0)
	for i := range plugins {
		if plugins[i].OwnerID != user.ID {
			continue
		}
		versions, _ := s.Store.ListVersionsByPlugin(plugins[i].ID)
		versionsOut := make([]map[string]any, 0, len(versions))
		for j := range versions {
			versionsOut = append(versionsOut, versionResponse(&versions[j]))
		}
		tags, _ := s.Store.ListPluginTags(plugins[i].ID)
		entry := pluginResponse(&plugins[i], tags)
		entry["versions"] = versionsOut
		out = append(out, entry)
	}
	writeJSON(w, http.StatusOK, map[string]any{"plugins": out})
}

func apiKeyResponse(k *db.APIKey) map[string]any {
	revoked := k.RevokedAt.Valid
	return map[string]any{
		"id":         k.ID,
		"name":       k.Name,
		"key_prefix": k.KeyPrefix,
		"scope":      k.Scope,
		"created_at": k.CreatedAt,
		"revoked":    revoked,
	}
}

func (s *Server) handleListAPIKeys(w http.ResponseWriter, r *http.Request) {
	keys, err := s.Store.ListAPIKeysByUser(currentUser(r).ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list api keys")
		return
	}
	out := make([]map[string]any, 0, len(keys))
	for i := range keys {
		out = append(out, apiKeyResponse(&keys[i]))
	}
	writeJSON(w, http.StatusOK, map[string]any{"api_keys": out})
}

type createAPIKeyRequest struct {
	Name  string `json:"name"`
	Scope string `json:"scope"`
}

func (s *Server) handleCreateAPIKey(w http.ResponseWriter, r *http.Request) {
	var req createAPIKeyRequest
	if err := decodeJSON(r, &req); err != nil || req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.Scope != "full" && req.Scope != "upload_only" && req.Scope != "mcp" {
		writeError(w, http.StatusBadRequest, "scope must be one of: full, upload_only, mcp")
		return
	}

	user := currentUser(r)
	fullToken, prefix, hash, err := auth.GenerateAPIKey(req.Scope)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate api key")
		return
	}

	key, err := s.Store.CreateAPIKey(user.ID, req.Name, prefix, hash, req.Scope)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create api key")
		return
	}

	uid := user.ID
	_ = s.Store.WriteAuditLog(&uid, "api_key.create", "api_key", itoa(key.ID), `{"scope":"`+req.Scope+`"}`, clientIP(r))

	resp := apiKeyResponse(key)
	resp["token"] = fullToken // shown exactly once
	writeJSON(w, http.StatusCreated, resp)
}

func (s *Server) handleDeleteAPIKey(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	user := currentUser(r)
	if err := s.Store.RevokeAPIKey(id, user.ID); err != nil {
		writeError(w, http.StatusNotFound, "api key not found")
		return
	}

	uid := user.ID
	_ = s.Store.WriteAuditLog(&uid, "api_key.revoke", "api_key", itoa(id), "{}", clientIP(r))

	writeJSON(w, http.StatusOK, map[string]string{"status": "revoked"})
}
