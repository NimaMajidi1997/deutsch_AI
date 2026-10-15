"use client";
import { useEnglish } from "@/lib/store";
import type { Verb } from "@/lib/types";
import { VerbTile } from "./VerbTile";

export function VerbStrip({ verbs, large = false }: { verbs: Verb[]; large?: boolean }) {
  const { english } = useEnglish();
  return (
    <div className={large ? "grid grid-l" : "grid"}>
      {verbs.map((v) => (
        <VerbTile key={v.id} verb={v} english={english} size={large ? "l" : "m"} />
      ))}
    </div>
  );
}
