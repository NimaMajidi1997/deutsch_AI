"use client";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { fold } from "@/lib/grammar";
import { useEnglish, useSaved } from "@/lib/store";
import { PREFIX_NOTES, WORLDS } from "@/lib/taxonomy";
import type { Verb } from "@/lib/types";
import { Lemma } from "./Lemma";
import { VerbTile } from "./VerbTile";

type LensId = "welten" | "praefixe" | "familien" | "paare" | "az";
const LENSES: { id: LensId; label: string; hint: string }[] = [
  { id: "welten", label: "Bildwelten", hint: "Verben aus derselben Szene stehen zusammen." },
  { id: "praefixe", label: "Präfixe", hint: "Was das Präfix mit dem Bild macht: links trennbar, rechts untrennbar." },
  { id: "familien", label: "Wortfamilien", hint: "Ein Stamm, viele Bilder: fahren, umfahren, durchfahren." },
  { id: "paare", label: "Doppelgänger", hint: "Gleich geschrieben, anders betont, anderes Bild." },
  { id: "az", label: "A bis Z", hint: "Alle Verben alphabetisch." },
];

type FilterId = "sep" | "insep" | "sein" | "video" | "saved";
const FILTERS: { id: FilterId; label: string; test: (v: Verb, saved: string[]) => boolean }[] = [
  { id: "sep", label: "trennbar", test: (v) => !!v.prefix && v.separable },
  { id: "insep", label: "untrennbar", test: (v) => !!v.prefix && !v.separable },
  { id: "sein", label: "Perfekt mit sein", test: (v) => v.aux !== "haben" },
  { id: "video", label: "mit Video", test: (v) => !!v.media.video },
  { id: "saved", label: "Merkliste", test: (v, saved) => saved.includes(v.id) },
];

type Group = { key: string; title: React.ReactNode; note?: React.ReactNode; verbs: Verb[]; split?: [Verb[], Verb[]]; pairs?: [Verb, Verb][] };

const TWO_WAY = ["durch", "um", "über", "unter", "wider"];

function groupBy(lens: LensId, verbs: Verb[], all: Verb[]): Group[] {
  if (lens === "welten") {
    return WORLDS.map((w) => ({
      key: w.id,
      title: w.name,
      note: w.hint,
      verbs: verbs.filter((v) => v.world === w.id),
    }));
  }

  if (lens === "praefixe") {
    const keys = [...new Set(verbs.map((v) => v.prefix ?? ""))];
    const rank = (k: string) => (TWO_WAY.includes(k) ? 0 : !k ? 3 : verbs.some((v) => v.prefix === k && v.separable) ? 1 : 2);
    keys.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "de"));
    return keys.map((k) => {
      const members = verbs.filter((v) => (v.prefix ?? "") === k);
      const notes = PREFIX_NOTES[k];
      const sep = members.filter((v) => v.separable);
      const insep = members.filter((v) => !v.separable);
      const twoWay = TWO_WAY.includes(k);
      return {
        key: k || "none",
        title: k ? (
          <span className="prefix-title">
            {(twoWay || sep.length > 0) && <span className="pfx-sep">{k}-</span>}
            {twoWay && <span className="prefix-or"> / </span>}
            {(twoWay || (insep.length > 0 && !sep.length)) && <span className="pfx-insep">{k}-</span>}
          </span>
        ) : (
          "Ohne Präfix"
        ),
        note: k ? (
          twoWay ? (
            <span className="note-two">
              <span><b className="pfx-sep">trennbar</b> {notes?.sep}</span>
              <span><b className="pfx-insep">untrennbar</b> {notes?.insep}</span>
            </span>
          ) : (
            notes?.sep ?? notes?.insep
          )
        ) : (
          "Das Bild trägt die ganze Bedeutung."
        ),
        verbs: members,
        split: twoWay ? [sep, insep] : undefined,
      };
    });
  }

  if (lens === "familien") {
    const byStem = new Map<string, Verb[]>();
    for (const v of verbs) byStem.set(v.stem, [...(byStem.get(v.stem) ?? []), v]);
    const families = [...byStem.entries()]
      .filter(([, vs]) => vs.length > 1)
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "de"));
    const single = [...byStem.values()].filter((vs) => vs.length === 1).flat();
    return [
      ...families.map(([stem, vs]) => {
        const root = all.find((v) => v.base === stem);
        return {
          key: stem,
          title: <span className="family-title">{stem}</span>,
          note: root ? "Das Grundverb ist selbst eine Karte." : `${vs.length} Verben mit dem Stamm „${stem}“`,
          verbs: vs.sort((a, b) => (a.prefix ? 1 : 0) - (b.prefix ? 1 : 0)),
        };
      }),
      { key: "single", title: "Noch ohne Familie", note: "Hier fehlt noch ein Verwandter.", verbs: single },
    ];
  }

  if (lens === "paare") {
    const seen = new Set<string>();
    const pairs: [Verb, Verb][] = [];
    for (const v of verbs) {
      if (!v.pair || seen.has(v.id)) continue;
      const other = all.find((o) => o.id === v.pair);
      if (!other) continue;
      seen.add(v.id).add(other.id);
      pairs.push(v.separable ? [v, other] : [other, v]);
    }
    const opposites = verbs.filter((v) => v.tags.includes("Gegensatzpaar"));
    const groups: Group[] = [
      {
        key: "betonung",
        title: "Betonung entscheidet",
        note: (
          <>
            Der Punkt zeigt die Betonung: links auf dem Präfix (<b className="pfx-sep">trennbar</b>), rechts auf
            dem Stamm (<b className="pfx-insep">untrennbar</b>).
          </>
        ),
        verbs: pairs.flat(),
        pairs,
      },
    ];
    if (opposites.length > 1)
      groups.push({ key: "gegensatz", title: "Gegensätze", note: "Ein Präfix dreht das Bild um.", verbs: opposites });
    return groups;
  }

  const letters = [...new Set(verbs.map((v) => v.base[0].toUpperCase().replace("Ü", "U").replace("Ö", "O").replace("Ä", "A")))];
  return letters.sort().map((l) => ({
    key: l,
    title: l,
    verbs: verbs.filter((v) => fold(v.base[0]).toUpperCase().startsWith(l)),
  }));
}

export function Explorer({ verbs }: { verbs: Verb[] }) {
  const [lens, setLens] = useState<LensId>("welten");
  const [filters, setFilters] = useState<FilterId[]>([]);
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query);
  const { saved } = useSaved();
  const { english, setEnglish } = useEnglish();

  // Restore the lens from the URL (?lens=paare) so views can be shared.
  useEffect(() => {
    const l = new URLSearchParams(window.location.search).get("lens") as LensId | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (l && LENSES.some((x) => x.id === l)) setLens(l);
  }, []);
  const chooseLens = (l: LensId) => {
    setLens(l);
    const url = new URL(window.location.href);
    url.searchParams.set("lens", l);
    window.history.replaceState(null, "", url);
  };

  const visible = useMemo(() => {
    const needle = fold(q.trim());
    return verbs.filter((v) => {
      if (!filters.every((f) => FILTERS.find((x) => x.id === f)!.test(v, saved))) return false;
      if (!needle) return true;
      const hay = fold([v.lemma, v.meaning_en, v.definition_de, v.example_de, ...v.tags].join(" "));
      return hay.includes(needle);
    });
  }, [verbs, filters, q, saved]);

  const groups = useMemo(() => groupBy(lens, visible, verbs).filter((g) => g.verbs.length), [lens, visible, verbs]);
  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, verbs.filter((v) => f.test(v, saved)).length])),
    [verbs, saved],
  );
  const kinoHref = `/kino?ids=${visible.map((v) => encodeURIComponent(v.id)).join(",")}`;

  return (
    <section className="explorer" id="entdecken" aria-label="Verben entdecken">
      <div className="controls">
        <div className="lens-bar" role="tablist" aria-label="Ordnen nach">
          {LENSES.map((l) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={lens === l.id}
              className={`lens ${lens === l.id ? "is-on" : ""}`}
              onClick={() => chooseLens(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <p className="lens-hint">{LENSES.find((l) => l.id === lens)!.hint}</p>

        <div className="filter-row">
          <label className="search">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M15 15l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="sr-only">Suchen</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Verb, Bedeutung oder Thema suchen"
            />
          </label>
          <div className="chips" role="group" aria-label="Filter">
            {FILTERS.map((f) => {
              const on = filters.includes(f.id);
              return (
                <button
                  key={f.id}
                  className={`chip chip-${f.id} ${on ? "is-on" : ""}`}
                  aria-pressed={on}
                  disabled={!on && counts[f.id] === 0}
                  onClick={() => setFilters(on ? filters.filter((x) => x !== f.id) : [...filters, f.id])}
                >
                  {f.label} <span className="chip-count">{counts[f.id]}</span>
                </button>
              );
            })}
          </div>
          <div className="row-end">
            <label className="toggle">
              <input type="checkbox" checked={english} onChange={(e) => setEnglish(e.target.checked)} />
              <span>Englisch zeigen</span>
            </label>
            <Link className="kino-link" href={kinoHref} aria-disabled={!visible.length}>
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
              </svg>
              {visible.length} als Diashow
            </Link>
          </div>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="empty">
          <p>Keine Verben passen zu dieser Auswahl.</p>
          <button
            className="chip"
            onClick={() => {
              setFilters([]);
              setQuery("");
            }}
          >
            Filter zurücksetzen
          </button>
        </div>
      )}

      {groups.map((g, gi) => (
        <section key={`${lens}-${g.key}`} className={`group group-${lens}`} aria-labelledby={`g-${g.key}`}>
          <header className="group-head">
            <h2 id={`g-${g.key}`}>{g.title}</h2>
            {g.note && <p className="group-note">{g.note}</p>}
            <span className="group-count">{g.verbs.length}</span>
          </header>

          {g.pairs ? (
            <div className="pairs">
              {g.pairs.map(([a, b]) => (
                <div key={a.id} className="pair">
                  <VerbTile verb={a} english={english} size="l" />
                  <div className="pair-axis" aria-hidden="true">
                    <Lemma verb={a} />
                    <span className="pair-vs">oder</span>
                    <Lemma verb={b} />
                  </div>
                  <VerbTile verb={b} english={english} size="l" />
                </div>
              ))}
            </div>
          ) : g.split ? (
            <div className="split">
              {[0, 1].map((side) => (
                <div key={side} className={`split-col ${side ? "is-insep" : "is-sep"}`}>
                  <p className="split-label">{side ? "untrennbar" : "trennbar"}</p>
                  <div className="grid">
                    {g.split![side].map((v) => (
                      <VerbTile key={v.id} verb={v} english={english} />
                    ))}
                    {!g.split![side].length && <p className="split-empty">Noch keine Karte.</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid">
              {g.verbs.map((v, i) => (
                <VerbTile key={v.id} verb={v} english={english} priority={gi === 0 && i < 3} />
              ))}
            </div>
          )}
        </section>
      ))}
    </section>
  );
}
