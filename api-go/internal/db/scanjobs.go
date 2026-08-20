package db

import (
	"database/sql"
	"errors"
)

type ScanJob struct {
	ID         int64
	VersionID  int64
	Status     string
	ResultJSON string
	CreatedAt  string
	UpdatedAt  string
}

func (s *Store) CreateScanJob(versionID int64) (*ScanJob, error) {
	res, err := s.DB.Exec(`INSERT INTO scan_jobs (version_id) VALUES (?)`, versionID)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return s.GetScanJobByID(id)
}

func (s *Store) GetScanJobByID(id int64) (*ScanJob, error) {
	row := s.DB.QueryRow(`SELECT id, version_id, status, result_json, created_at, updated_at FROM scan_jobs WHERE id = ?`, id)
	var j ScanJob
	err := row.Scan(&j.ID, &j.VersionID, &j.Status, &j.ResultJSON, &j.CreatedAt, &j.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &j, nil
}

func (s *Store) UpdateScanJobStatus(id int64, status, resultJSON string) error {
	_, err := s.DB.Exec(
		`UPDATE scan_jobs SET status = ?, result_json = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
		status, resultJSON, id,
	)
	return err
}

// Fingerprints

func (s *Store) UpsertInstallFingerprint(pluginID, versionID int64, fingerprint string) error {
	_, err := s.DB.Exec(`
		INSERT INTO install_fingerprints (plugin_id, version_id, fingerprint)
		VALUES (?, ?, ?)
		ON CONFLICT (plugin_id, fingerprint)
		DO UPDATE SET version_id = excluded.version_id, reported_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
		pluginID, versionID, fingerprint,
	)
	return err
}
