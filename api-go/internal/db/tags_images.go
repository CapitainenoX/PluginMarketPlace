package db

import (
	"database/sql"
	"errors"
)

type Tag struct {
	ID       int64
	PluginID int64
	Tag      string
}

func (s *Store) AddPluginTag(pluginID int64, tag string) error {
	_, err := s.DB.Exec(`INSERT OR IGNORE INTO plugin_tags (plugin_id, tag) VALUES (?, ?)`, pluginID, tag)
	return err
}

func (s *Store) ListPluginTags(pluginID int64) ([]string, error) {
	rows, err := s.DB.Query(`SELECT tag FROM plugin_tags WHERE plugin_id = ? ORDER BY tag`, pluginID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tags := []string{}
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

type PluginImage struct {
	ID        int64
	PluginID  int64
	Kind      string
	FilePath  string
	Position  int64
	CreatedAt string
}

func (s *Store) AddPluginImage(pluginID int64, kind, filePath string, position int64) (*PluginImage, error) {
	res, err := s.DB.Exec(
		`INSERT INTO plugin_images (plugin_id, kind, file_path, position) VALUES (?, ?, ?, ?)`,
		pluginID, kind, filePath, position,
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return &PluginImage{ID: id, PluginID: pluginID, Kind: kind, FilePath: filePath, Position: position}, nil
}

func (s *Store) GetPluginImage(id int64) (*PluginImage, error) {
	var img PluginImage
	err := s.DB.QueryRow(
		`SELECT id, plugin_id, kind, file_path, position, created_at FROM plugin_images WHERE id = ?`, id,
	).Scan(&img.ID, &img.PluginID, &img.Kind, &img.FilePath, &img.Position, &img.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &img, nil
}

func (s *Store) ListPluginImages(pluginID int64) ([]PluginImage, error) {
	rows, err := s.DB.Query(
		`SELECT id, plugin_id, kind, file_path, position, created_at FROM plugin_images WHERE plugin_id = ? ORDER BY position`,
		pluginID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	images := []PluginImage{}
	for rows.Next() {
		var img PluginImage
		if err := rows.Scan(&img.ID, &img.PluginID, &img.Kind, &img.FilePath, &img.Position, &img.CreatedAt); err != nil {
			return nil, err
		}
		images = append(images, img)
	}
	return images, rows.Err()
}
