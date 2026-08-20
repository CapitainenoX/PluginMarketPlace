import Link from "next/link";
import { api } from "@/lib/api-client";
import { UploadsList } from "./UploadsList";

export default async function UploadsPage() {
  const { plugins } = await api.dashboardUploads().catch(() => ({ plugins: [] }));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-2xl font-bold">My plugins</h1>
        <Link href="/dashboard/upload" className="text-sm underline underline-offset-4">
          + Publish new plugin
        </Link>
      </div>

      {plugins.length === 0 ? (
        <p className="text-muted text-sm">You haven&apos;t published any plugins yet.</p>
      ) : (
        <UploadsList plugins={plugins} />
      )}
    </div>
  );
}
