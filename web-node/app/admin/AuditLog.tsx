import type { AuditLogEntry } from "@/lib/types";

export function AuditLog({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted">No audit log entries yet.</p>;
  }

  return (
    <div className="overflow-x-auto border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="p-3 font-medium">Time</th>
            <th className="p-3 font-medium">Action</th>
            <th className="p-3 font-medium">Target</th>
            <th className="p-3 font-medium">User</th>
            <th className="p-3 font-medium">IP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="p-3 whitespace-nowrap text-muted">
                {new Date(entry.created_at).toLocaleString()}
              </td>
              <td className="p-3 font-mono text-xs">{entry.action}</td>
              <td className="p-3 text-muted">
                {entry.target_type}#{entry.target_id}
              </td>
              <td className="p-3 text-muted">{entry.user_id ?? "-"}</td>
              <td className="p-3 text-muted">{entry.ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
