"use client";

import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { ApiKey, ApiKeyScope } from "@/lib/types";

export function ApiKeysManager({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<ApiKeyScope>("full");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const created = await api.createApiKey({ name, scope });
      setKeys((prev) => [created, ...prev]);
      setNewToken(created.token ?? null);
      setName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create key");
    } finally {
      setPending(false);
    }
  }

  async function onRevoke(id: number) {
    await api.revokeApiKey(id).catch(() => undefined);
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
  }

  return (
    <div className="flex flex-col gap-10">
      <form onSubmit={onCreate} className="flex flex-col sm:flex-row gap-4 items-end max-w-xl">
        <div className="flex-1">
          <Label htmlFor="key-name">Name</Label>
          <Input id="key-name" required placeholder="e.g. mcp-agent" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="key-scope">Scope</Label>
          <select
            id="key-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as ApiKeyScope)}
            className="border border-border px-3.5 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:border-foreground"
          >
            <option value="full">full</option>
            <option value="upload_only">upload_only</option>
            <option value="mcp">mcp</option>
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create key"}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {newToken && (
        <div className="border border-foreground p-4 text-sm">
          <p className="font-medium mb-1">Copy this token now &mdash; it will not be shown again.</p>
          <code className="text-xs break-all">{newToken}</code>
        </div>
      )}

      <div className="flex flex-col divide-y divide-border border border-border">
        {keys.length === 0 && <p className="p-6 text-sm text-muted">No API keys yet.</p>}
        {keys.map((key) => (
          <div key={key.id} className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-medium">{key.name}</p>
              <p className="text-xs text-muted mt-0.5">
                {key.key_prefix}&hellip; &middot; {key.scope} &middot; created{" "}
                {new Date(key.created_at).toLocaleDateString()}
              </p>
            </div>
            {key.revoked ? (
              <span className="text-xs uppercase tracking-wide text-muted">Revoked</span>
            ) : (
              <button
                onClick={() => onRevoke(key.id)}
                className="text-xs uppercase tracking-wide border border-foreground px-3 py-1.5 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors cursor-pointer"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
