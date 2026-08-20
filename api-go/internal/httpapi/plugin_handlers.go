package httpapi

import (
	"errors"
	"net/http"
	"strconv"

	"mcmarket/api/internal/db"

	"github.com/go-chi/chi/v5"
)

func pluginResponse(p *db.Plugin, tags []string) map[string]any {
	var categoryID *int64
	if p.CategoryID.Valid {
		categoryID = &p.CategoryID.Int64
	}
	return map[string]any{
		"id":              p.ID,
		"slug":            p.Slug,
		"name":            p.Name,
		"summary":         p.Summary,
		"description":     p.Description,
		"owner_id":        p.OwnerID,
		"category_id":     categoryID,
		"status":          p.Status,
		"downloads_count": p.DownloadsCount,
		"tags":            tags,
		"created_at":      p.CreatedAt,
		"updated_at":      p.UpdatedAt,
	}
}

// handleListPlugins backs both GET /v1/plugins and GET /v1/search. Anonymous
// and non-admin callers only ever see approved plugins.
func (s *Server) handleListPlugins(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	statuses := []string{"approved"}
	if u := currentUser(r); u != nil && u.Role == "admin" && q.Get("status") != "" {
		statuses = []string{q.Get("status")}
	}

	plugins, err := s.Store.ListPlugins(db.ListPluginsParams{
		Query:        q.Get("q"),
		CategorySlug: q.Get("category"),
		Statuses:     statuses,
		Limit:        limit,
		Offset:       offset,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list plugins")
		return
	}

	out := make([]map[string]any, 0, len(plugins))
	for i := range plugins {
		tags, _ := s.Store.ListPluginTags(plugins[i].ID)
		out = append(out, pluginResponse(&plugins[i], tags))
	}
	writeJSON(w, http.StatusOK, map[string]any{"plugins": out})
}

type createPluginRequest struct {
	Name        string   `json:"name"`
	Summary     string   `json:"summary"`
	Description string   `json:"description"`
	CategoryID  *int64   `json:"category_id"`
	Tags        []string `json:"tags"`
}

func (s *Server) handleCreatePlugin(w http.ResponseWriter, r *http.Request) {
	var req createPluginRequest
	if err := decodeJSON(r, &req); err != nil || req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	user := currentUser(r)
	plugin, err := s.Store.CreatePlugin(db.CreatePluginParams{
		Slug:        slugify(req.Name),
		Name:        req.Name,
		Summary:     req.Summary,
		Description: req.Description,
		OwnerID:     user.ID,
		CategoryID:  req.CategoryID,
	})
	if err != nil {
		writeError(w, http.StatusConflict, "a plugin with a similar name already exists")
		return
	}
	for _, t := range req.Tags {
		_ = s.Store.AddPluginTag(plugin.ID, t)
	}

	uid := user.ID
	_ = s.Store.WriteAuditLog(&uid, "plugin.create", "plugin", itoa(plugin.ID), `{"slug":"`+plugin.Slug+`"}`, clientIP(r))

	tags, _ := s.Store.ListPluginTags(plugin.ID)
	writeJSON(w, http.StatusCreated, pluginResponse(plugin, tags))
}

func (s *Server) handleGetPlugin(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	plugin, err := s.Store.GetPluginBySlug(slug)
	if errors.Is(err, db.ErrNotFound) {
		writeError(w, http.StatusNotFound, "plugin not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load plugin")
		return
	}

	if plugin.Status != "approved" && !canManagePlugin(r, plugin) {
		writeError(w, http.StatusNotFound, "plugin not found")
		return
	}

	tags, _ := s.Store.ListPluginTags(plugin.ID)
	writeJSON(w, http.StatusOK, pluginResponse(plugin, tags))
}

type patchPluginRequest struct {
	Name        *string `json:"name"`
	Summary     *string `json:"summary"`
	Description *string `json:"description"`
	CategoryID  *int64  `json:"category_id"`
}

func (s *Server) handlePatchPlugin(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	plugin, err := s.Store.GetPluginBySlug(slug)
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

	var req patchPluginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := s.Store.UpdatePlugin(plugin.ID, db.UpdatePluginParams{
		Name:        req.Name,
		Summary:     req.Summary,
		Description: req.Description,
		CategoryID:  req.CategoryID,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update plugin")
		return
	}

	uid := currentUser(r).ID
	_ = s.Store.WriteAuditLog(&uid, "plugin.update", "plugin", itoa(plugin.ID), "{}", clientIP(r))

	updated, _ := s.Store.GetPluginByID(plugin.ID)
	tags, _ := s.Store.ListPluginTags(plugin.ID)
	writeJSON(w, http.StatusOK, pluginResponse(updated, tags))
}

func (s *Server) handleDeletePlugin(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	plugin, err := s.Store.GetPluginBySlug(slug)
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

	if err := s.Store.DeletePlugin(plugin.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete plugin")
		return
	}

	uid := currentUser(r).ID
	_ = s.Store.WriteAuditLog(&uid, "plugin.delete", "plugin", itoa(plugin.ID), `{"slug":"`+plugin.Slug+`"}`, clientIP(r))

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) handleListCategories(w http.ResponseWriter, r *http.Request) {
	cats, err := s.Store.ListCategories()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list categories")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"categories": cats})
}

// canManagePlugin reports whether the request's authenticated user owns the
// plugin or is an admin.
func canManagePlugin(r *http.Request, p *db.Plugin) bool {
	u := currentUser(r)
	if u == nil {
		return false
	}
	return u.ID == p.OwnerID || u.Role == "admin"
}
