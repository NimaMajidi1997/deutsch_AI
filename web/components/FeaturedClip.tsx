"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Verb } from "@/lib/types";
import { Lemma } from "./Lemma";

/** Plays every card video in turn; the next one starts when the current clip ends. */
export function FeaturedClip({ verbs }: { verbs: Verb[] }) {
  const [i, setI] = useState(0);
  const [reduced, setReduced] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const v = verbs[i];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!reduced) ref.current?.play().catch(() => {});
  }, [i, reduced]);

  if (!v) return null;
  const next = () => setI((n) => (n + 1) % verbs.length);

  return (
    <figure className="clip">
      <Link href={`/verb/${encodeURIComponent(v.id)}`} className="clip-frame" aria-label={`${v.lemma} öffnen`}>
        <video
          key={v.id}
          ref={ref}
          src={v.media.video!}
          poster={v.media.start ?? v.media.card ?? undefined}
          muted
          playsInline
          autoPlay={!reduced}
          onEnded={next}
          aria-hidden="true"
        />
      </Link>
      <figcaption className="clip-cap">
        <Lemma verb={v} className="clip-lemma" />
        <span className="clip-en">{v.meaning_en}</span>
        <span className="clip-dots" role="group" aria-label="Video wählen">
          {verbs.map((x, n) => (
            <button
              key={x.id}
              className={n === i ? "is-on" : ""}
              aria-label={x.lemma}
              aria-current={n === i}
              onClick={() => setI(n)}
            />
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
