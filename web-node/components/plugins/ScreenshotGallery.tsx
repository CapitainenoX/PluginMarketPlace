"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { api } from "@/lib/api-client";
import type { PluginImage } from "@/lib/types";
import { RevealItem } from "@/components/motion/Reveal";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ScreenshotGallery({ images }: { images: PluginImage[] }) {
  const [active, setActive] = useState<PluginImage | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    const img = imgRef.current;
    if (!active || !overlay || !img) return;
    if (prefersReducedMotion()) {
      overlay.style.opacity = "1";
      img.style.opacity = "1";
      img.style.transform = "none";
      return;
    }
    overlay.style.opacity = "0";
    img.style.opacity = "0";
    img.style.transform = "scale(0.94)";
    animate(overlay, { opacity: [0, 1], duration: 180, ease: "outCubic" });
    animate(img, {
      opacity: [0, 1],
      scale: [0.94, 1],
      duration: 220,
      ease: "outCubic",
    });
  }, [active]);

  return (
    <section className="mt-10">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <RevealItem key={img.id} index={i} className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={api.imageUrl(img.url)}
              alt=""
              onClick={() => setActive(img)}
              className="h-40 w-auto border border-border object-cover cursor-zoom-in hover:border-foreground transition-colors"
            />
          </RevealItem>
        ))}
      </div>

      {active && (
        <div
          ref={overlayRef}
          onClick={() => setActive(null)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-8 z-50 cursor-zoom-out"
          style={{ opacity: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={api.imageUrl(active.url)}
            alt=""
            className="max-w-full max-h-full object-contain"
            style={{ opacity: 0, transform: "scale(0.94)" }}
          />
        </div>
      )}
    </section>
  );
}
