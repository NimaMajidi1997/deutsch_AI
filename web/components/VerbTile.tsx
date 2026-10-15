"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type { Verb } from "@/lib/types";
import { Form, Lemma } from "./Lemma";
import { Star } from "./Star";

type Props = {
  verb: Verb;
  english: boolean;
  size?: "m" | "l";
  priority?: boolean;
};

/** Image first; hovering (or focusing) plays the video preview, or shows the sentence. */
export function VerbTile({ verb, english, size = "m", priority = false }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const hasVideo = !!verb.media.video;

  const start = () => {
    const v = video.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().then(() => setPlaying(true)).catch(() => {});
  };
  const stop = () => {
    video.current?.pause();
    setPlaying(false);
  };

  return (
    <article
      className={`tile tile-${size} ${playing ? "is-playing" : ""}`}
      onPointerEnter={(e) => e.pointerType === "mouse" && start()}
      onPointerLeave={stop}
    >
      <Link href={`/verb/${encodeURIComponent(verb.id)}`} className="tile-link" onFocus={start} onBlur={stop}>
      <div className="tile-media">
        {verb.media.card ? (
          <Image
            src={verb.media.card}
            alt={verb.example_de}
            fill
            sizes={size === "l" ? "(max-width: 700px) 100vw, 50vw" : "(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"}
            priority={priority}
          />
        ) : (
          <div className="tile-missing">Bild folgt</div>
        )}
        {hasVideo && (
          <video
            ref={video}
            className="tile-video"
            src={verb.media.video!}
            poster={verb.media.start ?? undefined}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
          />
        )}
        <p className="tile-sentence" aria-hidden="true">
          {verb.example_de}
        </p>
        {hasVideo && (
          <span className="motion-badge" title="Mit Video">
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
            </svg>
            <span className="sr-only">Mit Video</span>
          </span>
        )}
      </div>
      <div className="tile-text">
        <h3 className="tile-lemma">
          <Lemma verb={verb} />
        </h3>
        <p className="tile-perfekt">
          <Form text={verb.forms.perfekt} prefix={verb.prefix} separable={verb.separable} />
        </p>
        {english && <p className="tile-en">{verb.meaning_en}</p>}
      </div>
      </Link>
      <Star id={verb.id} lemma={verb.lemma} />
    </article>
  );
}
