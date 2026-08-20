package httpapi

import (
	"context"
	"net/http"

	"mcmarket/api/internal/db"
)

type ctxKey int

const (
	ctxUserKey ctxKey = iota
	ctxAPIKeyScopeKey
)

func withUser(r *http.Request, u *db.User) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), ctxUserKey, u))
}

// currentUser returns the authenticated user, or nil if the request is anonymous.
func currentUser(r *http.Request) *db.User {
	u, _ := r.Context().Value(ctxUserKey).(*db.User)
	return u
}

func withAPIKeyScope(r *http.Request, scope string) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), ctxAPIKeyScopeKey, scope))
}

// apiKeyScope returns the scope of the API key used for this request, or ""
// if authenticated via session cookie (which carries full user privileges).
func apiKeyScope(r *http.Request) string {
	s, _ := r.Context().Value(ctxAPIKeyScopeKey).(string)
	return s
}
