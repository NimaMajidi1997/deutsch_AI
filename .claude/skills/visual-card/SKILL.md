---
name: visual-card
description: Turn German words/verbs/sentences into visual learning cards (B2 sentence + image/video prompts for ComfyUI). Use when the user gives one or more German words, e.g. "/visual-card aufwachsen, entfalten, falten".
---

# Visual card generator

Input: one or more German items, separated by commas or new lines. Each item is a word, with an
optional example sentence from the user in parentheses (or after `|`):
```
/visual-card schnappen
/visual-card schnappen (Ich habe mir Stift, Papier und Kamera geschnappt.)
/visual-card schnappen (Ich habe mir Stift, Papier und Kamera geschnappt.), falten, aufwachsen
```
Commas inside the parentheses belong to the sentence, not to the item list.

**The user's sentence is a candidate, not the answer.** It becomes one of the three candidate
scenes (section 2): you generate **two** candidates yourself, and the user's sentence is the
**third**. All three are scored with the same five questions.
- If the user's scene wins, use their sentence as `example_de` (fix only grammar and spelling,
  e.g. capitalised nouns) and build the image around it.
- If it ties, prefer the user's scene: it's the context they met the word in, which helps memory.
- If it loses, still store it (corrected) in `user_example_de`, and explain in one line in chat
  why another scene won (e.g. "hands grabbing small objects are hard to draw clearly").
- Make your two candidates cover **different meanings or situations** from the user's one, so
  the comparison is real (schnappen: grab something quickly / police catch a thief / a dog
  snapping at a ball).

For each item, write `content/cards/<lemma>.json` following `content/cards/README.md`
(two files for pair verbs, see section 1b). Skip (and report) items whose card already exists
unless the user says to overwrite.

## 1. Linguistics (B2)
- Normalise to the lemma (infinitive / singular noun with article in `lemma` for nouns: `die Entfaltung`).
- Fill `forms`, `separable`, `rektion` accurately. If unsure about a form, say so in chat — never guess.
- `example_de`: natural B2 sentence (Nebensatz, Konnektor or Perfekt is welcome), 8–16 words,
  built around the **chosen collocation** (section 2) — **the sentence must describe the same
  scene as the image**.
- If the word has a literal and a figurative meaning, pick whichever has the most iconic,
  picturable collocation (often the literal one, e.g. *die Flügel entfalten*); mention the other
  in `definition_de`.

## 1b. Separable + inseparable pairs (two-way prefixes)
Verbs with **durch-, über-, um-, unter-, wider-, wieder-** can be separable (prefix stressed) or
inseparable (stem stressed), often with different meanings: *úmfahren* (knock down: er fährt
den Pfosten um, hat umgefahren) vs *umfáhren* (drive around: er umfährt den Stau, hat umfahren).
- Check every such verb. If **both** forms are in real everyday use at B1–B2, write **two cards**:
  `<lemma>_trennbar.json` and `<lemma>_untrennbar.json`. Same `lemma`, own `forms`, `separable`,
  `rektion`, meaning, sentence, scene and prompts. Set `stress` (accent on the stressed vowel:
  `úmfahren` / `umfáhren`) and `pair` (the other card's id) on both, and put the other meaning
  in `contrast_with`.
- If one form is rare, archaic or only regional, write a normal single card and mention the
  other form in `definition_de` (as `durchfahren.json` does). Say in chat which you chose.
- The **sentence must show which form it is**: use a main clause in Präsens/Präteritum (*fährt …
  um* vs *umfährt*) or Perfekt (*umgefahren* vs *umfahren*). Avoid the infinitive and
  dass-clauses, where both forms look the same.
- The two scenes must look clearly different (a toppled pole vs a car taking a detour around a
  roadblock); each card runs its own three-candidate scoring (section 2).
- A user sentence belongs to the form it uses; it is a candidate only for that card.
- If a single card for one form already exists (e.g. `<lemma>.json`) and you add the other
  form, rename the existing card to its `_trennbar`/`_untrennbar` name, add `stress` + `pair`,
  and rename its `content/media/<lemma>/` folder too. Report it in chat.

## 2. Visual idea — the most important part
On the website the image is always shown **together with `example_de`** (dual coding: picture +
sentence are remembered far better than either alone). So the image doesn't have to explain the
word on its own. Its job is to make the sentence vivid and memorable.

Main test: *"Seeing this picture next to the sentence, does the learner instantly understand the
word and remember the scene?"*

### Pick the scene: the most typical real-life use
Don't illustrate the dictionary definition. Illustrate the situation in which Germans
**actually use the word most often**, the collocation a learner will meet in real life:
- falten → *Wäsche falten* (a stack of neatly folded shirts and towels), not "folding paper"
- entfalten → *der Vogel entfaltet seine Flügel* (wings spread wide), not "unfolding a map"
- aufwachsen → the same child at several ages, getting taller

Procedure for every word:
1. List 3 candidate scenes (real-life collocations) internally.
2. Score each on five questions:
   **(a) Visible:** is the meaning visible in a single still frame (or else clearly a video card)?
   **(b) Everyday:** is it a typical, everyday use (common collocation)?
   **(c) Unambiguous with the sentence:** together with the sentence, could it be confused with
   another word (lesen, halten, öffnen, …)?
   **(d) Drawable:** can an image model draw it reliably?
   **(e) Memorable and matching:** does it have emotion, surprise or humor? Is **every key noun
   of the sentence visible** in the image? Does the sentence show the word's typical grammar
   pattern (case, reflexive, preposition, separable prefix at the end)?
3. Pick the winner and write the reason in `visual_idea`. Add the collocation to `tags`.
4. Write the sentence and the image prompt **together**: go through the sentence noun by noun
   and make sure each one is in the prompt (überlassen: "die Wahl **des Weges**" → the fork in the
   path must be clearly visible).

### What image models can and cannot draw (learned from tests)
- ✅ Reliable: a clear **result state** (a neat folded stack, wings fully spread, a broken
  cup), big body poses, growth stages side by side, large objects, nature.
- ❌ The moment of impact ("a wave crashing into the castle") is drawn with the object still
  intact. For destruction, describe what is **left** ("a low heap of wet sand, one broken tower
  stump"), not the event.
- ❌ Unreliable: **small hand manipulations** (folding/unfolding paper, turning a key). The model
  falls back to "person holding object", which reads as a different verb. Avoid these scenes, or
  show the result next to the person.
- ❌ Paper, books and maps attract fake text, and stacks of panels turn into books.
- ❌ Motion described as a shape ("a fan of pages flying past") becomes a literal object (a fan
  of loose sheets). Describe one natural, calm moment; the motion belongs in `video_prompt`.
- ❌ "Her back to the doors" draws a back view, so the person seems to walk the opposite way
  (aussteigen came out as einsteigen). For direction, say what faces the camera: "her face and the
  front of her jacket clearly visible".
- If the meaning is only a motion with no visible result, still pick the clearest image, and
  set `needs_video: true` and say why in `visual_idea` (see section 4).

### Composition
- One subject, one action, one clear moment. No clutter.
- Show the **change** for process verbs: a visible result, or before→after inside one frame
  (growth stages left→right, split composition).
- Separable prefixes are visual hints: auf- (up/open), aus- (out), ein- (in), zu- (closed),
  ent- (undo/out of), ver- (wrongly/away). Make the direction visible.
- Contrast pairs (falten/entfalten) should still look visually opposite (closed, compact ↔ wide
  open), but **clarity beats symmetry**: use different objects if that makes each meaning obvious.
- Prefer everyday European/German settings (Altbau-Wohnung, Bäckerei, S-Bahn, Wald).
- Emotions/abstract words: use a concrete situation + body language + symbolic lighting.

## 3. Image prompt rules
- English, 40–80 words, structure: `subject + action, key object, setting, composition, style`.
- **No style words** in any prompt ("illustration", "photo", "flat colors", …). The style is
  global (`config/styles.json`) and the script appends it, so one setting switches the deck
  between illustration and realistic.
- **No text, letters, signs, labels or speech bubbles** — the website overlays German text.
- Qwen-Image Lightning (the default image workflow) runs at cfg 1 and **ignores the negative prompt**. Put
  every "avoid" into the positive prompt as a positive description: "blank unlabeled map with only
  colored shapes" rather than relying on "no text".
- Describe the **visible result or the peak of the action** concretely (sizes, positions,
  quantities: "a tall stack of six neatly folded towels"), not only the verb ("folding").
- `negative_prompt` (used only by the full 50-step Qwen workflow, added to its built-in Chinese negative): `text, letters, watermark, signature, caption, blurry, extra fingers, deformed hands, cluttered background, multiple panels`
  (remove `multiple panels` when you deliberately use a split composition).

## 4. Video prompt rules (Wan 2.2, ~5 s)
- English, describe start state → motion → end state in one continuous shot.
- Static or slow camera, one actor, slow and readable motion. Same subject/style as the image,
  because the card image is a frame of the video: the last frame for before/after cards, the
  first frame for motion cards (the script picks the workflow from `video_start_prompt`).
- **`needs_video`** decides whether the card gets a video. `true` only when the video adds real
  meaning; otherwise `false` (the still image plus sentence is enough, no video is made):
  - **Before/after state:** the card image shows the result (wings spread, sandcastle destroyed,
    boy underwater). Also write `video_start_prompt`: the same scene and style in the **before**
    state (wings folded). It becomes the video's first frame and the card image its last. Start both prompts with the **same
    camera + layout sentence** (viewpoint, where each object stands) and change only the state;
    otherwise Wan morphs between two different scenes. For collisions, put the object **in the
    path of the motion** and say it falls "only when X touches it". The shared sentence holds only
    the camera and fixed things; name each changing object **once, in one state**, or it is drawn
    twice (two mailboxes, two drivers). Describe a person **identically** in both prompts (hair,
    clothes), or Wan morphs one person into another.
  - **Motion is the meaning** (durchblättern): no `video_start_prompt`; the video starts from the
    card image, so make sure that image works as a first frame.
- A card with `video_start_prompt` always has `needs_video: true`.
- Always write `video_prompt`, so a video can be switched on later.

## 5. Output
After writing files, print a compact table: card | collocation | visual idea | needs_video
(no / yes: state / yes: motion) | user sentence (won / lost + short reason / none).
Then remind the user: `python scripts/comfy_generate.py content/cards/<card>.json --with-start`.
