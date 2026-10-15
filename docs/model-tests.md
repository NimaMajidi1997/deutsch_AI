# Model tests and findings

A summary of what was tried and why the current setup was chosen. The current setup is in
`comfyui-setup.md`. Timings are on an RTX 3060 12 GB with 16 GB RAM.

## Image models
| Model | Verdict | Why |
|---|---|---|
| DreamShaper XL Lightning (SDXL) | ❌ deleted | Weak scene following, anatomy errors (a third arm), ignored the illustration style |
| Z-Image Turbo (6B) | ❌ deleted | Fast (~15 s), but a "stock photo / AI" look; missed scene details (no fork in the path for *überlassen*) |
| **Qwen-Image 2512 Lightning** (20B, 4 steps) | ✅ **default** | ~40 s; clearly more photographic (light, skin, fur); follows the scene better |
| Qwen-Image 2512 full (50 steps, cfg 4) | ✅ selected cards | ~9–10 min; similar detail to Lightning, but follows the meaning better (an undecided face, a clear Y-fork, the castle visibly collapsing) |

Not chosen: FLUX.1-dev / Krea (non-commercial license), FLUX.2 klein 4B and Z-Image base (no
gain), LTX-2.x (too large for this PC).

## Video models (schnappen, same start frame and seed)
| Setting | Time | Result |
|---|---|---|
| Wan 2.2 5B, 480p | ~3.5 min | ❌ deleted. AI look: the ball turned red, sand looked like ice, the action was too fast, the camera zoomed on its own |
| **Wan 2.2 14B, 480p**, 4-step LoRA | ~5.4 min | ✅ **standard**: the ball stays the same ball, natural motion, stable camera |
| Wan 2.2 14B, 720p | ~19 min | Only slightly sharper; 480p already looks good at website size (untertauchen), so 720p only for full screen |
| Wan 2.2 14B "HQ" (no LoRA on the high-noise half, cfg 3.5, 4 of 8 steps) | ~47 min | ❌ Broken colors (neon grass, purple fur): too few steps without the LoRA. Done properly it would take over an hour |

Still open: test first+last frame (`wan22_14b_flf2v.json`, built, untested) for videos that miss
the end state (zerstören: castle not destroyed, bereuen: hair not cut); GGUF Q4/Q5 of
14B for speed; upscaling 480p videos instead of rendering at 720p.
HunyuanVideo: Tencent licenses have excluded the EU, so check before use.

## Styles
- **realistic** (default): clear and grown-up.
- illustration: equally clear, a bit childish, hides small errors.
- comic: not preferred (preset kept).

## Prompt lessons
- Image models fail at **small hand actions** (folding paper, grabbing a pen): they draw "person
  holding object". Choose scenes with a visible **result** or a big body pose.
- Don't describe a motion as a shape ("a fan of pages flying past"): the model draws a literal fan
  of loose sheets (durchblättern). Describe one natural moment and leave the motion to the video.
- Paper, maps and books attract fake text. Describe "blank, unlabeled" surfaces in the positive
  prompt, because cfg-1 workflows ignore negative prompts.
- Mid-air moments (a dog catching a ball) usually come out as "after" (ball already in the mouth):
  these become video cards.
- Destruction: "a wave crashing into a sandcastle, half collapsing" came out with the castle fully
  intact. Describe the **remains** concretely (a low heap of wet sand, one broken tower stump).
- Video: the start frame must show the **before** state (`video_start_prompt`). Wan does the action
  early and fast; timing words help only a little.
- Start and card frames from two separate prompts got different camera angles (umfahren: side view
  vs rear view). i2v and first+last frame then let the mailbox fall without contact and swung
  the camera. Fix: one shared camera/layout sentence in both prompts, obstacle in the car's path;
  with matching frames, flf2v showed the bumper knocking the mailbox over correctly.
- Duplicates: an object named in two states ("a mailbox on the lawn" + "the mailbox lies in the grass")
  is drawn twice; "a door is open and a man stands beside it" gave two men. Name each object once,
  in one state, and say "a single …, the only person in the scene".
- Slow processes (einleben: boxes → cosy room over weeks) don't work as a Wan time-lapse: people and furniture
  morph. Use one result image + sentence instead.
- Same seed ≠ same image across models or LoRA settings: drafts check the prompt, not the final
  picture.
- Group scenes: the model dresses everyone alike, so a "newcomer" gets the team jersey too
  (beitreten). Give the person who stands apart **explicitly different clothes** (white t-shirt).
- "Unbranded / no logos" only reduces sportswear logos and crests; it doesn't remove them.
