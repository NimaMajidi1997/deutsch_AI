"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEnglish } from "@/lib/store";
import type { Verb } from "@/lib/types";
import { Lemma } from "./Lemma";
import { Sentence } from "./Sentence";

const STILL_MS = 7000;

/**
 * A lean-back slideshow: the picture comes first, then the word, then the sentence.
 * Videos play to the end before moving on.
 */
export function Kino({ verbs }: { verbs: Verb[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [phase, setPhase] = useState(0); // 0 picture, 1 word, 2 sentence
  const { english, setEnglish } = useEnglish();
  const video = useRef<HTMLVideoElement>(null);
  const v = verbs[i];

  const go = useCallback((d: number) => setI((n) => (n + d + verbs.length) % verbs.length), [verbs.length]);

  // Reveal word and sentence step by step for each new slide.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase(0);
    const a = setTimeout(() => setPhase(1), 1200);
    const b = setTimeout(() => setPhase(2), 2600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [i]);

  // Stills advance on a timer; videos advance when they end (see onEnded).
  useEffect(() => {
    if (!playing || v?.media.video) return;
    const t = setTimeout(() => go(1), STILL_MS);
    return () => clearTimeout(t);
  }, [i, playing, v, go]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (playing) el.play().catch(() => {});
    else el.pause();
  }, [playing, i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "Enter") setPhase(2);
      else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (!v) {
    return (
      <div className="kino kino-empty">
        <p>Keine Verben ausgewählt.</p>
        <Link href="/#entdecken">Zurück zur Übersicht</Link>
      </div>
    );
  }

  return (
    <div className="kino">
      <div className="kino-stage" key={v.id}>
        {v.media.video ? (
          <video
            ref={video}
            src={v.media.video}
            poster={v.media.start ?? v.media.card ?? undefined}
            muted
            playsInline
            autoPlay={playing}
            onEnded={() => (playing ? go(1) : undefined)}
            aria-label={v.example_de}
          />
        ) : v.media.card ? (
          <Image src={v.media.card} alt={v.example_de} fill sizes="100vw" priority className="kino-img" />
        ) : null}
        {/* Next picture warms up in the background. */}
        {verbs[(i + 1) % verbs.length].media.card && (
          <Image src={verbs[(i + 1) % verbs.length].media.card!} alt="" fill sizes="100vw" className="kino-preload" />
        )}
      </div>

      <div className="kino-caption" aria-live="polite">
        <h1 className={`kino-word ${phase >= 1 ? "is-in" : ""}`}>
          <Link href={`/verb/${encodeURIComponent(v.id)}`}>
            <Lemma verb={v} />
          </Link>
        </h1>
        <div className={`kino-sentence ${phase >= 2 ? "is-in" : ""}`}>
          <Sentence verb={v} bracket={phase >= 2} />
          {english && <p className="kino-en">{v.example_en}</p>}
        </div>
      </div>

      <div className="kino-bar">
        <Link href="/#entdecken" className="kino-btn">
          Schließen
        </Link>
        <span className="kino-pos">
          {i + 1} / {verbs.length}
        </span>
        <div className="kino-ctrl">
          <button className="kino-btn" onClick={() => go(-1)} aria-label="Vorheriges Bild">
            ‹
          </button>
          <button className="kino-btn kino-play" onClick={() => setPlaying((p) => !p)}>
            {playing ? "Pause" : "Weiter"}
          </button>
          <button className="kino-btn" onClick={() => go(1)} aria-label="Nächstes Bild">
            ›
          </button>
        </div>
        <label className="toggle toggle-dark">
          <input type="checkbox" checked={english} onChange={(e) => setEnglish(e.target.checked)} />
          <span>Englisch</span>
        </label>
        <div className="kino-progress" aria-hidden="true">
          <span
            key={`${v.id}-${playing}`}
            className={playing && !v.media.video ? "is-running" : ""}
            style={{ animationDuration: `${STILL_MS}ms`, width: `${((i + 1) / verbs.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
