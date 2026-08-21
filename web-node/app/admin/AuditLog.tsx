"use client";

import { useLayoutEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import type { AuditLogEntry } from "@/lib/types";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AuditLog({ entries }: { entries: AuditLogEntry[] }) {
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  // Table rows can't be wrapped in RevealItem's <div> (invalid inside <tbody>),
  // so animate the <tr> elements directly with a staggered entrance instead.
  useLayoutEffect(() => {
    const tbody = tbodyRef.current;
    if (!tbody) return;
    const rows = tbody.querySelectorAll("tr");
    if (rows.length === 0) return;
    if (prefersReducedMotion()) {
      rows.forEach((row) => {
        row.style.opacity = "1";
        row.style.transform = "none";
      });
      return;
    }
    animate(rows, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 450,
      delay: stagger(40),
      ease: "outCubic",
    });
  }, [entries]);

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
        <tbody className="divide-y divide-border" ref={tbodyRef}>
          {entries.map((entry) => (
            <tr key={entry.id} style={{ opacity: 0, transform: "translateY(12px)" }}>
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
