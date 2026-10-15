"use client";
import { useSaved } from "@/lib/store";

export function Star({ id, lemma }: { id: string; lemma: string }) {
  const { saved, toggle } = useSaved();
  const on = saved.includes(id);
  return (
    <button
      type="button"
      className={`star ${on ? "is-on" : ""}`}
      aria-pressed={on}
      aria-label={on ? `${lemma} von der Merkliste entfernen` : `${lemma} merken`}
      title={on ? "Gemerkt" : "Merken"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M6 3.5h12a.5.5 0 0 1 .5.5v16.2a.3.3 0 0 1-.48.24L12 16l-6.02 4.44a.3.3 0 0 1-.48-.24V4a.5.5 0 0 1 .5-.5z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
