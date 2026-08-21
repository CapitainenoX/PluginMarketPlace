import { redirect } from "next/navigation";
import { api, currentUserOrNull } from "@/lib/api-client";
import { ModerationQueue } from "./ModerationQueue";
import { ApprovedPluginsList } from "./ApprovedPluginsList";
import { AuditLog } from "./AuditLog";
import { Reveal } from "@/components/motion/Reveal";

export default async function AdminPage() {
  const user = await currentUserOrNull();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/dashboard");

  const [pendingResult, approvedResult, auditResult] = await Promise.all([
    api.adminListPlugins({ status: "pending", limit: 100 }).catch(() => ({ plugins: [] })),
    api.adminListPlugins({ status: "approved", limit: 100 }).catch(() => ({ plugins: [] })),
    api.adminAuditLog({ limit: 50 }).catch(() => ({ entries: [] })),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 w-full flex flex-col gap-16">
      <Reveal delay={0}>
        <h1 className="text-3xl font-bold mb-2">Admin</h1>
        <p className="text-muted text-sm">Moderation queue and audit log.</p>
      </Reveal>

      <Reveal delay={100}>
        <section>
          <h2 className="text-xl font-semibold mb-6">Pending review</h2>
          <ModerationQueue plugins={pendingResult.plugins} />
        </section>
      </Reveal>

      <Reveal delay={200}>
        <section>
          <h2 className="text-xl font-semibold mb-6">Approved plugins</h2>
          <p className="text-sm text-muted mb-4">
            Delete a plugin that&apos;s already live &mdash; e.g. its description or a
            version&apos;s changelog was found to carry a suspicious link or abusive
            content after approval.
          </p>
          <ApprovedPluginsList plugins={approvedResult.plugins} />
        </section>
      </Reveal>

      <Reveal delay={300}>
        <section>
          <h2 className="text-xl font-semibold mb-6">Audit log</h2>
          <AuditLog entries={auditResult.entries} />
        </section>
      </Reveal>
    </div>
  );
}
