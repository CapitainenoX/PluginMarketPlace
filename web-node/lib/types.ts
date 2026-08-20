export type UserRole = "user" | "admin";

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
}

export type PluginStatus = "pending" | "approved" | "hidden" | "banned";

export interface Plugin {
  id: number;
  slug: string;
  name: string;
  summary: string;
  description: string;
  owner_id: number;
  category_id: number | null;
  status: PluginStatus;
  downloads_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  versions?: PluginVersion[];
}

export type VersionStatus = "pending_scan" | "approved" | "rejected";

export type Loader = "paper" | "spigot" | "bukkit";

export interface PluginVersion {
  id: number;
  plugin_id: number;
  version: string;
  changelog: string;
  mc_version_min: string;
  mc_version_max: string;
  loaders: Loader[];
  file_sha256: string;
  file_size: number;
  downloads_count: number;
  status: VersionStatus | "pending" | "completed";
  created_at: string;
}

export interface PluginImage {
  id: number;
  plugin_id: number;
  kind: "icon" | "screenshot";
  url: string;
  position: number;
  created_at: string;
}

export type ApiKeyScope = "full" | "upload_only" | "mcp";

export interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  scope: ApiKeyScope;
  created_at: string;
  revoked: boolean;
  token?: string;
}

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  action: string;
  target_type: string;
  target_id: string;
  meta_json: string;
  ip: string;
  created_at: string;
}
