import Link from "next/link";
import type { Plugin } from "@/lib/types";

export function PluginCard({ plugin }: { plugin: Plugin }) {
  return (
    <Link
      href={`/plugin/${plugin.slug}`}
      className="group border border-border p-6 flex flex-col gap-3 hover:border-foreground transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold group-hover:underline underline-offset-4">
          {plugin.name}
        </h3>
        <span className="text-xs text-muted whitespace-nowrap pt-1">
          {plugin.downloads_count.toLocaleString()} downloads
        </span>
      </div>
      <p className="text-sm text-muted leading-relaxed line-clamp-3">{plugin.summary}</p>
      {plugin.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-auto pt-2">
          {plugin.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[11px] uppercase tracking-wide border border-border px-2 py-0.5 text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
