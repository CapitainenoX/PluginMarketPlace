package httpapi

import (
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"mcmarket/api/internal/auth"

	"golang.org/x/time/rate"
)

// --- request logging ---

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: 200}
		next.ServeHTTP(rec, r)
		log.Printf("%s %s %d %s", r.Method, r.URL.Path, rec.status, time.Since(start))
	})
}

// --- panic recovery ---

func recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("panic: %v", rec)
				writeError(w, http.StatusInternalServerError, "internal server error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// --- CORS ---

func cors(allowedOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// --- rate limiting: per-IP token bucket ---

type ipLimiterStore struct {
	mu       sync.Mutex
	limiters map[string]*rate.Limiter
	r        rate.Limit
	burst    int
}

func newIPLimiterStore(r rate.Limit, burst int) *ipLimiterStore {
	return &ipLimiterStore{limiters: make(map[string]*rate.Limiter), r: r, burst: burst}
}

func (s *ipLimiterStore) allow(ip string) bool {
	s.mu.Lock()
	l, ok := s.limiters[ip]
	if !ok {
		l = rate.NewLimiter(s.r, s.burst)
		s.limiters[ip] = l
	}
	s.mu.Unlock()
	return l.Allow()
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func rateLimit(store *ipLimiterStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !store.allow(clientIP(r)) {
				writeError(w, http.StatusTooManyRequests, "rate limit exceeded")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// --- auth: session cookie or bearer API key ---

const sessionCookieName = "session"

func (s *Server) authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if cookie, err := r.Cookie(sessionCookieName); err == nil && cookie.Value != "" {
			hash := auth.HashToken(cookie.Value)
			user, err := s.Store.GetSessionUser(hash)
			if err == nil {
				next.ServeHTTP(w, withUser(r, user))
				return
			}
		}

		if h := r.Header.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
			token := strings.TrimPrefix(h, "Bearer ")
			hash := auth.HashToken(token)
			user, key, err := s.Store.GetUserByAPIKeyHash(hash)
			if err == nil {
				r = withUser(r, user)
				r = withAPIKeyScope(r, key.Scope)
				next.ServeHTTP(w, r)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

func (s *Server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if currentUser(r) == nil {
			writeError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		next(w, r)
	}
}

func (s *Server) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u := currentUser(r)
		if u == nil || u.Role != "admin" {
			writeError(w, http.StatusForbidden, "admin access required")
			return
		}
		next(w, r)
	}
}

// requireFullScope rejects requests authenticated with a restricted-scope
// API key (upload_only / mcp) for endpoints that need full account access
// (e.g. account/profile mutations, api-key management).
func (s *Server) requireFullScope(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if scope := apiKeyScope(r); scope != "" && scope != "full" {
			writeError(w, http.StatusForbidden, "this action requires full account access, not an "+scope+" API key")
			return
		}
		next(w, r)
	}
}
