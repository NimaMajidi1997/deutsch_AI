"use client";
import { useEnglish } from "@/lib/store";

/** Renders its children only while "Englisch zeigen" is on. */
export function EnglishOnly({ children }: { children: React.ReactNode }) {
  const { english } = useEnglish();
  return english ? <>{children}</> : null;
}

export function EnglishToggle() {
  const { english, setEnglish } = useEnglish();
  return (
    <label className="toggle">
      <input type="checkbox" checked={english} onChange={(e) => setEnglish(e.target.checked)} />
      <span>Englisch zeigen</span>
    </label>
  );
}
