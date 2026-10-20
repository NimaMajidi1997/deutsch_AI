# deutsch_AI: Visual German Learning (B2)

Teach German vocabulary (verbs, nouns, phrases) **visually**: each word gets a realistic
AI-generated image or short video plus a B2 example sentence (shown together on the site). Final
goal: `deutschAI.nimadevops.de`, where learners can learn, practice and review (flashcards, spaced
repetition, quizzes).

**Current phase: proof of concept.** Focus on models and the generation pipeline.
Website: `web/` (Next.js 16, reads `content/` directly; see `web/README.md`). Deploy: a push to
`main` deploys live via GitHub Actions; media goes up separately with `scripts/push_media.py`
(see `docs/deployment.md`). Claude may commit but **never pushes**. Node is a portable
install in `%LOCALAPPDATA%\Programs\node-v24.21.0-win-x64` (on the user PATH).

## Pipeline
```
word (+ optional sentence) --/visual-card--> content/cards/<card>.json --scripts/comfy_generate.py--> content/media/<card>/
```
- Card schema: `content/cards/README.md`. Keep it stable; the website will read it.
- Card rules: `.claude/skills/visual-card/SKILL.md`; the method is explained in `docs/visual-card.md`.
- ComfyUI setup, workflows and commands: `docs/comfyui-setup.md`.
- Model and style tests, and why things were chosen: `docs/model-tests.md`. Add new findings there,
  briefly.

## Current stack (Windows 11, RTX 3060 12 GB, 16 GB RAM)
- ComfyUI Desktop, API `127.0.0.1:8188`; models in two folders (both in `modelsDirs`).
- Images: **Qwen-Image 2512** (`workflows/qwen2512_lightning.json` default, `qwen2512_api.json` full).
- Video: **Wan 2.2 14B** 480p, only for cards with `needs_video: true`. The script picks per card:
  `wan22_14b_flf2v.json` (first + last frame) if it has a `video_start_prompt`, else `wan22_14b_i2v.json`.
- Style: `config/styles.json`, default **realistic**.
- Python 3.10, `scripts/` uses the standard library only.

## Conventions
- Only licenses that allow commercial use (Apache-2.0 etc.); no FLUX.1-dev.
- No text in images; the website overlays German text.
- Card prompts describe the scene only (no style words). Media: `content/media/<card>/card|start|video_<style>.<ext>`,
  one per role (see `docs/comfyui-setup.md`).
- One card per lemma, lowercase file name, umlauts kept (`zerstören.json`). Exception: verbs with a
  separable and an inseparable meaning get two cards, `umfahren_trennbar.json` + `umfahren_untrennbar.json`.
- `content/media/` is git-ignored; cards are committed.
- Keep docs short and current: replace outdated text instead of appending history.
- GitHub: https://github.com/NimaMajidi1997/deutsch_AI (public; never commit secrets, server IPs or media). Live site: https://deutschai.nimadevops.de
