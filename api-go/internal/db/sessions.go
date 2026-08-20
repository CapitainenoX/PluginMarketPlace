package db

type Session struct {
	ID        int64
	UserID    int64
	TokenHash string
	CreatedAt string
	ExpiresAt string
}

func (s *Store) CreateSession(userID int64, tokenHash, expiresAt string) error {
	_, err := s.DB.Exec(
		`INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
		userID, tokenHash, expiresAt,
	)
	return err
}

// GetSessionUser returns the user for a valid, non-expired session token hash.
func (s *Store) GetSessionUser(tokenHash string) (*User, error) {
	row := s.DB.QueryRow(`
		SELECT u.id, u.username, u.email, u.password_hash, u.role, u.created_at
		FROM sessions se
		JOIN users u ON u.id = se.user_id
		WHERE se.token_hash = ? AND se.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
		tokenHash,
	)
	return s.scanUser(row)
}

func (s *Store) DeleteSession(tokenHash string) error {
	_, err := s.DB.Exec(`DELETE FROM sessions WHERE token_hash = ?`, tokenHash)
	return err
}

func (s *Store) DeleteExpiredSessions() error {
	_, err := s.DB.Exec(`DELETE FROM sessions WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
	return err
}
