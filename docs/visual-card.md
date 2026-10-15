# How `/visual-card` chooses a scene

The full rules live in `.claude/skills/visual-card/SKILL.md`. This page explains the core idea.

## Image + sentence (dual coding)
On the website every image or video is shown **together with its example sentence**
(`example_de` + `example_en`). A picture and a sentence together are remembered far better than
either alone. So the image doesn't have to explain the word on its own. Its job is to make the
sentence vivid and memorable.
- **Main test:** seeing the picture next to the sentence, does the learner instantly understand
  the word and remember the scene?

## Three candidates, five questions
When you give `/visual-card` a word, Claude doesn't draw the first idea that comes to mind. It
first lists **three different real-life situations** where the word is used, scores each one
against **five questions**, and keeps the best. This happens while it writes the card. The winner
and its reason are stored in `visual_idea`, and the chat summary shows one row per word:
lemma | collocation | visual idea | needs_video | your sentence (won / lost + reason / none).

1. **Visible?** Can the meaning be seen in a still image? (If not, it becomes a video card.)
2. **Everyday use?** Is this how Germans actually use the word (a common collocation)?
3. **Unambiguous with the sentence?** Together with the sentence, could it be mistaken for
   another word?
4. **Drawable?** Can the image model render it reliably?
5. **Memorable and matching?** Emotion, surprise or humor; **every key noun of the sentence is
   visible** in the image; the sentence shows the word's typical grammar (case, reflexive,
   preposition, separable prefix).

Claude writes the sentence and the image prompt together, checking noun by noun that everything
in the sentence is in the picture (*überlassen*: "die Wahl **des Weges**" → the fork in the path
must be visible).

## Your own sentence (optional)
```
/visual-card schnappen
/visual-card schnappen (Ich habe mir Stift, Papier und Kamera geschnappt.)
/visual-card schnappen (Ich habe mir Stift, Papier und Kamera geschnappt.), falten, aufwachsen
```
Several words are separated by commas; commas inside the parentheses belong to the sentence.
`schnappen | Ich habe mir …` works too.
Your sentence becomes **candidate 3**, and Claude generates the other two, covering different
meanings or situations (schnappen: grab something quickly / police catch a thief / a dog
snapping at a ball). All three are scored with the same five questions:
- **Your scene wins or ties:** your sentence becomes `example_de` (grammar and spelling fixed).
  A tie goes to your sentence, because it's the context you met the word in.
- **Another scene wins:** your sentence is still kept in `user_example_de`, and Claude says in
  one line why the other scene won.

## Example: falten
| Candidate scene | 1. Visible | 2. Everyday | 3. Unambiguous | 4. Drawable | 5. Memorable |
|---|---|---|---|---|---|
| *eine Karte falten*: folding a map | ❌ only a hand motion | ⚠️ sometimes | ❌ looks like *lesen* / *halten* | ❌ fake text, "person holding a map" | ⚠️ |
| *die Hände falten*: hands clasped in prayer | ✅ | ⚠️ mostly religious | ⚠️ could read as *beten* | ✅ | ⚠️ |
| *Wäsche falten*: folding laundry next to a neat stack | ✅ the stack shows the result | ✅ very common | ✅ | ✅ | ✅ messy basket vs. neat stack |

→ Winner: **Wäsche falten**. The first falten card went straight to "folding a map" and failed
questions 1, 3 and 4.

## Separable and inseparable meanings
Some verbs with durch-, über-, um-, unter-, wider-, wieder- mean different things depending on
whether the prefix separates: *úmfahren* (knock down) vs *umfáhren* (drive around). When both
are common, `/visual-card umfahren` writes **two cards**, `umfahren_trennbar.json` and
`umfahren_untrennbar.json`, each with its own scene, a sentence that shows the form (*fährt …
um* vs *umfährt*), the stressed syllable (`stress`) and a link to the other card (`pair`).
If one form is rare, there is one card, and the other meaning is mentioned in `definition_de`.

## What goes into the prompts
- **Scene only, no style words**: the style comes from `config/styles.json`.
- `image_prompt`: the card image, usually the clearest moment or the result.
- `needs_video`: whether the card gets a video. `true` only when the video adds meaning: the card
  image shows a result (*zerstören*: the destroyed sandcastle), or the meaning is a motion
  (*durchblättern*). Words that work as a still image get `false`.
- `video_start_prompt`: only for result cards. The **before** state (the intact sandcastle), used
  as the video's first frame. Motion cards start from the card image.
- `video_prompt`: start → motion → end in one continuous shot.

What models can and can't draw, and other lessons from testing, are in `model-tests.md`.
