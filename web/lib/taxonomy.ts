// How verbs are grouped for visual learners. Client-safe.

export type World = { id: string; name: string; hint: string; tags: string[] };

// Card tags are fine-grained ("Bahn", "Strand"); worlds bundle them into scenes a learner
// can picture. A card belongs to the world of its first matching tag.
export const WORLDS: World[] = [
  { id: "zuhause", name: "Zuhause & Familie", hint: "Küche, Kinderzimmer, Umzugskartons", tags: ["Familie", "Kinder", "Kindheit", "Wohnen", "Umzug", "Haushalt", "Leben"] },
  { id: "unterwegs", name: "Unterwegs", hint: "Straße, Bahnhof, Fähre, Regen", tags: ["Verkehr", "Auto", "Bahn", "Reisen", "Fluss", "Stadt", "Wetter"] },
  { id: "natur", name: "Draußen in der Natur", hint: "See, Berge, Strand, Tiere", tags: ["Natur", "Tiere", "Strand", "Wandern"] },
  { id: "gefuehle", name: "Gefühle & Gespräche", hint: "Was zwischen Menschen passiert", tags: ["Gefühle", "Kommunikation", "Konflikt", "Sprache", "Entscheidungen"] },
  { id: "arbeit", name: "Arbeit & Lernen", hint: "Büro, Schule, Schreibtisch", tags: ["Arbeit", "Schule", "Medien", "Schreiben", "Zeit", "Gesundheit"] },
  { id: "freizeit", name: "Freizeit", hint: "Sport, Spiele, Essen, Kleidung", tags: ["Freizeit", "Sport", "Spiel", "Kreativität", "Essen", "Kleidung", "Gesellschaft"] },
  { id: "alltag", name: "Alltag", hint: "Kleine Momente jeden Tag", tags: ["Alltag"] },
];

export function worldOf(tags: string[]): World {
  for (const t of tags) {
    const w = WORLDS.find((w) => w.tags.includes(t));
    if (w) return w;
  }
  return WORLDS[WORLDS.length - 1];
}

/** Tags that name a topic (single capitalised word), not a collocation. */
export function topicTags(tags: string[]): string[] {
  return tags.filter((t) => /^\p{Lu}[\p{L}]+$/u.test(t) && t !== "Gegensatzpaar");
}

export function collocations(tags: string[]): string[] {
  return tags.filter((t) => !/^\p{Lu}[\p{L}]+$/u.test(t));
}

// What each prefix adds to the picture. Two-way prefixes have one note per side.
export const PREFIX_NOTES: Record<string, { sep?: string; insep?: string }> = {
  auf: { sep: "nach oben, offen, von Anfang an" },
  aus: { sep: "nach draußen, bis zum Ende" },
  bei: { sep: "dazu, an die Seite von jemandem" },
  ein: { sep: "nach innen, hinein" },
  her: { sep: "zu mir hin, vor sich her" },
  hinunter: { sep: "von oben nach unten, weg von mir" },
  nach: { sep: "hinterher, später" },
  zu: { sep: "in Richtung auf etwas, hin" },
  durch: { sep: "von einer Seite zur anderen, ohne anzuhalten", insep: "ganz hindurch, bis ins Innere sehen" },
  um: { sep: "etwas kippt oder wechselt", insep: "im Bogen um etwas herum" },
  über: { sep: "von hier nach drüben, darüber", insep: "über eine Grenze hinaus, in eine andere Form" },
  unter: { sep: "nach unten, darunter", insep: "jemandem etwas unterschieben" },
  wider: { sep: "zurück, wie im Spiegel", insep: "dagegen" },
  be: { insep: "macht etwas zum direkten Objekt" },
  ent: { insep: "weg von, das Gegenteil" },
  er: { insep: "bis ein Ergebnis da ist" },
  ge: { insep: "fest mit dem Wort verbunden" },
  hinter: { insep: "etwas bleibt zurück" },
  ver: { insep: "weg, falsch, verändert" },
  zer: { insep: "in Stücke, kaputt" },
};
