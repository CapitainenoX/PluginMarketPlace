"use client";

import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import type { Loader, PluginVersion } from "@/lib/types";

const LOADERS: { value: Loader; label: string }[] = [
  { value: "paper", label: "Paper" },
  { value: "spigot", label: "Spigot" },
  { value: "bukkit", label: "Bukkit" },
];

export function VersionUploadForm({
  slug,
  onUploaded,
}: {
  slug: string;
  onUploaded?: (version: PluginVersion) => void;
}) {
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [mcMin, setMcMin] = useState("");
  const [mcMax, setMcMax] = useState("");
  const [loaders, setLoaders] = useState<Loader[]>(["paper"]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("A .jar file is required");
      return;
    }
    if (loaders.length === 0) {
      setError("Select at least one loader");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const form = new FormData();
      form.set("version", version);
      form.set("changelog", changelog);
      form.set("mc_version_min", mcMin);
      form.set("mc_version_max", mcMax || mcMin);
      form.set("loaders", loaders.join(","));
      form.set("file", file);
      const created = await api.uploadVersion(slug, form);
      setDone(true);
      onUploaded?.(created);
      setVersion("");
      setChangelog("");
      setMcMin("");
      setMcMax("");
      setLoaders(["paper"]);
      setFile(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="version">Version</Label>
          <Input id="version" required placeholder="1.0.0" value={version} onChange={(e) => setVersion(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="mc-min">MC version (min)</Label>
          <Input id="mc-min" required placeholder="1.21" value={mcMin} onChange={(e) => setMcMin(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="mc-max">MC version (max)</Label>
          <Input id="mc-max" placeholder="1.21.11" value={mcMax} onChange={(e) => setMcMax(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Loaders</Label>
        <div className="flex gap-4">
          {LOADERS.map((l) => (
            <label key={l.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={loaders.includes(l.value)}
                onChange={(e) =>
                  setLoaders((prev) =>
                    e.target.checked ? [...prev, l.value] : prev.filter((x) => x !== l.value),
                  )
                }
              />
              {l.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="changelog">Changelog</Label>
        <Textarea
          id="changelog"
          rows={4}
          placeholder="What changed in this version?"
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="file">Plugin jar</Label>
        <input
          id="file"
          type="file"
          accept=".jar"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm w-full border border-border px-3.5 py-2.5"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm">Version uploaded and queued for review.</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Uploading..." : "Upload version"}
      </Button>
    </form>
  );
}
