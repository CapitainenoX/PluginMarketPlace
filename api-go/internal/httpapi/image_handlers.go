package httpapi

import (
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"mcmarket/api/internal/db"

	"github.com/go-chi/chi/v5"
)

func imageResponse(img *db.PluginImage) map[string]any {
	return map[string]any{
		"id":         img.ID,
		"plugin_id":  img.PluginID,
		"kind":       img.Kind,
		"url":        "/v1/images/" + strconv.FormatInt(img.ID, 10) + "/file",
		"position":   img.Position,
		"created_at": img.CreatedAt,
	}
}

func (s *Server) handleListImages(w http.ResponseWriter, r *http.Request) {
	plugin, err := s.Store.GetPluginBySlug(chi.URLParam(r, "slug"))
	if errors.Is(err, db.ErrNotFound) {
		writeError(w, http.StatusNotFound, "plugin not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load plugin")
		return
	}
	images, err := s.Store.ListPluginImages(plugin.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list images")
		return
	}
	out := make([]map[string]any, 0, len(images))
	for i := range images {
		out = append(out, imageResponse(&images[i]))
	}
	writeJSON(w, http.StatusOK, map[string]any{"images": out})
}

// icon: at most one, always position 0, replaces any existing icon.
// screenshot: appended, positioned after existing screenshots.
func (s *Server) handleUploadImage(w http.ResponseWriter, r *http.Request) {
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

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid multipart form or file too large (max 10MB)")
		return
	}
	kind := r.FormValue("kind")
	if kind != "icon" && kind != "screenshot" {
		kind = "screenshot"
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	ext := filepath.Ext(header.Filename)
	switch ext {
	case ".png", ".jpg", ".jpeg", ".webp", ".gif":
	default:
		writeError(w, http.StatusBadRequest, "unsupported image type (png, jpg, webp, gif only)")
		return
	}

	existing, err := s.Store.ListPluginImages(plugin.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load existing images")
		return
	}
	position := int64(len(existing))
	if kind == "icon" {
		position = 0
	}

	imgDir := filepath.Join(s.Cfg.UploadDir, plugin.Slug, "images")
	if err := os.MkdirAll(imgDir, 0o755); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to prepare upload directory")
		return
	}
	destPath := filepath.Join(imgDir, kind+"-"+strconv.FormatInt(position, 10)+ext)
	dest, err := os.Create(destPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to store upload")
		return
	}
	_, err = io.Copy(dest, file)
	dest.Close()
	if err != nil {
		os.Remove(destPath)
		writeError(w, http.StatusInternalServerError, "failed to store upload")
		return
	}

	img, err := s.Store.AddPluginImage(plugin.ID, kind, destPath, position)
	if err != nil {
		os.Remove(destPath)
		writeError(w, http.StatusInternalServerError, "failed to record image")
		return
	}

	uid := currentUser(r).ID
	_ = s.Store.WriteAuditLog(&uid, "plugin.image_upload", "plugin", itoa(plugin.ID), `{"kind":"`+kind+`"}`, clientIP(r))

	writeJSON(w, http.StatusCreated, imageResponse(img))
}

func (s *Server) handleImageFile(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusNotFound, "image not found")
		return
	}
	img, err := s.Store.GetPluginImage(id)
	if errors.Is(err, db.ErrNotFound) {
		writeError(w, http.StatusNotFound, "image not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load image")
		return
	}
	f, err := os.Open(img.FilePath)
	if err != nil {
		writeError(w, http.StatusNotFound, "file missing on disk")
		return
	}
	defer f.Close()
	http.ServeContent(w, r, filepath.Base(img.FilePath), fileModTime(img.FilePath), f)
}
