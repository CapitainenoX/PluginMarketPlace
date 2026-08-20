import { redirect } from "next/navigation";
import { api, currentUserOrNull } from "@/lib/api-client";
import { ModerationQueue } from "./ModerationQueue";
import { AuditLog } from "./AuditLog";

export default async function AdminPage() {
  const user = await currentUserOrNull();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/dashboard");

  const [pendingResult, auditResult] = await Promise.all([
    api.adminListPlugins({ status: "pending", limit: 100 }).catch(() => ({ plugins: [] })),
    api.adminAuditLog({ limit: 50 }).catch(() => ({ entries: [] })),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 w-full flex flex-col gap-16">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin</h1>
        <p className="text-muted text-sm">Moderation queue and audit log.</p>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-6">Pending review</h2>
        <ModerationQueue plugins={pendingResult.plugins} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-6">Audit log</h2>
        <AuditLog entries={auditResult.entries} />
      </section>
    </div>
  );
}
