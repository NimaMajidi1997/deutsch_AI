import { stressIndex } from "@/lib/grammar";
import type { Verb } from "@/lib/types";

type Props = {
  verb: Pick<Verb, "base" | "prefix" | "separable" | "stress" | "reflexive">;
  /** Show the gap between a separable prefix and its stem. */
  split?: boolean;
  className?: string;
};

/** The lemma with its prefix in grammar colour and the stressed vowel marked. */
export function Lemma({ verb, split = false, className = "" }: Props) {
  const { base, prefix, separable } = verb;
  const s = stressIndex(verb.stress);
  const cut = prefix ? prefix.length : 0;

  const marked = (text: string, offset: number) =>
    s >= offset && s < offset + text.length ? (
      <>
        {text.slice(0, s - offset)}
        <span className="stress">{text[s - offset]}</span>
        {text.slice(s - offset + 1)}
      </>
    ) : (
      text
    );

  return (
    <span className={`lemma ${split && separable ? "is-split" : ""} ${className}`}>
      {verb.reflexive && <span className="lemma-sich">sich </span>}
      {prefix && (
        <span className={separable ? "pfx-sep" : "pfx-insep"}>{marked(base.slice(0, cut), 0)}</span>
      )}
      <span className="lemma-stem">{marked(base.slice(cut), cut)}</span>
    </span>
  );
}

/** A conjugated form ("fährt um", "hat umgefahren") with the prefix coloured. */
export function Form({ text, prefix, separable }: { text: string; prefix: string | null; separable: boolean }) {
  if (!prefix) return <>{text}</>;
  const cls = separable ? "pfx-sep" : "pfx-insep";
  return (
    <>
      {text.split(/(\s+)/).map((w, i) => {
        const lw = w.toLowerCase();
        if (lw === prefix) return <span key={i} className={cls}>{w}</span>;
        if (lw.startsWith(prefix) && lw.length > prefix.length + 2)
          return (
            <span key={i}>
              <span className={cls}>{w.slice(0, prefix.length)}</span>
              {w.slice(prefix.length)}
            </span>
          );
        return <span key={i}>{w}</span>;
      })}
    </>
  );
}
