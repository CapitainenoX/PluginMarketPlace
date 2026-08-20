"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { Plugin } from "@/lib/types";

export function ModerationQueue({ plugins: initial }: { plugins: Plugin[] }) {
  const [plugins, setPlugins] = useState(initial);

  async function act(slug: string, action: "approve" | "ban") {
    const fn = action === "approve" ? api.adminApprovePlugin : api.adminBanPlugin;
    await fn(slug).catch(() => undefined);
    setPlugins((prev) => prev.filter((p) => p.slug !== slug));
  }

  if (plugins.length === 0) {
    return <p className="text-sm text-muted">Nothing pending review.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border border border-border">
      {plugins.map((plugin) => (
        <div key={plugin.id} className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link href={`/plugin/${plugin.slug}`} className="font-medium hover:underline underline-offset-4">
              {plugin.name}
            </Link>
            <p className="text-sm text-muted mt-0.5">{plugin.summary}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => act(plugin.slug, "approve")}
              className="text-xs uppercase tracking-wide border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors cursor-pointer"
            >
              Approve
            </button>
            <button
              onClick={() => act(plugin.slug, "ban")}
              className="text-xs uppercase tracking-wide border border-foreground px-3 py-1.5 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors cursor-pointer"
            >
              Ban
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
