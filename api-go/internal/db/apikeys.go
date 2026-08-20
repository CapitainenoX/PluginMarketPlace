package db

import (
	"database/sql"
	"errors"
)

type APIKey struct {
	ID        int64
	UserID    int64
	Name      string
	KeyPrefix string
	KeyHash   string
	Scope     string
	CreatedAt string
	RevokedAt sql.NullString
}

func (s *Store) CreateAPIKey(userID int64, name, prefix, hash, scope string) (*APIKey, error) {
	res, err := s.DB.Exec(
		`INSERT INTO api_keys (user_id, name, key_prefix, key_hash, scope) VALUES (?, ?, ?, ?, ?)`,
		userID, name, prefix, hash, scope,
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return s.GetAPIKeyByID(id)
}

func (s *Store) GetAPIKeyByID(id int64) (*APIKey, error) {
	row := s.DB.QueryRow(
		`SELECT id, user_id, name, key_prefix, key_hash, scope, created_at, revoked_at FROM api_keys WHERE id = ?`, id,
	)
	return scanAPIKey(row)
}

// GetActiveAPIKeyByHash returns a non-revoked key with a joined user, for auth.
func (s *Store) GetUserByAPIKeyHash(hash string) (*User, *APIKey, error) {
	row := s.DB.QueryRow(`
		SELECT u.id, u.username, u.email, u.password_hash, u.role, u.created_at,
		       k.id, k.user_id, k.name, k.key_prefix, k.key_hash, k.scope, k.created_at, k.revoked_at
		FROM api_keys k
		JOIN users u ON u.id = k.user_id
		WHERE k.key_hash = ? AND k.revoked_at IS NULL`,
		hash,
	)
	var u User
	var k APIKey
	err := row.Scan(
		&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt,
		&k.ID, &k.UserID, &k.Name, &k.KeyPrefix, &k.KeyHash, &k.Scope, &k.CreatedAt, &k.RevokedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil, ErrNotFound
	}
	if err != nil {
		return nil, nil, err
	}
	return &u, &k, nil
}

func (s *Store) ListAPIKeysByUser(userID int64) ([]APIKey, error) {
	rows, err := s.DB.Query(
		`SELECT id, user_id, name, key_prefix, key_hash, scope, created_at, revoked_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	keys := []APIKey{}
	for rows.Next() {
		var k APIKey
		if err := rows.Scan(&k.ID, &k.UserID, &k.Name, &k.KeyPrefix, &k.KeyHash, &k.Scope, &k.CreatedAt, &k.RevokedAt); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, rows.Err()
}

func (s *Store) RevokeAPIKey(id, ownerUserID int64) error {
	res, err := s.DB.Exec(
		`UPDATE api_keys SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
		id, ownerUserID,
	)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func scanAPIKey(row *sql.Row) (*APIKey, error) {
	var k APIKey
	err := row.Scan(&k.ID, &k.UserID, &k.Name, &k.KeyPrefix, &k.KeyHash, &k.Scope, &k.CreatedAt, &k.RevokedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &k, nil
}
