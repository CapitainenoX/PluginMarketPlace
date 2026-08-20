import Link from "next/link";
import { api, currentUserOrNull } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";

export default async function DashboardPage() {
  const [user, { plugins }] = await Promise.all([
    currentUserOrNull(),
    api.dashboardUploads().catch(() => ({ plugins: [] })),
  ]);

  const totalDownloads = plugins.reduce((sum, p) => sum + p.downloads_count, 0);
  const approved = plugins.filter((p) => p.status === "approved").length;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user?.username}</h1>
        <p className="text-muted mt-1">{user?.email}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-3xl font-bold">{plugins.length}</p>
          <p className="text-xs uppercase tracking-wide text-muted mt-1">Plugins</p>
        </Card>
        <Card>
          <p className="text-3xl font-bold">{approved}</p>
          <p className="text-xs uppercase tracking-wide text-muted mt-1">Approved</p>
        </Card>
        <Card>
          <p className="text-3xl font-bold">{totalDownloads.toLocaleString()}</p>
          <p className="text-xs uppercase tracking-wide text-muted mt-1">Downloads</p>
        </Card>
      </div>

      <div className="flex gap-4">
        <Link
          href="/dashboard/upload"
          className="bg-foreground text-background px-5 py-2.5 text-sm uppercase tracking-wide font-medium hover:bg-neutral-800 transition-colors"
        >
          Publish a plugin
        </Link>
        <Link
          href="/dashboard/uploads"
          className="border border-foreground px-5 py-2.5 text-sm uppercase tracking-wide font-medium hover:bg-foreground hover:text-background transition-colors"
        >
          View my plugins
        </Link>
      </div>
    </div>
  );
}
