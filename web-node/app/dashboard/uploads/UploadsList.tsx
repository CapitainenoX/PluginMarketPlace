"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Plugin } from "@/lib/types";
import { StatusBadge } from "@/components/plugins/StatusBadge";
import { VersionUploadForm } from "@/components/plugins/VersionUploadForm";

export function UploadsList({ plugins }: { plugins: Plugin[] }) {
  const router = useRouter();
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  return (
    <div className="flex flex-col divide-y divide-border border border-border">
      {plugins.map((plugin) => (
        <div key={plugin.id} className="p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <Link href={`/plugin/${plugin.slug}`} className="font-semibold hover:underline underline-offset-4">
                {plugin.name}
              </Link>
              <p className="text-sm text-muted mt-1">{plugin.summary}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={plugin.status} />
              <button
                onClick={() => setOpenSlug(openSlug === plugin.slug ? null : plugin.slug)}
                className="text-xs uppercase tracking-wide border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors cursor-pointer"
              >
                {openSlug === plugin.slug ? "Close" : "Add version"}
              </button>
            </div>
          </div>

          {plugin.versions && plugin.versions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {plugin.versions.map((v) => (
                <span key={v.id} className="text-xs border border-border px-2 py-1 flex items-center gap-2">
                  {v.version} <StatusBadge status={v.status} />
                </span>
              ))}
            </div>
          )}

          {openSlug === plugin.slug && (
            <div className="mt-6 border-t border-border pt-6">
              <VersionUploadForm slug={plugin.slug} onUploaded={() => router.refresh()} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
