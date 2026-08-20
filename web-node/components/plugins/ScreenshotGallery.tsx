"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import type { PluginImage } from "@/lib/types";

export function ScreenshotGallery({ images }: { images: PluginImage[] }) {
  const [active, setActive] = useState<PluginImage | null>(null);

  return (
    <section className="mt-10">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {images.map((img) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={img.id}
            src={api.imageUrl(img.url)}
            alt=""
            onClick={() => setActive(img)}
            className="h-40 w-auto border border-border object-cover shrink-0 cursor-zoom-in hover:border-foreground transition-colors"
          />
        ))}
      </div>

      {active && (
        <div
          onClick={() => setActive(null)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-8 z-50 cursor-zoom-out"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={api.imageUrl(active.url)}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </section>
  );
}
