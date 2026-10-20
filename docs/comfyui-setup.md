# ComfyUI setup (current)

What is in use now. For test results and why these models were chosen, see `model-tests.md`.

## Machine
- RTX 3060 12 GB, 16 GB RAM, pagefile on N: (4–32 GB, needed for the 14B/20B models).
- ComfyUI Desktop, install `N:\comfy\ComfyUI`, API on **127.0.0.1:8188**.
- Model folders, **both** listed in the Comfy Desktop setting `modelsDirs` (if one is missing, its
  models disappear after a restart):
  - `N:\comfy\ComfyUI-Shared`: Qwen-Image
  - `%LOCALAPPDATA%\Comfy-Desktop\ComfyUI-Shared\models`: Wan

## Workflows (`workflows/`)
| File | Use | Model | Size | Time |
|---|---|---|---|---|
| **`qwen2512_lightning.json`** | Images (**default**) | Qwen-Image 2512 fp8 + Lightning 4-step LoRA, cfg 1 | 1664×928 | ~40 s |
| `qwen2512_api.json` | Images, full quality | Qwen-Image 2512 fp8, 50 steps, cfg 4 | 1664×928 | ~10 min |
| **`wan22_14b_i2v.json`** | Video, cards without `video_start_prompt` (**auto**) | Wan 2.2 14B i2v fp8 + lightx2v 4-step LoRAs | 832×480, 81 fr @16 fps | ~5.5 min |
| `wan22_14b_i2v_720.json` | Video, full screen only | same | 1280×720 | ~19 min |
| **`wan22_14b_flf2v.json`** | Video, cards with `video_start_prompt`: must end on the card image (first + last frame, **auto**) | same | 832×480 | ~5.5 min? |

- Placeholders: `{{POSITIVE}}` (card prompt + style), `{{NEGATIVE}}`, `{{SEED}}`, `{{PREFIX}}`,
  `{{IMAGE}}` (start frame), `{{END_IMAGE}}` (end frame).
- Negative prompts: the cfg-1 workflows (Qwen Lightning, Wan 14B) ignore them in practice. Full
  Qwen uses its Chinese default (against "AI look", waxy skin, oversaturation) plus the card's
  `negative_prompt`. Wan uses its Chinese default minus 风格/作品/画作 (style, artwork, painting),
  plus 文字/字母/水印 (text, letters, watermark).
- New workflow: run it once in the ComfyUI window, and Claude copies the API version from
  `/history` and adds the placeholders.

## Style
`config/styles.json` defines `realistic` (**default**), `illustration` and `comic`. Card prompts
contain only the scene; the script appends the preset's `image` text (or `video` text for
`video_prompt`). Override per run with `--style <name>`.

## Run the pipeline
`/visual-card` only writes the card. Images and videos come from `scripts/comfy_generate.py`, which
you can run in two ways:
- **Yourself:** run the commands below in PowerShell from the repo root.
- **Through Claude:** ask Claude Code to run them (e.g. "generate images for falten").

Either way, ComfyUI must be running (its window can stay in the background).

### How a run works
Each card gets **one** file per role, saved straight under its final name in
`content/media/<card>/` (`<card>` = the card file name, usually the lemma):

| Role | Made from | File |
|---|---|---|
| Card image: shown on the website; also the video's last frame (before/after cards) or first frame (motion cards) | `image_prompt` | `card_<style>.png` |
| "Before" frame: first frame of a before/after video | `video_start_prompt` | `start_<style>.png` |
| Video: plays on hover | `video_prompt` | `video_<style>.mp4` |

Files that already exist are skipped. So the loop is: **run → delete what you don't like → run
the same command again**, and only the deleted ones are rendered again, with a new seed. This
also makes overnight batches over `content/cards/*.json` safe (videos, full Qwen).

To compare several tries, use `--variants 3`: the files are then numbered
(`<card>_<style>_card_NNNNN_.png`), and you rename the best one by hand. `--force` renders even
if the file exists, and saves the new one numbered so the old one isn't overwritten.

### 1. Cards (in Claude Code)
```
/visual-card schnappen (Ich habe mir Stift, Papier und Kamera geschnappt.), falten
```

### 2. Images
```powershell
# card images, plus "before" frames for cards with a video_start_prompt (~40 s each)
python scripts/comfy_generate.py content/cards/*.json --with-start
# one card in full quality (~10 min)
python scripts/comfy_generate.py content/cards/falten.json --workflow workflows/qwen2512_api.json
```
Leave out `--with-start` for card images only; `--prompt-field video_start_prompt` makes only
"before" frames. Card and start frame share one seed per card, so they show the same scene; to redo
only the start frame, pass the card's seed (printed when it was queued) with `--seed`.

### 3. Video (~5.5 min each)
```powershell
python scripts/comfy_generate.py content/cards/*.json --prompt-field video_prompt
```
Only cards with `"needs_video": true` get a video. The script picks the workflow per card, so one
command covers all cards:

| Card | Example | Workflow | First frame → last frame |
|---|---|---|---|
| has `video_start_prompt` (before/after) | zerstören, untertauchen | `wan22_14b_flf2v.json` | `start_<style>.png` → `card_<style>.png` |
| no `video_start_prompt` (motion is the meaning) | durchblättern | `wan22_14b_i2v.json` | `card_<style>.png` → free |

Before/after cards end on the card image, because it shows the result; with plain i2v Wan often
stopped short of it (zerstören: castle still standing). Their `start_<style>.png` comes from
`--with-start` in step 2, and both frames need the same camera and layout, or Wan morphs between
them. Cards whose frames don't exist yet are skipped. `--workflow` uses one workflow for all cards
(e.g. `wan22_14b_i2v_720.json`); `--start-image <path>` tries another first frame.
To re-render a bad video, add `--force`: the new one is saved numbered next to the old one; keep
the better one as `video_realistic.mp4`.

### Options
| Option | Default | Effect |
|---|---|---|
| `--workflow` | images `qwen2512_lightning.json`, videos per card (see step 3) | workflow for all cards |
| `--prompt-field` | `image_prompt` | card field: `image_prompt`, `video_start_prompt`, `video_prompt` |
| `--with-start` | off | image runs: also make "before" frames |
| `--force` | off | render even if the file exists (saved numbered) |
| `--variants` | 1 | outputs per card, each with a new seed; > 1 saves numbered files |
| `--seed` | random | first seed, for repeatable results |
| `--style` | `realistic` | preset from `config/styles.json` |
| `--start-image` | `start_` or `card_<style>.png` | start frame for video |
| `--host` | `127.0.0.1:8188` | ComfyUI address |
| `--timeout` | 3600 s | wait limit per job |
