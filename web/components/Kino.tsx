"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { leastRecentlySeen, markSeen, useEnglish } from "@/lib/store";
import type { Verb } from "@/lib/types";
import { Lemma } from "./Lemma";
import { Sentence } from "./Sentence";

const STILL_MS = 8000;
const VIDEO_HOLD_MS = 1000; // last frame stays after a video ends

/**
 * A lean-back slideshow: the picture comes first, then the word, then the sentence.
 * Videos play to the end before moving on. Each show starts with the cards watched least
 * recently (never-seen first), so reopening it brings new verbs before the review.
 */
export function Kino({ verbs: given }: { verbs: Verb[] }) {
  const [verbs, setVerbs] = useState<Verb[] | null>(null);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [phase, setPhase] = useState(0); // 0 picture, 1 word, 2 sentence
  const [ended, setEnded] = useState(false);
  const { english, setEnglish } = useEnglish();
  const video = useRef<HTMLVideoElement>(null);
  const count = verbs?.length ?? 0;
  const v = verbs?.[i];

  // Order once per opening (localStorage is client-only); it stays fixed while the show runs.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVerbs(leastRecentlySeen(given));
    setI(0);
  }, [given]);

  const go = useCallback((d: number) => setI((n) => (count ? (n + d + count) % count : 0)), [count]);

  // Reveal word and sentence step by step for each new slide.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase(0);
    setEnded(false);
    const a = setTimeout(() => setPhase(1), 1200);
    const b = setTimeout(() => setPhase(2), 2600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [i, verbs]);

  // A card counts as seen once its sentence has been on screen.
  useEffect(() => {
    if (phase >= 2 && v) markSeen(v.id);
  }, [phase, v]);

  // Stills advance on a timer; videos shortly after they end.
  useEffect(() => {
    if (!playing || !v || (v.media.video && !ended)) return;
    const t = setTimeout(() => go(1), v.media.video ? VIDEO_HOLD_MS : STILL_MS);
    return () => clearTimeout(t);
  }, [i, playing, v, ended, go]);

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

  if (!verbs) return <div className="kino" />;

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
            onEnded={() => setEnded(true)}
            aria-label={v.example_de}
          />
        ) : v.media.card ? (
          <Image src={v.media.card} alt={v.example_de} fill sizes="100vw" priority className="kino-img" />
        ) : null}
        {/* Next picture warms up in the background. */}
        {verbs[(i + 1) % count].media.card && (
          <Image src={verbs[(i + 1) % count].media.card!} alt="" fill sizes="100vw" className="kino-preload" />
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
          {i + 1} / {count}
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
            style={{ animationDuration: `${STILL_MS}ms`, width: `${((i + 1) / count) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
