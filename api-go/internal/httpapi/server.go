// Package httpapi wires the chi router, middleware, and all HTTP handlers.
package httpapi

import (
	"net/http"

	"mcmarket/api/internal/config"
	"mcmarket/api/internal/db"

	"github.com/go-chi/chi/v5"
	"golang.org/x/time/rate"
)

type Server struct {
	Store *db.Store
	Cfg   config.Config

	generalLimiter *ipLimiterStore
	authLimiter    *ipLimiterStore
}

func New(store *db.Store, cfg config.Config) *Server {
	return &Server{
		Store:          store,
		Cfg:            cfg,
		generalLimiter: newIPLimiterStore(rate.Limit(20), 40),  // ~20 req/s/IP, burst 40
		authLimiter:    newIPLimiterStore(rate.Limit(1), 10),   // ~1 req/s/IP, burst 10 for auth endpoints
	}
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(requestLogger, recoverer, cors(s.Cfg.CORSAllowedOrigin), rateLimit(s.generalLimiter), s.authenticate)

	r.Route("/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.With(rateLimit(s.authLimiter)).Post("/register", s.handleRegister)
			r.With(rateLimit(s.authLimiter)).Post("/login", s.handleLogin)
			r.Post("/logout", s.handleLogout)
			r.Get("/me", s.requireAuth(s.handleMe))
		})

		r.Get("/categories", s.handleListCategories)
		r.Get("/search", s.handleListPlugins)

		r.Route("/plugins", func(r chi.Router) {
			r.Get("/", s.handleListPlugins)
			r.Post("/", s.requireAuth(s.handleCreatePlugin))
			r.Get("/{slug}", s.handleGetPlugin)
			r.Patch("/{slug}", s.requireAuth(s.handlePatchPlugin))
			r.Delete("/{slug}", s.requireAuth(s.handleDeletePlugin))
			r.Get("/{slug}/versions", s.handleListVersions)
			r.With(uploadSizeLimit(s.Cfg.MaxUploadBytes)).Post("/{slug}/versions", s.requireAuth(s.handleUploadVersion))
			r.Get("/{slug}/images", s.handleListImages)
			r.With(uploadSizeLimit(10<<20)).Post("/{slug}/images", s.requireAuth(s.handleUploadImage))
		})

		r.Get("/images/{id}/file", s.handleImageFile)

		r.Route("/versions/{id}", func(r chi.Router) {
			r.Get("/", s.handleGetVersion)
			r.Get("/download", s.handleDownloadVersion)
			r.Get("/status", s.handleVersionStatus)
		})

		r.Route("/dashboard", func(r chi.Router) {
			r.Get("/uploads", s.requireAuth(s.handleDashboardUploads))
			r.Get("/api-keys", s.requireAuth(s.requireFullScope(s.handleListAPIKeys)))
			r.Post("/api-keys", s.requireAuth(s.requireFullScope(s.handleCreateAPIKey)))
			r.Delete("/api-keys/{id}", s.requireAuth(s.requireFullScope(s.handleDeleteAPIKey)))
		})

		r.Route("/mc", func(r chi.Router) {
			r.Get("/check-updates", s.handleCheckUpdates)
			r.Post("/report-fingerprint", s.handleReportFingerprint)
		})

		r.Route("/admin", func(r chi.Router) {
			r.Get("/plugins", s.requireAuth(s.requireAdmin(s.handleAdminListPlugins)))
			r.Post("/plugins/{slug}/approve", s.requireAuth(s.requireAdmin(s.handleAdminApprovePlugin)))
			r.Post("/plugins/{slug}/ban", s.requireAuth(s.requireAdmin(s.handleAdminBanPlugin)))
			r.Get("/audit-log", s.requireAuth(s.requireAdmin(s.handleAdminAuditLog)))
		})
	})

	// Internal-only: intended to be bound to 127.0.0.1 and never tunneled.
	// Guarded by a shared-secret header (see internalAuth). This is the
	// callback surface the Phase 4 Rust worker will use to report scan
	// results; in Phase 1, DEV_AUTO_APPROVE bypasses it entirely (see
	// scanjobs.go).
	r.Route("/internal/v1/scan-jobs", func(r chi.Router) {
		r.Use(s.internalAuth)
		r.Post("/{id}/complete", s.handleInternalCompleteScanJob)
	})

	return r
}

func uploadSizeLimit(max int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, max)
			next.ServeHTTP(w, r)
		})
	}
}
