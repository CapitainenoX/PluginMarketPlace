"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { VersionUploadForm } from "@/components/plugins/VersionUploadForm";
import type { Category, Plugin, PluginImage } from "@/lib/types";

const STEPS = ["Details", "First version", "Images", "Done"] as const;

export function UploadWizard({ categories }: { categories: Category[] }) {
  const [step, setStep] = useState(0);
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [versionUploaded, setVersionUploaded] = useState(false);

  return (
    <div>
      <ol className="flex gap-6 mb-10 text-xs uppercase tracking-wide">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? "font-semibold" : "text-muted"}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <DetailsStep
          categories={categories}
          onCreated={(p) => {
            setPlugin(p);
            setStep(1);
          }}
        />
      )}

      {step === 1 && plugin && (
        <div className="flex flex-col gap-6">
          <VersionUploadForm
            slug={plugin.slug}
            onUploaded={() => setVersionUploaded(true)}
          />
          <Button
            type="button"
            disabled={!versionUploaded}
            onClick={() => setStep(2)}
            className="self-start"
          >
            Continue
          </Button>
        </div>
      )}

      {step === 2 && plugin && (
        <ImagesStep slug={plugin.slug} onDone={() => setStep(3)} />
      )}

      {step === 3 && plugin && (
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            <strong>{plugin.name}</strong> has been submitted and is pending review.
          </p>
          <Link href={`/plugin/${plugin.slug}`} className="text-sm underline underline-offset-4 self-start">
            View plugin page
          </Link>
          <Link href="/dashboard/uploads" className="text-sm underline underline-offset-4 self-start">
            Back to my plugins
          </Link>
        </div>
      )}
    </div>
  );
}

function DetailsStep({
  categories,
  onCreated,
}: {
  categories: Category[];
  onCreated: (plugin: Plugin) => void;
}) {
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const plugin = await api.createPlugin({
        name,
        summary,
        description,
        category_id: categoryId ? Number(categoryId) : null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      onCreated(plugin);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create plugin");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 max-w-xl">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="summary">Summary</Label>
        <Input
          id="summary"
          required
          maxLength={140}
          placeholder="One-line description"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={8}
          placeholder="Full description, supports plain text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full border border-border px-3.5 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:border-foreground"
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input id="tags" placeholder="economy, gui, minigame" value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating..." : "Create plugin"}
      </Button>
    </form>
  );
}

function ImagesStep({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [images, setImages] = useState<PluginImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function upload(kind: "icon" | "screenshot", file: File) {
    setError(null);
    setPending(true);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      const img = await api.uploadImage(slug, form);
      setImages((prev) => [...prev.filter((i) => !(kind === "icon" && i.kind === "icon")), img]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Image upload failed");
    } finally {
      setPending(false);
    }
  }

  const icon = images.find((i) => i.kind === "icon");
  const screenshots = images.filter((i) => i.kind === "screenshot");

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <Label htmlFor="icon-file">Icon (optional)</Label>
        <input
          id="icon-file"
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.gif"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload("icon", f);
          }}
          className="text-sm w-full border border-border px-3.5 py-2.5"
        />
        {icon && <p className="text-xs text-muted mt-1">Icon uploaded.</p>}
      </div>
      <div>
        <Label htmlFor="screenshot-file">Screenshots (optional, add one at a time)</Label>
        <input
          id="screenshot-file"
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.gif"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload("screenshot", f);
            e.target.value = "";
          }}
          className="text-sm w-full border border-border px-3.5 py-2.5"
        />
        {screenshots.length > 0 && (
          <p className="text-xs text-muted mt-1">{screenshots.length} screenshot(s) uploaded.</p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="button" disabled={pending} onClick={onDone} className="self-start">
        {pending ? "Uploading..." : "Continue"}
      </Button>
    </div>
  );
}
