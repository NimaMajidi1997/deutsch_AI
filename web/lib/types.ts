import type { Aux } from "./grammar";

// Mirrors content/cards/README.md.
export type RawCard = {
  lemma: string;
  type: "verb" | "noun" | "adjective" | "phrase";
  level: string;
  forms: { praesens: string; praeteritum: string; perfekt: string };
  separable?: boolean;
  stress?: string;
  pair?: string;
  rektion?: string;
  meaning_en: string;
  definition_de: string;
  example_de: string;
  example_en: string;
  visual_idea?: string;
  contrast_with?: string[];
  needs_video?: boolean;
  tags?: string[];
};

export type Media = { card: string | null; start: string | null; video: string | null };

export type Verb = RawCard & {
  id: string;
  separable: boolean;
  base: string; // lemma without "sich"
  reflexive: boolean;
  prefix: string | null;
  stem: string;
  aux: Aux;
  world: string;
  media: Media;
  tags: string[];
  contrast_with: string[];
};
