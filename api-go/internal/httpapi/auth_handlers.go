package httpapi

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"mcmarket/api/internal/auth"
	"mcmarket/api/internal/db"
)

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if len(req.Username) < 3 || len(req.Password) < 8 || req.Email == "" {
		writeError(w, http.StatusBadRequest, "username must be >=3 chars, password >=8 chars, email required")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	user, err := s.Store.CreateUser(req.Username, req.Email, hash)
	if err != nil {
		writeError(w, http.StatusConflict, "username or email already in use")
		return
	}

	uid := user.ID
	_ = s.Store.WriteAuditLog(&uid, "user.register", "user", itoa(user.ID), "{}", clientIP(r))

	s.startSession(w, r, user)
	writeJSON(w, http.StatusCreated, userResponse(user))
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := s.Store.GetUserByUsername(strings.TrimSpace(req.Username))
	if errors.Is(err, db.ErrNotFound) {
		user, err = s.Store.GetUserByEmail(strings.TrimSpace(strings.ToLower(req.Username)))
	}
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	ok, err := auth.VerifyPassword(user.PasswordHash, req.Password)
	if err != nil || !ok {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	uid := user.ID
	_ = s.Store.WriteAuditLog(&uid, "user.login", "user", itoa(user.ID), "{}", clientIP(r))

	s.startSession(w, r, user)
	writeJSON(w, http.StatusOK, userResponse(user))
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(sessionCookieName); err == nil {
		_ = s.Store.DeleteSession(auth.HashToken(cookie.Value))
	}
	if u := currentUser(r); u != nil {
		uid := u.ID
		_ = s.Store.WriteAuditLog(&uid, "user.logout", "user", itoa(u.ID), "{}", clientIP(r))
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   s.Cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		Domain:   s.Cfg.CookieDomain,
	})
	writeJSON(w, http.StatusOK, map[string]string{"status": "logged_out"})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, userResponse(currentUser(r)))
}

func (s *Server) startSession(w http.ResponseWriter, r *http.Request, user *db.User) {
	token, hash, err := auth.NewOpaqueToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
	expires := time.Now().Add(30 * 24 * time.Hour)
	if err := s.Store.CreateSession(user.ID, hash, expires.UTC().Format("2006-01-02T15:04:05.000Z")); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expires,
		HttpOnly: true,
		Secure:   s.Cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
		Domain:   s.Cfg.CookieDomain,
	})
}

func userResponse(u *db.User) map[string]any {
	if u == nil {
		return nil
	}
	return map[string]any{
		"id":         u.ID,
		"username":   u.Username,
		"email":      u.Email,
		"role":       u.Role,
		"created_at": u.CreatedAt,
	}
}
