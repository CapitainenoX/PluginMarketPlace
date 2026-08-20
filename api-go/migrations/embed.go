// Package migrations embeds the SQL migration files so they ship inside the
// compiled binary. Kept as its own tiny package (rather than embedding
// directly from internal/db) so the .sql files can live at the canonical
// api-go/migrations/ path called out in the project plan.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
