import Link from "next/link";
import { api } from "@/lib/api-client";
import { PluginCard } from "@/components/plugins/PluginCard";
import { Reveal, RevealItem } from "@/components/motion/Reveal";

export default async function HomePage() {
  const [{ plugins }, { categories }] = await Promise.all([
    api.listPlugins({ limit: 6 }).catch(() => ({ plugins: [] })),
    api.categories().catch(() => ({ categories: [] })),
  ]);

  return (
    <div className="flex-1">
      <section className="border-b border-border">
        <Reveal className="max-w-6xl mx-auto px-6 py-28 flex flex-col gap-6" delay={0}>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl">
            Plugins for your Paper server, self-hosted.
          </h1>
          <p className="text-muted text-lg max-w-xl leading-relaxed">
            A minimal, self-hosted marketplace for Minecraft Paper plugins.
            Browse, publish, and version your work — no ads, no noise.
          </p>
          <div className="flex gap-4 mt-4">
            <Link
              href="/browse"
              className="bg-foreground text-background px-6 py-3 text-sm uppercase tracking-wide font-medium hover:bg-neutral-800 transition-colors"
            >
              Browse plugins
            </Link>
            <Link
              href="/register"
              className="border border-foreground px-6 py-3 text-sm uppercase tracking-wide font-medium hover:bg-foreground hover:text-background transition-colors"
            >
              Publish a plugin
            </Link>
          </div>
        </Reveal>
      </section>

      {categories.length > 0 && (
        <section className="border-b border-border">
          <Reveal className="max-w-6xl mx-auto px-6 py-16" delay={100}>
            <h2 className="text-xl font-semibold mb-8">Browse by category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categories.map((c, i) => (
                <RevealItem key={c.id} index={i}>
                  <Link
                    href={`/browse?category=${encodeURIComponent(c.slug)}`}
                    className="border border-border px-4 py-4 text-sm hover:border-foreground transition-colors block"
                  >
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted mt-1 line-clamp-1">{c.description}</div>
                  </Link>
                </RevealItem>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      <section>
        <Reveal className="max-w-6xl mx-auto px-6 py-20" delay={200}>
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-xl font-semibold">Recently added</h2>
            <Link href="/browse" className="text-sm text-muted hover:text-foreground transition-colors">
              View all &rarr;
            </Link>
          </div>
          {plugins.length === 0 ? (
            <p className="text-muted text-sm">No plugins published yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {plugins.map((p, i) => (
                <RevealItem key={p.id} index={i}>
                  <PluginCard plugin={p} />
                </RevealItem>
              ))}
            </div>
          )}
        </Reveal>
      </section>
    </div>
  );
}
