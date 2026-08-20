import type {
  ApiKey,
  AuditLogEntry,
  Category,
  Plugin,
  PluginImage,
  PluginVersion,
  User,
} from "./types";

// Base URL resolution: server-side (SSR, route handlers, middleware) talks to
// the Go API over the internal/container network via API_INTERNAL_URL; the
// browser talks to it over the public URL via NEXT_PUBLIC_API_URL.
function baseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.API_INTERNAL_URL ?? "http://localhost:8080";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  cache?: RequestCache;
}

// On the server, httpOnly cookies set by the Go API aren't accessible to
// client JS, but Next's server runtime can read the raw request cookie jar
// and forward it on SSR fetches so authenticated pages render correctly.
async function serverCookieHeader(): Promise<string | undefined> {
  if (typeof window !== "undefined") return undefined;
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const header = jar.toString();
  return header.length > 0 ? header : undefined;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers: headersInit, ...rest } = options;
  const headers = new Headers(headersInit);

  const isFormData = body instanceof FormData;
  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (isFormData) {
      payload = body;
    } else {
      headers.set("Content-Type", "application/json");
      payload = JSON.stringify(body);
    }
  }

  const cookieHeader = await serverCookieHeader();
  if (cookieHeader) headers.set("Cookie", cookieHeader);

  const res = await fetch(`${baseUrl()}${path}`, {
    ...rest,
    method: rest.method ?? "GET",
    headers,
    body: payload,
    credentials: "include",
    cache: rest.cache ?? "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json() : undefined;

  if (!res.ok) {
    const message = (data && typeof data === "object" && "error" in data)
      ? String((data as { error: unknown }).error)
      : `request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export const api = {
  // --- auth ---
  register: (input: { username: string; email: string; password: string }) =>
    request<User>("/v1/auth/register", { method: "POST", body: input }),
  login: (input: { username: string; password: string }) =>
    request<User>("/v1/auth/login", { method: "POST", body: input }),
  logout: () => request<{ status: string }>("/v1/auth/logout", { method: "POST" }),
  me: () => request<User>("/v1/auth/me"),

  // --- categories ---
  categories: () => request<{ categories: Category[] }>("/v1/categories"),

  // --- plugins ---
  listPlugins: (params: { q?: string; category?: string; limit?: number; offset?: number; status?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.category) qs.set("category", params.category);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));
    if (params.status) qs.set("status", params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ plugins: Plugin[] }>(`/v1/plugins${suffix}`);
  },
  getPlugin: (slug: string) => request<Plugin>(`/v1/plugins/${encodeURIComponent(slug)}`),
  createPlugin: (input: { name: string; summary: string; description: string; category_id: number | null; tags: string[] }) =>
    request<Plugin>("/v1/plugins", { method: "POST", body: input }),
  updatePlugin: (
    slug: string,
    input: Partial<{ name: string; summary: string; description: string; category_id: number | null }>,
  ) => request<Plugin>(`/v1/plugins/${encodeURIComponent(slug)}`, { method: "PATCH", body: input }),
  deletePlugin: (slug: string) =>
    request<{ status: string }>(`/v1/plugins/${encodeURIComponent(slug)}`, { method: "DELETE" }),

  // --- versions ---
  listVersions: (slug: string) =>
    request<{ versions: PluginVersion[] }>(`/v1/plugins/${encodeURIComponent(slug)}/versions`),
  uploadVersion: (slug: string, form: FormData) =>
    request<PluginVersion>(`/v1/plugins/${encodeURIComponent(slug)}/versions`, { method: "POST", body: form }),
  getVersion: (id: number) => request<PluginVersion>(`/v1/versions/${id}`),
  versionStatus: (id: number) => request<{ status: string }>(`/v1/versions/${id}/status`),
  downloadUrl: (id: number) => `${baseUrl()}/v1/versions/${id}/download`,

  // --- images ---
  listImages: (slug: string) =>
    request<{ images: PluginImage[] }>(`/v1/plugins/${encodeURIComponent(slug)}/images`),
  uploadImage: (slug: string, form: FormData) =>
    request<PluginImage>(`/v1/plugins/${encodeURIComponent(slug)}/images`, { method: "POST", body: form }),
  imageUrl: (url: string) => `${baseUrl()}${url}`,

  // --- dashboard ---
  dashboardUploads: () => request<{ plugins: Plugin[] }>("/v1/dashboard/uploads"),
  listApiKeys: () => request<{ api_keys: ApiKey[] }>("/v1/dashboard/api-keys"),
  createApiKey: (input: { name: string; scope: string }) =>
    request<ApiKey>("/v1/dashboard/api-keys", { method: "POST", body: input }),
  revokeApiKey: (id: number) =>
    request<{ status: string }>(`/v1/dashboard/api-keys/${id}`, { method: "DELETE" }),

  // --- admin ---
  adminListPlugins: (params: { status?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ plugins: Plugin[] }>(`/v1/admin/plugins${suffix}`);
  },
  adminApprovePlugin: (slug: string) =>
    request<{ status: string }>(`/v1/admin/plugins/${encodeURIComponent(slug)}/approve`, { method: "POST" }),
  adminBanPlugin: (slug: string) =>
    request<{ status: string }>(`/v1/admin/plugins/${encodeURIComponent(slug)}/ban`, { method: "POST" }),
  adminAuditLog: (params: { limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ entries: AuditLogEntry[] }>(`/v1/admin/audit-log${suffix}`);
  },
};

// Convenience helper for pages/layouts that just want the current user (or
// null if unauthenticated) without dealing with the 401 throw.
export async function currentUserOrNull(): Promise<User | null> {
  try {
    return await api.me();
  } catch {
    return null;
  }
}
