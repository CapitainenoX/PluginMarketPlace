"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import type { Loader, PluginVersion } from "@/lib/types";

const LOADER_LABEL: Record<Loader, string> = {
  paper: "Paper",
  spigot: "Spigot",
  bukkit: "Bukkit",
};

type Step = "closed" | "version" | "loader";

export function DownloadPanel({ versions }: { versions: PluginVersion[] }) {
  const [step, setStep] = useState<Step>("closed");
  const [selected, setSelected] = useState<PluginVersion | null>(null);

  const approved = versions.filter((v) => v.status === "approved");
  if (approved.length === 0) return null;

  function pickVersion(v: PluginVersion) {
    setSelected(v);
    setStep("loader");
  }

  function confirmLoader(loader: Loader) {
    if (!selected) return;
    window.location.href = `${api.downloadUrl(selected.id)}?loader=${loader}`;
    setStep("closed");
    setSelected(null);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setStep(step === "closed" ? "version" : "closed")}
        className="bg-foreground text-background px-6 py-3 text-sm uppercase tracking-wide font-medium hover:bg-neutral-800 transition-colors whitespace-nowrap"
      >
        Download
      </button>

      {step !== "closed" && (
        <div className="absolute right-0 mt-2 w-80 border border-foreground bg-background shadow-lg z-10">
          {step === "version" && (
            <div className="flex flex-col">
              <div className="px-4 py-3 border-b border-border text-xs uppercase tracking-wide text-muted">
                1. Choose a version
              </div>
              <div className="max-h-72 overflow-y-auto">
                {approved.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => pickVersion(v)}
                    className="w-full text-left px-4 py-3 hover:bg-neutral-100 border-b border-border last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-sm">{v.version}</span>
                      <span className="text-xs text-muted">
                        MC {v.mc_version_min}
                        {v.mc_version_max && v.mc_version_max !== v.mc_version_min ? `–${v.mc_version_max}` : ""}
                      </span>
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {v.loaders.map((l) => LOADER_LABEL[l]).join(", ")}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "loader" && selected && (
            <div className="flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-muted">
                  2. Choose a loader for {selected.version}
                </span>
                <button
                  onClick={() => setStep("version")}
                  className="text-xs text-muted hover:text-foreground"
                >
                  Back
                </button>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {selected.loaders.map((l) => (
                  <button
                    key={l}
                    onClick={() => confirmLoader(l)}
                    className="border border-border px-4 py-2.5 text-sm text-left hover:border-foreground hover:bg-neutral-100 transition-colors"
                  >
                    {LOADER_LABEL[l]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
