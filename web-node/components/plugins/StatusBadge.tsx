const labels: Record<string, string> = {
  approved: "Approved",
  pending: "Pending review",
  pending_scan: "Pending scan",
  hidden: "Hidden",
  banned: "Banned",
  rejected: "Rejected",
  completed: "Completed",
};

export function StatusBadge({ status }: { status: string }) {
  const isPositive = status === "approved" || status === "completed";
  const isNegative = status === "banned" || status === "rejected";
  return (
    <span
      className={`text-[11px] uppercase tracking-wide px-2 py-0.5 border ${
        isNegative
          ? "border-foreground bg-foreground text-background"
          : isPositive
            ? "border-foreground"
            : "border-border text-muted"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}
