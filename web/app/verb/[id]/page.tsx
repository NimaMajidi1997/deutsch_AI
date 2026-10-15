import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EnglishOnly, EnglishToggle } from "@/components/EnglishOnly";
import { KeyNav } from "@/components/KeyNav";
import { Form, Lemma } from "@/components/Lemma";
import { MediaStage } from "@/components/MediaStage";
import { Sentence } from "@/components/Sentence";
import { Speak } from "@/components/Speak";
import { Star } from "@/components/Star";
import { VerbStrip } from "@/components/VerbStrip";
import { getVerb, getVerbs } from "@/lib/cards";
import { fold } from "@/lib/grammar";
import { collocations, PREFIX_NOTES, WORLDS } from "@/lib/taxonomy";
import type { Verb } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/verb/[id]">): Promise<Metadata> {
  const v = getVerb((await params).id);
  if (!v) return {};
  return {
    title: v.lemma,
    description: `${v.lemma}: ${v.meaning_en}. ${v.example_de}`,
    openGraph: v.media.card ? { images: [v.media.card] } : undefined,
  };
}

const href = (v: Verb) => `/verb/${encodeURIComponent(v.id)}`;

/** "umfáhren (um etw. herumfahren)" → the card it names, if there is one. */
function findContrast(item: string, all: Verb[], self: Verb): Verb | undefined {
  const word = fold(item.split(/[\s(]/)[0]);
  if (self.pair && /́/.test(item.normalize("NFD"))) return all.find((v) => v.id === self.pair);
  return all.find((v) => v.id !== self.id && fold(v.base) === word);
}

export default async function VerbPage({ params }: PageProps<"/verb/[id]">) {
  await connection(); // media is read at request time, see lib/cards.ts
  const verb = getVerb((await params).id);
  if (!verb) notFound();

  const all = getVerbs();
  const i = all.findIndex((v) => v.id === verb.id);
  const prev = all[(i - 1 + all.length) % all.length];
  const next = all[(i + 1) % all.length];
  const pair = verb.pair ? all.find((v) => v.id === verb.pair) : undefined;
  const family = all.filter((v) => v.stem === verb.stem && v.id !== verb.id && v.id !== verb.pair);
  const world = WORLDS.find((w) => w.id === verb.world)!;
  const neighbours = all.filter((v) => v.world === verb.world && v.id !== verb.id && !family.includes(v)).slice(0, 6);
  const note = verb.prefix ? PREFIX_NOTES[verb.prefix]?.[verb.separable ? "sep" : "insep"] : undefined;
  const colls = collocations(verb.tags);
  // First sentence of the card's visual idea, without the "Collocation '…':" lead-in.
  const why = verb.visual_idea
    ?.replace(/^[^:]*'[^']*':\s*/, "")
    .split(/(?<=[a-z)]{2}\.)\s(?=[A-Z])/)[0]
    .replace(/^./, (c) => c.toUpperCase());

  return (
    <main className="verb-page">
      <KeyNav prev={href(prev)} next={href(next)} />

      <nav className="verb-nav" aria-label="Blättern">
        <Link href="/#entdecken" className="back">
          Alle Verben
        </Link>
        <span className="pager">
          <Link href={href(prev)} rel="prev" aria-label={`Vorheriges Verb: ${prev.lemma}`}>
            ‹ {prev.base}
          </Link>
          <span className="pager-pos">
            {i + 1} von {all.length}
          </span>
          <Link href={href(next)} rel="next" aria-label={`Nächstes Verb: ${next.lemma}`}>
            {next.base} ›
          </Link>
        </span>
      </nav>

      <article className="verb">
        <div className="verb-media">
          <MediaStage verb={verb} />
        </div>

        <div className="verb-info">
          <div className="verb-title">
            <h1>
              <Lemma verb={verb} split />
            </h1>
            <Speak text={verb.lemma} label={`${verb.lemma} anhören`} rate={0.8} />
            <Star id={verb.id} lemma={verb.lemma} />
          </div>

          <p className="verb-kind">
            {verb.prefix ? (
              <span className={verb.separable ? "pfx-sep" : "pfx-insep"}>
                {verb.separable ? "trennbar" : "untrennbar"}
              </span>
            ) : (
              "ohne Präfix"
            )}
            {note && <span className="verb-kind-note">{verb.prefix}-: {note}</span>}
          </p>

          <EnglishOnly>
            <p className="verb-en">{verb.meaning_en}</p>
          </EnglishOnly>
          <p className="verb-def">{verb.definition_de}</p>

          <dl className="forms">
            {(
              [
                ["Präsens", verb.forms.praesens],
                ["Präteritum", verb.forms.praeteritum],
                ["Perfekt", verb.forms.perfekt],
              ] as const
            ).map(([k, f]) => (
              <div key={k} className={k === "Perfekt" ? `form aux-${verb.aux}` : "form"}>
                <dt>{k}</dt>
                <dd>
                  <span className="form-person">er/sie</span>{" "}
                  <Form text={f} prefix={verb.prefix} separable={verb.separable} />
                </dd>
              </div>
            ))}
          </dl>

          {verb.rektion && (
            <p className="rektion">
              <span className="rektion-k">So benutzt man es</span>
              {verb.rektion}
            </p>
          )}
        </div>
      </article>

      <section className="example" aria-label="Beispielsatz">
        <div className="example-line">
          <Sentence verb={verb} className="sentence-xl" />
          <Speak text={verb.example_de} label="Satz anhören" />
        </div>
        <EnglishOnly>
          <p className="example-en">{verb.example_en}</p>
        </EnglishOnly>
        <div className="example-foot">
          <EnglishToggle />
          {why && (
            <EnglishOnly>
              <p className="why">
                <span>Warum dieses Bild?</span> {why}
              </p>
            </EnglishOnly>
          )}
        </div>
      </section>

      {(colls.length > 0 || verb.contrast_with.length > 0) && (
        <section className="related-words">
          {colls.length > 0 && (
            <div>
              <h2>Typische Verbindungen</h2>
              <ul className="word-chips">
                {colls.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {verb.contrast_with.length > 0 && (
            <div>
              <h2>Nicht verwechseln mit</h2>
              <ul className="word-chips">
                {verb.contrast_with.map((c) => {
                  const hit = findContrast(c, all, verb);
                  return <li key={c}>{hit ? <Link href={href(hit)}>{c}</Link> : c}</li>;
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {pair && (
        <section className="twin">
          <h2>Der Doppelgänger</h2>
          <p className="twin-note">
            Gleiche Buchstaben, andere Betonung: <Lemma verb={verb} /> und <Lemma verb={pair} /> zeigen zwei verschiedene
            Bilder.
          </p>
          <VerbStrip verbs={[pair]} large />
        </section>
      )}

      {family.length > 0 && (
        <section className="strip-section">
          <h2>
            Wortfamilie <span className="family-title">{verb.stem}</span>
          </h2>
          <VerbStrip verbs={family} />
        </section>
      )}

      {neighbours.length > 0 && (
        <section className="strip-section">
          <h2>Mehr aus der Bildwelt {world.name}</h2>
          <VerbStrip verbs={neighbours} />
        </section>
      )}
    </main>
  );
}
