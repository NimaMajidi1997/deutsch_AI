"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Verb } from "@/lib/types";

type View = "bild" | "video" | "vorher";

/** The big picture on a verb page: image, video on hover, and a before/after slider. */
export function MediaStage({ verb }: { verb: Verb }) {
  const { card, start, video } = verb.media;
  const [view, setView] = useState<View>("bild");
  const [cut, setCut] = useState(50);
  const ref = useRef<HTMLVideoElement>(null);
  const views: { id: View; label: string }[] = [
    { id: "bild", label: "Bild" },
    ...(video ? [{ id: "video" as View, label: "Video" }] : []),
    ...(start && card ? [{ id: "vorher" as View, label: "Vorher und nachher" }] : []),
  ];

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (view === "video") {
      v.currentTime = 0;
      v.play().catch(() => {});
    } else v.pause();
  }, [view]);

  return (
    <div className="stage-wrap">
      <div
        className={`stage view-${view}`}
        onPointerEnter={(e) => view === "bild" && video && e.pointerType === "mouse" && setView("video")}
        onPointerLeave={(e) => e.pointerType === "mouse" && view === "video" && setView("bild")}
      >
        {card && (
          <Image src={card} alt={verb.example_de} fill priority sizes="(max-width: 900px) 100vw, 62vw" className="stage-img" />
        )}
        {video && (
          <video
            ref={ref}
            className="stage-video"
            src={video}
            poster={start ?? card ?? undefined}
            muted
            loop
            playsInline
            preload="metadata"
            controls={view === "video"}
            aria-label={`Video: ${verb.example_de}`}
          />
        )}
        {view === "vorher" && start && card && (
          <div className="ba" style={{ ["--cut" as string]: `${cut}%` }}>
            <Image src={start} alt="Vorher" fill sizes="(max-width: 900px) 100vw, 62vw" className="ba-before" />
            <span className="ba-line" aria-hidden="true" />
            <span className="ba-tag ba-tag-l">vorher</span>
            <span className="ba-tag ba-tag-r">nachher</span>
            <input
              type="range"
              min={0}
              max={100}
              value={cut}
              onChange={(e) => setCut(+e.target.value)}
              aria-label="Vorher und nachher vergleichen"
            />
          </div>
        )}
        {!card && <div className="tile-missing">Bild folgt</div>}
      </div>

      {views.length > 1 && (
        <div className="stage-tabs" role="tablist" aria-label="Ansicht">
          {views.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              className={`lens ${view === v.id ? "is-on" : ""}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
