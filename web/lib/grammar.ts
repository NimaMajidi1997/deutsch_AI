// Pure grammar helpers, safe for server and client.

export type Prefix = {
  text: string; // "um"
  separable: boolean; // from the card, not from the prefix list
};

// Longest first, so "hinunter" wins over "hin" and "zer" over "zu".
const PREFIXES = [
  "hinunter", "zurück", "hinter", "unter", "wider", "durch", "über",
  "nach", "auf", "aus", "bei", "ein", "her", "hin", "ent", "emp", "ver",
  "zer", "miss", "um", "zu", "be", "er", "ge", "ab", "an", "mit", "vor",
];

export function splitPrefix(lemma: string, separable: boolean): { prefix: Prefix | null; stem: string } {
  const l = baseLemma(lemma).toLowerCase();
  for (const p of PREFIXES) {
    const rest = l.slice(p.length);
    if (l.startsWith(p) && rest.length >= 4 && /(en|ern|eln)$/.test(rest)) {
      return { prefix: { text: p, separable }, stem: rest };
    }
  }
  return { prefix: null, stem: l };
}

/** "sich einleben" → "einleben" */
export function baseLemma(lemma: string): string {
  return lemma.replace(/^sich\s+/, "");
}

export function isReflexive(lemma: string): boolean {
  return /^sich\s+/.test(lemma);
}

export type Aux = "haben" | "sein" | "beide";

export function auxOf(perfekt: string): Aux {
  const p = perfekt.trim();
  if (/^ist\s*\/\s*hat|^hat\s*\/\s*ist/.test(p)) return "beide";
  if (p.startsWith("ist")) return "sein";
  return "haben";
}

/** "úmfahren" → index of the stressed vowel in the plain lemma, or -1. */
export function stressIndex(stress: string | undefined): number {
  if (!stress) return -1;
  const i = stress.normalize("NFD").search(/́/);
  if (i < 0) return -1;
  return i - 1; // the combining accent sits right after its vowel
}

// ---------- sentence highlighting ----------

export type Role = "verb" | "close" | null;
export type Segment = { text: string; role: Role };

const AUX = new Set(["hat", "hatte", "haben", "hatten", "ist", "war", "sind", "waren", "bin", "bist", "habe", "hast", "wird", "werden", "wurde"]);
const NOISE = new Set(["hat", "ist", "sich", "vor", "/", "hat/ist"]);

function formWords(forms: Record<string, string>): Set<string> {
  const out = new Set<string>();
  for (const f of Object.values(forms)) {
    for (const w of f.replace(/[()]/g, " ").split(/[\s/]+/)) {
      const t = w.toLowerCase();
      if (t && !NOISE.has(t)) out.add(t);
    }
  }
  return out;
}

/**
 * Marks the verb in a sentence. `verb` = finite or full form, `close` = the part that
 * closes the sentence bracket (separated prefix or participle after an auxiliary).
 */
export function highlightSentence(
  sentence: string,
  lemma: string,
  forms: Record<string, string>,
  separable: boolean,
): Segment[] {
  const parts = sentence.split(/([\p{L}-]+)/u); // odd indices are words
  const { prefix, stem } = splitPrefix(lemma, separable);
  const words = formWords(forms);
  const prefixWords = new Set([...words].filter((w) => prefix && w === prefix.text));
  for (const w of prefixWords) words.delete(w);

  const lemmaBase = baseLemma(lemma).toLowerCase().replace(/(en|n)$/, "");
  const stemBase = stem.replace(/(en|n)$/, "");
  const roles: Role[] = parts.map(() => null);

  const isVerbWord = (raw: string, first: boolean) => {
    const t = raw.toLowerCase();
    if (words.has(t)) return true;
    for (const w of words) if (w.length >= 4 && t.startsWith(w) && t.length - w.length <= 2) return true;
    if (!first && raw !== t) return false; // capitalised mid-sentence = noun
    if (lemmaBase.length >= 4 && t.startsWith(lemmaBase)) return true;
    if (prefix?.separable && t.startsWith(prefix.text + "zu" + stemBase.slice(0, 3))) return true;
    if (prefix?.separable && t.startsWith(prefix.text + "ge" + stemBase.slice(0, 3))) return true;
    if (!prefix?.separable && stemBase.length >= 4 && t.startsWith(stemBase) && !prefix) return true;
    if (prefix?.separable && stemBase.length >= 3 && t.startsWith(stemBase)) return true;
    return false;
  };

  let firstWord = true;
  const hits: number[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    if (isVerbWord(parts[i], firstWord)) hits.push(i);
    firstWord = false;
  }
  if (!hits.length) return parts.filter(Boolean).map((text) => ({ text, role: null }));

  const v = hits[0];
  roles[v] = "verb";
  for (const h of hits.slice(1)) roles[h] = "verb";
  const vLower = parts[v].toLowerCase();

  // Separated prefix: finite stem without its prefix, prefix later in the same clause.
  if (prefix?.separable && !vLower.startsWith(prefix.text)) {
    let candidate = -1;
    for (let i = v + 2; i < parts.length; i += 2) {
      if (parts[i].toLowerCase() === prefix.text) candidate = i;
      if (/[.,;:!?]/.test(parts[i + 1] ?? "")) break;
    }
    if (candidate > 0) {
      roles[v] = "verb";
      roles[candidate] = "close";
    }
  }

  // Perfekt / Plusquamperfekt: auxiliary before a participle-like hit.
  const perfWord = (forms.perfekt ?? "").replace(/[()]/g, " ").trim().split(/\s+/).pop()?.toLowerCase();
  const participle = hits.find((h) => parts[h].toLowerCase() === perfWord);
  if (participle) {
    for (let i = participle - 2; i >= 1; i -= 2) {
      if (/[.,;:!?]/.test(parts[i + 1] ?? "")) break; // stay inside the clause
      if (AUX.has(parts[i].toLowerCase())) {
        roles[i] = "verb";
        roles[participle] = "close";
        break;
      }
    }
  }

  return parts.map((text, i) => ({ text, role: roles[i] })).filter((s) => s.text);
}

// ---------- search ----------

export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "");
}
