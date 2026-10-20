import "server-only";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { auxOf, baseLemma, isReflexive, splitPrefix } from "./grammar";
import { worldOf } from "./taxonomy";
import type { RawCard, Verb, Media } from "./types";

const CARDS = path.resolve(process.cwd(), "../content/cards");
// Read at request time (served by app/media/[...path]/route.ts): in production this folder is a
// read-only bind mount that scripts/push_media.py fills, so new media needs no rebuild.
export const MEDIA = path.resolve(process.cwd(), "../content/media");

/** Media folder names on disk, keyed by their NFC form (umlauts may be stored either way). */
function mediaDirs(): Map<string, string> {
  const names = fs.existsSync(MEDIA) ? fs.readdirSync(MEDIA) : [];
  return new Map(names.map((n) => [n.normalize("NFC"), n]));
}

function mediaFor(id: string, dirs: Map<string, string>): Media {
  const name = dirs.get(id);
  const dir = name ? path.join(MEDIA, name) : "";
  const files = name ? fs.readdirSync(dir) : [];
  // The file's mtime is part of the URL, so a re-rendered file gets a new URL instead of a cached old one.
  const url = (f: string) => {
    const v = Math.floor(fs.statSync(path.join(dir, f)).mtimeMs / 1000);
    return `/media/v${v}/${encodeURIComponent(id)}/${f}`;
  };
  const pick = (role: string) => {
    const real = files.find((f) => f.startsWith(`${role}_realistic.`));
    const any = real ?? files.find((f) => f.startsWith(`${role}_`));
    return any ? url(any) : null;
  };
  return { card: pick("card"), start: pick("start"), video: pick("video") };
}

export const getVerbs = cache((): Verb[] => {
  const files = fs.readdirSync(CARDS).filter((f) => f.endsWith(".json"));
  const dirs = mediaDirs();
  const verbs = files.map((f): Verb => {
    const id = f.slice(0, -5).normalize("NFC");
    // Generation prompts stay out of the page payload.
    const { image_prompt, negative_prompt, video_prompt, video_start_prompt, user_example_de, ...raw } =
      JSON.parse(fs.readFileSync(path.join(CARDS, f), "utf8")) as RawCard & Record<string, unknown>;
    void [image_prompt, negative_prompt, video_prompt, video_start_prompt, user_example_de];
    const separable = !!raw.separable;
    const { prefix, stem } = splitPrefix(raw.lemma, separable);
    return {
      ...raw,
      id,
      separable,
      base: baseLemma(raw.lemma),
      reflexive: isReflexive(raw.lemma),
      prefix: prefix?.text ?? null,
      stem,
      aux: auxOf(raw.forms?.perfekt ?? ""),
      world: worldOf(raw.tags ?? []).id,
      media: mediaFor(id, dirs),
      tags: raw.tags ?? [],
      contrast_with: raw.contrast_with ?? [],
    };
  });
  return verbs.sort((a, b) => a.base.localeCompare(b.base, "de") || a.id.localeCompare(b.id));
});

export function getVerb(id: string): Verb | undefined {
  const want = decodeURIComponent(id).normalize("NFC");
  return getVerbs().find((v) => v.id === want);
}
