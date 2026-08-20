package db

import (
	"database/sql"
	"errors"
)

type PluginVersion struct {
	ID              int64
	PluginID        int64
	Version         string
	Changelog       string
	MCVersionMin    string
	MCVersionMax    string
	Loaders         string
	FilePath        string
	FileSHA256      string
	FileSize        int64
	DownloadsCount  int64
	Status          string
	CreatedAt       string
}

type CreateVersionParams struct {
	PluginID     int64
	Version      string
	Changelog    string
	MCVersionMin string
	MCVersionMax string
	Loaders      string
	FilePath     string
	FileSHA256   string
	FileSize     int64
}

func (s *Store) CreateVersion(p CreateVersionParams) (*PluginVersion, error) {
	if p.Loaders == "" {
		p.Loaders = "paper"
	}
	res, err := s.DB.Exec(
		`INSERT INTO plugin_versions (plugin_id, version, changelog, mc_version_min, mc_version_max, loaders, file_path, file_sha256, file_size)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.PluginID, p.Version, p.Changelog, p.MCVersionMin, p.MCVersionMax, p.Loaders, p.FilePath, p.FileSHA256, p.FileSize,
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return s.GetVersionByID(id)
}

const versionSelect = `SELECT id, plugin_id, version, changelog, mc_version_min, mc_version_max, loaders, file_path, file_sha256, file_size, downloads_count, status, created_at FROM plugin_versions`

func (s *Store) GetVersionByID(id int64) (*PluginVersion, error) {
	return s.scanVersion(s.DB.QueryRow(versionSelect+` WHERE id = ?`, id))
}

func (s *Store) ListVersionsByPlugin(pluginID int64) ([]PluginVersion, error) {
	rows, err := s.DB.Query(versionSelect+` WHERE plugin_id = ? ORDER BY created_at DESC`, pluginID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	versions := []PluginVersion{}
	for rows.Next() {
		var v PluginVersion
		if err := scanVersionRow(rows, &v); err != nil {
			return nil, err
		}
		versions = append(versions, v)
	}
	return versions, rows.Err()
}

func (s *Store) UpdateVersionStatus(id int64, status string) error {
	_, err := s.DB.Exec(`UPDATE plugin_versions SET status = ? WHERE id = ?`, status, id)
	return err
}

func (s *Store) IncrementVersionDownloads(id int64) error {
	_, err := s.DB.Exec(`UPDATE plugin_versions SET downloads_count = downloads_count + 1 WHERE id = ?`, id)
	return err
}

// LatestApprovedVersion returns the newest approved version for a plugin, used by check-updates.
func (s *Store) LatestApprovedVersion(pluginID int64) (*PluginVersion, error) {
	return s.scanVersion(s.DB.QueryRow(
		versionSelect+` WHERE plugin_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1`, pluginID,
	))
}

func (s *Store) scanVersion(row *sql.Row) (*PluginVersion, error) {
	var v PluginVersion
	err := row.Scan(&v.ID, &v.PluginID, &v.Version, &v.Changelog, &v.MCVersionMin, &v.MCVersionMax, &v.Loaders, &v.FilePath, &v.FileSHA256, &v.FileSize, &v.DownloadsCount, &v.Status, &v.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func scanVersionRow(rows *sql.Rows, v *PluginVersion) error {
	return rows.Scan(&v.ID, &v.PluginID, &v.Version, &v.Changelog, &v.MCVersionMin, &v.MCVersionMax, &v.Loaders, &v.FilePath, &v.FileSHA256, &v.FileSize, &v.DownloadsCount, &v.Status, &v.CreatedAt)
}
