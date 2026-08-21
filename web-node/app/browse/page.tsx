import { Suspense } from "react";
import { api } from "@/lib/api-client";
import { PluginCard } from "@/components/plugins/PluginCard";
import { BrowseFilters } from "@/components/plugins/BrowseFilters";
import { Reveal, RevealItem } from "@/components/motion/Reveal";

async function Results({ q, category }: { q?: string; category?: string }) {
  const { plugins } = await api
    .listPlugins({ q, category, limit: 50 })
    .catch(() => ({ plugins: [] }));

  if (plugins.length === 0) {
    return <p className="text-muted text-sm">No plugins match your search.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {plugins.map((p, i) => (
        <RevealItem key={p.id} index={i}>
          <PluginCard plugin={p} />
        </RevealItem>
      ))}
    </div>
  );
}

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;

  const { categories } = await api.categories().catch(() => ({ categories: [] }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-16 w-full">
      <Reveal delay={0}>
        <h1 className="text-3xl font-bold mb-10">Browse plugins</h1>
        <Suspense>
          <BrowseFilters categories={categories} />
        </Suspense>
      </Reveal>
      <Suspense fallback={<p className="text-muted text-sm">Loading...</p>}>
        <Results q={q} category={category} />
      </Suspense>
    </div>
  );
}
