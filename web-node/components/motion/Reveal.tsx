"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { animate } from "animejs";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  duration?: number;
};

/** Fades + slides a block in on mount. Hidden via inline style so there's no flash-then-hide. */
export function Reveal({ children, className, y = 20, delay = 0, duration = 650 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }
    animate(el, {
      opacity: [0, 1],
      translateY: [y, 0],
      duration,
      delay,
      ease: "outCubic",
    });
  }, [delay, duration, y]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0, transform: `translateY(${y}px)` }}>
      {children}
    </div>
  );
}

type RevealItemProps = {
  children: ReactNode;
  index?: number;
  y?: number;
  step?: number;
  className?: string;
};

/** Same as Reveal but meant for one item inside a .map() list — delay derives from index. */
export function RevealItem({ children, index = 0, y = 16, step = 60, className }: RevealItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }
    animate(el, {
      opacity: [0, 1],
      translateY: [y, 0],
      duration: 500,
      delay: index * step,
      ease: "outCubic",
    });
  }, [index, step, y]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0, transform: `translateY(${y}px)` }}>
      {children}
    </div>
  );
}
