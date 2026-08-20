package db

import (
	"database/sql"
	"errors"
)

var ErrNotFound = errors.New("not found")

type User struct {
	ID           int64
	Username     string
	Email        string
	PasswordHash string
	Role         string
	CreatedAt    string
}

func (s *Store) CreateUser(username, email, passwordHash string) (*User, error) {
	res, err := s.DB.Exec(
		`INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
		username, email, passwordHash,
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return s.GetUserByID(id)
}

func (s *Store) GetUserByID(id int64) (*User, error) {
	return s.scanUser(s.DB.QueryRow(
		`SELECT id, username, email, password_hash, role, created_at FROM users WHERE id = ?`, id,
	))
}

func (s *Store) GetUserByUsername(username string) (*User, error) {
	return s.scanUser(s.DB.QueryRow(
		`SELECT id, username, email, password_hash, role, created_at FROM users WHERE username = ?`, username,
	))
}

func (s *Store) GetUserByEmail(email string) (*User, error) {
	return s.scanUser(s.DB.QueryRow(
		`SELECT id, username, email, password_hash, role, created_at FROM users WHERE email = ?`, email,
	))
}

func (s *Store) scanUser(row *sql.Row) (*User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}
