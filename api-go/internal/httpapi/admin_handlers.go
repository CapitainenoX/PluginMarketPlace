package httpapi

import (
	"errors"
	"net/http"
	"strconv"

	"mcmarket/api/internal/db"

	"github.com/go-chi/chi/v5"
)

func (s *Server) handleAdminListPlugins(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	statuses := []string{"pending", "approved", "hidden", "banned"}
	if st := q.Get("status"); st != "" {
		statuses = []string{st}
	}

	plugins, err := s.Store.ListPlugins(db.ListPluginsParams{
		Statuses: statuses,
		Limit:    limit,
		Offset:   offset,
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

func (s *Server) handleAdminApprovePlugin(w http.ResponseWriter, r *http.Request) {
	s.adminSetPluginStatus(w, r, "approved", "admin.plugin_approve")
}

func (s *Server) handleAdminBanPlugin(w http.ResponseWriter, r *http.Request) {
	s.adminSetPluginStatus(w, r, "banned", "admin.plugin_ban")
}

func (s *Server) adminSetPluginStatus(w http.ResponseWriter, r *http.Request, status, action string) {
	plugin, err := s.Store.GetPluginBySlug(chi.URLParam(r, "slug"))
	if errors.Is(err, db.ErrNotFound) {
		writeError(w, http.StatusNotFound, "plugin not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load plugin")
		return
	}

	if err := s.Store.UpdatePlugin(plugin.ID, db.UpdatePluginParams{Status: &status}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update plugin status")
		return
	}

	uid := currentUser(r).ID
	_ = s.Store.WriteAuditLog(&uid, action, "plugin", itoa(plugin.ID), `{"slug":"`+plugin.Slug+`"}`, clientIP(r))

	writeJSON(w, http.StatusOK, map[string]string{"status": status})
}

func (s *Server) handleAdminAuditLog(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	offset, _ := strconv.Atoi(q.Get("offset"))

	entries, err := s.Store.ListAuditLog(limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list audit log")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"entries": entries})
}
