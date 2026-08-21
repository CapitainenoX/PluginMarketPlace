"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { RevealItem } from "@/components/motion/Reveal";
import type { Plugin } from "@/lib/types";

export function ApprovedPluginsList({ plugins: initial }: { plugins: Plugin[] }) {
  const [plugins, setPlugins] = useState(initial);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function del(slug: string) {
    setError(null);
    try {
      await api.deletePlugin(slug);
      setPlugins((prev) => prev.filter((p) => p.slug !== slug));
    } catch {
      setError("Failed to delete plugin.");
    } finally {
      setConfirming(null);
    }
  }

  if (plugins.length === 0) {
    return <p className="text-sm text-muted">No approved plugins yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border border border-border">
      {error && <p className="text-sm text-red-600 p-3">{error}</p>}
      {plugins.map((plugin, i) => (
        <RevealItem key={plugin.id} index={i}>
          <div className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <Link href={`/plugin/${plugin.slug}`} className="font-medium hover:underline underline-offset-4">
                {plugin.name}
              </Link>
              <p className="text-sm text-muted mt-0.5">{plugin.summary}</p>
            </div>
            <div className="flex gap-2 items-center">
              {confirming === plugin.slug ? (
                <>
                  <span className="text-xs text-muted">Delete permanently?</span>
                  <button
                    onClick={() => del(plugin.slug)}
                    className="text-xs uppercase tracking-wide border border-red-600 bg-red-600 text-white px-3 py-1.5 hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="text-xs uppercase tracking-wide border border-border px-3 py-1.5 hover:border-foreground transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirming(plugin.slug)}
                  className="text-xs uppercase tracking-wide border border-foreground px-3 py-1.5 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </RevealItem>
      ))}
    </div>
  );
}
