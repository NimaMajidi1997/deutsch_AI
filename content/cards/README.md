# Card schema

One JSON file per lemma. The future website reads these directly, so keep fields stable.
The file name (without `.json`) is the card id and the media folder name.

**Two-way prefix verbs** (durch-, über-, um-, unter-, wider-, wieder-) whose separable and
inseparable forms have different meanings get two cards with the same `lemma`:
`umfahren_trennbar.json` (*úmfahren*, to knock down) and `umfahren_untrennbar.json`
(*umfáhren*, to drive around). Both have `stress` and `pair`.

```jsonc
{
  "lemma": "aufwachsen",
  "type": "verb",                       // verb | noun | adjective | phrase
  "level": "B2",
  "forms": {                            // verbs: Präsens 3sg, Präteritum, Perfekt
    "praesens": "wächst auf",
    "praeteritum": "wuchs auf",
    "perfekt": "ist aufgewachsen"
  },
  "separable": true,                    // verbs only
  "stress": "áufwachsen",               // optional; required for pair cards: accent on the stressed vowel
  "pair": "umfahren_untrennbar",        // optional: card id of the other (un)separable meaning
  "rektion": "in + Dat.",               // typical preposition/case, if any
  "meaning_en": "to grow up",
  "definition_de": "vom Kind zum Erwachsenen werden",
  "example_de": "Sie ist in einem kleinen Dorf an der Küste aufgewachsen.",
  "example_en": "She grew up in a small village on the coast.",
  "user_example_de": "...",              // optional: the user's own sentence, kept when another scene won
  "visual_idea": "One-line explanation of WHY this scene shows the meaning.",
  "contrast_with": ["erwachsen", "wachsen"],
  "image_prompt": "...",                 // English, scene only: no text in image, no style words
                                         //   (style is appended from config/styles.json)
  "negative_prompt": "...",
  "needs_video": false,                  // true: a video is made (result card or motion is the meaning)
  "video_start_prompt": "...",           // optional, result cards only: image prompt for the video's
                                         //   FIRST frame (the "before" state); else the card image is used
  "video_prompt": "...",                 // English, 5 s, one clear motion
  "tags": ["Familie", "Leben"]
}
```
