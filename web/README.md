# deutschAI web

Next.js 16 site that shows the cards from `../content/cards` with their media from `../content/media`
(read per request and served by `app/media/[...path]/route.ts`, so new media needs no rebuild).
Media URLs contain the file's mtime (`/media/v<mtime>/<card>/<file>`), so a re-rendered file shows up
at once instead of a cached old copy.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

## How verbs are organised
- **Bildwelten**: card tags bundled into scenes (`lib/taxonomy.ts` → `WORLDS`).
- **Präfixe**: prefix split from the lemma (`lib/grammar.ts`); two-way prefixes show a trennbar
  and an untrennbar column, with a short note on what the prefix does (`PREFIX_NOTES`).
- **Wortfamilien**: verbs with the same stem (umfahren, durchfahren).
- **Doppelgänger**: `pair` cards side by side, with the stressed vowel marked.

Grammar colour: cobalt = separable prefix, berry = inseparable prefix. In example sentences the
verb parts are marked and joined by a bracket (Satzklammer).

## Pages
- `/`: hero clip reel plus explorer (lenses, filters, search, bookmarks, English on/off).
  Tiles show the image and play the video on hover.
- `/verb/[id]`: image/video/before-after stage, forms, sentence with speech output, pair, family. ← → to browse.
- `/kino?ids=…`: slideshow of the current selection: picture first, then word, then sentence.
  Stills stay 8 s, videos hold their last frame 1 s. Each opening starts with never-seen cards,
  then the ones watched longest ago (a card counts as seen once its sentence was shown).

Bookmarks, settings and Kino's seen list live in `localStorage`. No backend.
