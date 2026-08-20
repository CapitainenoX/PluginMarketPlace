package db

type Category struct {
	ID          int64  `json:"id"`
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (s *Store) ListCategories() ([]Category, error) {
	rows, err := s.DB.Query(`SELECT id, slug, name, description FROM categories ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cats := []Category{}
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Slug, &c.Name, &c.Description); err != nil {
			return nil, err
		}
		cats = append(cats, c)
	}
	return cats, rows.Err()
}

func (s *Store) CreateCategory(slug, name, description string) (*Category, error) {
	res, err := s.DB.Exec(`INSERT INTO categories (slug, name, description) VALUES (?, ?, ?)`, slug, name, description)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return &Category{ID: id, Slug: slug, Name: name, Description: description}, nil
}
