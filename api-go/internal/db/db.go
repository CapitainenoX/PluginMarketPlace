// Package db owns the SQLite connection and a thin, explicit query layer
// (no ORM). Migrations are applied via a small embedded runner rather than
// golang-migrate: at this stage there is exactly one forward-only migration
// set, and embed.FS + a schema_migrations table covers that with far less
// dependency weight than pulling in golang-migrate's driver machinery.
package db

import (
	"database/sql"
	"fmt"
	"io/fs"
	"sort"

	"mcmarket/api/migrations"

	_ "modernc.org/sqlite"
)

var migrationsFS = migrations.FS

// Store wraps the DB handle. Query methods are added in sibling files
// (users.go, plugins.go, ...), all as plain methods on *Store.
type Store struct {
	DB *sql.DB
}

func Open(path string) (*Store, error) {
	dsn := path + "?_pragma=busy_timeout(5000)"
	sqlDB, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	// SQLite is a single-writer database; capping the pool at one connection
	// avoids SQLITE_BUSY churn from this process racing itself. WAL still
	// allows external readers (e.g. an sqlite3 CLI) concurrent access.
	sqlDB.SetMaxOpenConns(1)

	for _, pragma := range []string{
		"PRAGMA journal_mode=WAL",
		"PRAGMA foreign_keys=ON",
		"PRAGMA busy_timeout=5000",
	} {
		if _, err := sqlDB.Exec(pragma); err != nil {
			return nil, fmt.Errorf("exec %q: %w", pragma, err)
		}
	}

	store := &Store{DB: sqlDB}
	if err := store.migrate(); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return store, nil
}

func (s *Store) Close() error {
	return s.DB.Close()
}

func (s *Store) migrate() error {
	if _, err := s.DB.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		filename TEXT PRIMARY KEY,
		applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
	)`); err != nil {
		return err
	}

	entries, err := fs.ReadDir(migrationsFS, ".")
	if err != nil {
		return err
	}
	names := make([]string, 0, len(entries))
	for _, e := range entries {
		names = append(names, e.Name())
	}
	sort.Strings(names)

	for _, name := range names {
		var already int
		if err := s.DB.QueryRow(`SELECT COUNT(1) FROM schema_migrations WHERE filename = ?`, name).Scan(&already); err != nil {
			return err
		}
		if already > 0 {
			continue
		}

		sqlBytes, err := migrationsFS.ReadFile(name)
		if err != nil {
			return err
		}

		tx, err := s.DB.Begin()
		if err != nil {
			return err
		}
		if _, err := tx.Exec(string(sqlBytes)); err != nil {
			tx.Rollback()
			return fmt.Errorf("apply %s: %w", name, err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_migrations (filename) VALUES (?)`, name); err != nil {
			tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}
