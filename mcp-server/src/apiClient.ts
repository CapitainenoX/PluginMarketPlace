import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";
const MCP_API_KEY = process.env.MCP_API_KEY ?? "";

export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API request failed (${status}): ${body}`);
  }
}

function authHeaders(): Record<string, string> {
  if (!MCP_API_KEY) {
    throw new Error("MCP_API_KEY environment variable is not set");
  }
  return { Authorization: `Bearer ${MCP_API_KEY}` };
}

async function handle(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(res.status, text);
  }
  return text ? JSON.parse(text) : {};
}

export async function apiGet(path: string): Promise<unknown> {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders() });
  return handle(res);
}

export async function apiJson(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle(res);
}

/**
 * Multipart upload. `fields` are plain form fields, `filePath` is read from
 * local disk and sent under the given form field name.
 */
export async function apiUpload(
  path: string,
  fields: Record<string, string>,
  file: { fieldName: string; filePath: string },
): Promise<unknown> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  const data = await readFile(file.filePath);
  form.append(file.fieldName, new Blob([data]), basename(file.filePath));

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  return handle(res);
}
