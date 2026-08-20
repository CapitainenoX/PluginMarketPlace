package db

import (
	"database/sql"
	"errors"
	"strings"
)

type Plugin struct {
	ID              int64
	Slug            string
	Name            string
	Summary         string
	Description     string
	OwnerID         int64
	CategoryID      sql.NullInt64
	Status          string
	DownloadsCount  int64
	CreatedAt       string
	UpdatedAt       string
}

type CreatePluginParams struct {
	Slug        string
	Name        string
	Summary     string
	Description string
	OwnerID     int64
	CategoryID  *int64
}

func (s *Store) CreatePlugin(p CreatePluginParams) (*Plugin, error) {
	var catID sql.NullInt64
	if p.CategoryID != nil {
		catID = sql.NullInt64{Int64: *p.CategoryID, Valid: true}
	}
	res, err := s.DB.Exec(
		`INSERT INTO plugins (slug, name, summary, description, owner_id, category_id) VALUES (?, ?, ?, ?, ?, ?)`,
		p.Slug, p.Name, p.Summary, p.Description, p.OwnerID, catID,
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return s.GetPluginByID(id)
}

func (s *Store) GetPluginByID(id int64) (*Plugin, error) {
	return s.scanPlugin(s.DB.QueryRow(pluginSelect+` WHERE id = ?`, id))
}

func (s *Store) GetPluginBySlug(slug string) (*Plugin, error) {
	return s.scanPlugin(s.DB.QueryRow(pluginSelect+` WHERE slug = ?`, slug))
}

const pluginSelect = `SELECT id, slug, name, summary, description, owner_id, category_id, status, downloads_count, created_at, updated_at FROM plugins`

func (s *Store) scanPlugin(row *sql.Row) (*Plugin, error) {
	var p Plugin
	err := row.Scan(&p.ID, &p.Slug, &p.Name, &p.Summary, &p.Description, &p.OwnerID, &p.CategoryID, &p.Status, &p.DownloadsCount, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

type ListPluginsParams struct {
	Query        string // FTS5 search query, empty = no text filter
	CategorySlug string
	Statuses     []string // restrict to these statuses; empty = caller must pass explicit statuses
	Limit        int
	Offset       int
}

func (s *Store) ListPlugins(p ListPluginsParams) ([]Plugin, error) {
	var (
		sqlStr string
		args   []any
	)

	if p.Query != "" {
		sqlStr = `SELECT pl.id, pl.slug, pl.name, pl.summary, pl.description, pl.owner_id, pl.category_id, pl.status, pl.downloads_count, pl.created_at, pl.updated_at
			FROM plugins_fts f
			JOIN plugins pl ON pl.id = f.rowid
			WHERE plugins_fts MATCH ?`
		args = append(args, ftsQuery(p.Query))
	} else {
		sqlStr = `SELECT pl.id, pl.slug, pl.name, pl.summary, pl.description, pl.owner_id, pl.category_id, pl.status, pl.downloads_count, pl.created_at, pl.updated_at
			FROM plugins pl WHERE 1=1`
	}

	if len(p.Statuses) > 0 {
		placeholders := make([]string, len(p.Statuses))
		for i, st := range p.Statuses {
			placeholders[i] = "?"
			args = append(args, st)
		}
		sqlStr += " AND pl.status IN (" + strings.Join(placeholders, ",") + ")"
	}

	if p.CategorySlug != "" {
		sqlStr += ` AND pl.category_id = (SELECT id FROM categories WHERE slug = ?)`
		args = append(args, p.CategorySlug)
	}

	sqlStr += " ORDER BY pl.downloads_count DESC, pl.created_at DESC LIMIT ? OFFSET ?"
	limit := p.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	args = append(args, limit, p.Offset)

	rows, err := s.DB.Query(sqlStr, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	plugins := []Plugin{}
	for rows.Next() {
		var p Plugin
		if err := rows.Scan(&p.ID, &p.Slug, &p.Name, &p.Summary, &p.Description, &p.OwnerID, &p.CategoryID, &p.Status, &p.DownloadsCount, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		plugins = append(plugins, p)
	}
	return plugins, rows.Err()
}

// ftsQuery escapes a raw user query into a safe FTS5 MATCH argument by
// quoting each token, then OR-prefix-matching them.
func ftsQuery(raw string) string {
	fields := strings.Fields(raw)
	if len(fields) == 0 {
		return `""`
	}
	parts := make([]string, len(fields))
	for i, f := range fields {
		f = strings.ReplaceAll(f, `"`, `""`)
		parts[i] = `"` + f + `"*`
	}
	return strings.Join(parts, " OR ")
}

type UpdatePluginParams struct {
	Name        *string
	Summary     *string
	Description *string
	CategoryID  *int64
	Status      *string
}

func (s *Store) UpdatePlugin(id int64, p UpdatePluginParams) error {
	sets := []string{"updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"}
	var args []any
	if p.Name != nil {
		sets = append(sets, "name = ?")
		args = append(args, *p.Name)
	}
	if p.Summary != nil {
		sets = append(sets, "summary = ?")
		args = append(args, *p.Summary)
	}
	if p.Description != nil {
		sets = append(sets, "description = ?")
		args = append(args, *p.Description)
	}
	if p.CategoryID != nil {
		sets = append(sets, "category_id = ?")
		args = append(args, *p.CategoryID)
	}
	if p.Status != nil {
		sets = append(sets, "status = ?")
		args = append(args, *p.Status)
	}
	args = append(args, id)
	_, err := s.DB.Exec(`UPDATE plugins SET `+strings.Join(sets, ", ")+` WHERE id = ?`, args...)
	return err
}

func (s *Store) DeletePlugin(id int64) error {
	_, err := s.DB.Exec(`DELETE FROM plugins WHERE id = ?`, id)
	return err
}

func (s *Store) IncrementPluginDownloads(id int64) error {
	_, err := s.DB.Exec(`UPDATE plugins SET downloads_count = downloads_count + 1 WHERE id = ?`, id)
	return err
}
