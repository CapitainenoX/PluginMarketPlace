-- Which server loaders a version supports, comma-separated (e.g. "paper,spigot,bukkit").
-- Paper plugins built against the stable Bukkit API generally also run on
-- Spigot/Bukkit, so this is informational metadata for filtering, not an
-- enforced constraint.
ALTER TABLE plugin_versions ADD COLUMN loaders TEXT NOT NULL DEFAULT 'paper';
