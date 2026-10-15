import { connection } from "next/server";
import { Explorer } from "@/components/Explorer";
import { FeaturedClip } from "@/components/FeaturedClip";
import { Lemma } from "@/components/Lemma";
import { getVerbs } from "@/lib/cards";

// Videos in the hero reel, in playing order. Only the strongest clips go here; every other
// video still plays on hover in the grid.
const REEL = [
  "zerstören",
  "entfalten",
  "schnappen",
  "untertauchen",
  "hinunterfallen",
  "durchblättern",
  "überziehen_trennbar",
  "durchschauen_trennbar",
];

export default async function Home() {
  await connection(); // media is read at request time, see lib/cards.ts
  const verbs = getVerbs();
  const clips = REEL.map((id) => verbs.find((v) => v.id === id && v.media.video)).filter((v) => !!v);
  const pairs = verbs.filter((v) => v.pair).length / 2;

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <h1>Verben, die man sieht.</h1>
          <p className="hero-lede">
            {verbs.length} B2-Verben, jedes mit einem Foto, einem Beispielsatz und oft einem kurzen Video. Zeig auf
            ein Bild, und es bewegt sich.
          </p>

          <dl className="legend">
            <div className="legend-row">
              <dt>
                <Lemma verb={{ base: "umfahren", prefix: "um", separable: true, stress: "úmfahren", reflexive: false }} />
              </dt>
              <dd>
                <span className="legend-sentence">
                  Er <b>fährt</b> den Briefkasten <b className="pfx-sep legend-fly">um</b>.
                </span>
                <span className="legend-key"><b className="pfx-sep">Trennbar:</b> Das Präfix wandert ans Satzende.</span>
              </dd>
            </div>
            <div className="legend-row">
              <dt>
                <Lemma verb={{ base: "umfahren", prefix: "um", separable: false, stress: "umfáhren", reflexive: false }} />
              </dt>
              <dd>
                <span className="legend-sentence">
                  Wir <b><span className="pfx-insep">um</span>fahren</b> den Stau.
                </span>
                <span className="legend-key"><b className="pfx-insep">Untrennbar:</b> Das Präfix bleibt am Verb.</span>
              </dd>
            </div>
            <div className="legend-row legend-small">
              <dt>
                <span className="lemma">
                  <span className="stress">u</span>m
                </span>
              </dt>
              <dd>
                <span className="legend-key">
                  Der Punkt zeigt die betonte Silbe, die Farbe immer das Präfix. {pairs} Verben gibt es in beiden Versionen.
                </span>
              </dd>
            </div>
          </dl>
        </div>
        <FeaturedClip verbs={clips} />
      </section>

      <Explorer verbs={verbs} />
    </main>
  );
}
