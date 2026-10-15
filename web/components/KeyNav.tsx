"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** ← and → step through verbs, like turning pages in a picture book. */
export function KeyNav({ prev, next }: { prev: string; next: string }) {
  const router = useRouter();
  useEffect(() => {
    router.prefetch(prev);
    router.prefetch(next);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowLeft") router.push(prev);
      if (e.key === "ArrowRight") router.push(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);
  return null;
}
