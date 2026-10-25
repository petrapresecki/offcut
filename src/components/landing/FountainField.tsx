"use client";

import { useEffect, useRef } from "react";

/**
 * A split-fountain print: three risograph inks blended on one roller, with the grain a
 * riso drum leaves. Moving the pointer rolls the inks a little, as if the roller were
 * still turning. Children sit on top.
 */
export function FountainField({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let target = 0.5;
    let current = 0.5;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      const r = node.getBoundingClientRect();
      target = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      if (!frame) frame = requestAnimationFrame(tick);
    };
    // Eases toward the pointer, so the inks drift rather than jump.
    const tick = () => {
      current += (target - current) * 0.08;
      node.style.setProperty("--roll", current.toFixed(4));
      frame = Math.abs(target - current) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={el} className={`fountain relative overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
