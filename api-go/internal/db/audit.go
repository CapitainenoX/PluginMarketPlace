package db

type AuditEntry struct {
	ID         int64  `json:"id"`
	UserID     *int64 `json:"user_id"`
	Action     string `json:"action"`
	TargetType string `json:"target_type"`
	TargetID   string `json:"target_id"`
	MetaJSON   string `json:"meta_json"`
	IP         string `json:"ip"`
	CreatedAt  string `json:"created_at"`
}

func (s *Store) WriteAuditLog(userID *int64, action, targetType, targetID, metaJSON, ip string) error {
	_, err := s.DB.Exec(
		`INSERT INTO audit_log (user_id, action, target_type, target_id, meta_json, ip) VALUES (?, ?, ?, ?, ?, ?)`,
		userID, action, targetType, targetID, metaJSON, ip,
	)
	return err
}

func (s *Store) ListAuditLog(limit, offset int) ([]AuditEntry, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.DB.Query(
		`SELECT id, user_id, action, target_type, target_id, meta_json, ip, created_at FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?`,
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := []AuditEntry{}
	for rows.Next() {
		var e AuditEntry
		var userID *int64
		var targetID *string
		if err := rows.Scan(&e.ID, &userID, &e.Action, &e.TargetType, &targetID, &e.MetaJSON, &e.IP, &e.CreatedAt); err != nil {
			return nil, err
		}
		e.UserID = userID
		if targetID != nil {
			e.TargetID = *targetID
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}
