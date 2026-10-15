"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { highlightSentence } from "@/lib/grammar";
import type { Verb } from "@/lib/types";

type Props = {
  verb: Pick<Verb, "example_de" | "lemma" | "forms" | "separable" | "prefix">;
  /** Draw the sentence bracket (Satzklammer) between the two verb parts. */
  bracket?: boolean;
  className?: string;
};

/** The example sentence with the verb marked; separated parts are joined by a bracket. */
export function Sentence({ verb, bracket = true, className = "" }: Props) {
  const segs = highlightSentence(verb.example_de, verb.lemma, verb.forms, verb.separable);
  const box = useRef<HTMLParagraphElement>(null);
  const [path, setPath] = useState<{ d: string; w: number; h: number } | null>(null);
  const tone = verb.prefix ? (verb.separable ? "sep" : "insep") : "plain";

  useLayoutEffect(() => {
    if (!bracket) return;
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const open = el.querySelector<HTMLElement>("[data-role=verb]");
      const close = el.querySelector<HTMLElement>("[data-role=close]");
      if (!open || !close) return setPath(null);
      const base = el.getBoundingClientRect();
      const a = open.getBoundingClientRect();
      const b = close.getBoundingClientRect();
      if (Math.abs(a.bottom - b.bottom) > 4) return setPath(null); // wrapped onto two lines
      const y = a.bottom - base.top + 2;
      const x1 = a.left - base.left + a.width / 2;
      const x2 = b.left - base.left + b.width / 2;
      const drop = 7;
      setPath({ d: `M${x1} ${y} v${drop} H${x2} v${-drop}`, w: base.width, h: base.height + 12 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [bracket, verb.example_de]);

  return (
    <p ref={box} className={`sentence tone-${tone} ${path ? "has-bracket" : ""} ${className}`}>
      {segs.map((s, i) =>
        s.role ? (
          <mark key={i} data-role={s.role} className={`hl hl-${s.role}`}>
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
      {path && (
        <svg className="bracket" width={path.w} height={path.h} aria-hidden="true">
          <path d={path.d} />
        </svg>
      )}
    </p>
  );
}
