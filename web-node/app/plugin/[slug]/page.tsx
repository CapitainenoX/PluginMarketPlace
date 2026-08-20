import { notFound } from "next/navigation";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/plugins/StatusBadge";
import { DownloadPanel } from "@/components/plugins/DownloadPanel";
import { ScreenshotGallery } from "@/components/plugins/ScreenshotGallery";

export default async function PluginDetailPage({ params }: PageProps<"/plugin/[slug]">) {
  const { slug } = await params;

  const [plugin, versionsResult, imagesResult] = await Promise.all([
    api.getPlugin(slug).catch(() => null),
    api.listVersions(slug).catch(() => ({ versions: [] })),
    api.listImages(slug).catch(() => ({ images: [] })),
  ]);

  if (!plugin) notFound();

  const versions = [...versionsResult.versions].sort((a, b) => b.id - a.id);
  const icon = imagesResult.images.find((i) => i.kind === "icon");
  const screenshots = imagesResult.images.filter((i) => i.kind === "screenshot");

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 w-full">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-start gap-5">
          {icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={api.imageUrl(icon.url)}
              alt=""
              className="w-16 h-16 border border-border object-cover shrink-0"
            />
          )}
          <div>
            <h1 className="text-4xl font-bold mb-2">{plugin.name}</h1>
            <p className="text-muted text-lg">{plugin.summary}</p>
          </div>
        </div>
        <DownloadPanel versions={versions} />
      </div>

      {screenshots.length > 0 && <ScreenshotGallery images={screenshots} />}

      <div className="flex flex-wrap gap-6 mt-6 text-sm text-muted border-y border-border py-4">
        <span>{plugin.downloads_count.toLocaleString()} downloads</span>
        <span>{versions.length} version{versions.length === 1 ? "" : "s"}</span>
        <span>Updated {new Date(plugin.updated_at).toLocaleDateString()}</span>
        <StatusBadge status={plugin.status} />
      </div>

      {plugin.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-6">
          {plugin.tags.map((tag) => (
            <span key={tag} className="text-xs uppercase tracking-wide border border-border px-2.5 py-1 text-muted">
              {tag}
            </span>
          ))}
        </div>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Description</h2>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {plugin.description || "No description provided."}
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Versions</h2>
        {versions.length === 0 ? (
          <p className="text-sm text-muted">No versions published yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border border border-border">
            {versions.map((v) => (
              <div key={v.id} className="p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{v.version}</span>
                    <span className="text-xs text-muted">
                      MC {v.mc_version_min}
                      {v.mc_version_max && v.mc_version_max !== v.mc_version_min ? ` - ${v.mc_version_max}` : ""}
                    </span>
                    <StatusBadge status={v.status} />
                  </div>
                  {v.status === "approved" && (
                    <a
                      href={api.downloadUrl(v.id)}
                      className="text-xs uppercase tracking-wide border border-foreground px-3 py-1.5 hover:bg-foreground hover:text-background transition-colors"
                    >
                      Download
                    </a>
                  )}
                </div>
                {v.changelog && (
                  <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">{v.changelog}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {v.loaders.map((l) => (
                    <span key={l} className="text-[11px] uppercase tracking-wide border border-border px-2 py-0.5 text-muted">
                      {l}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-muted">
                  {(v.file_size / 1024 / 1024).toFixed(2)} MB &middot; {v.downloads_count.toLocaleString()} downloads
                  &middot; {new Date(v.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
