"""Send visual cards to a running ComfyUI and download the results.

Usage:
    # card images, plus "before" frames for cards with a video_start_prompt (Qwen-Image Lightning)
    python scripts/comfy_generate.py content/cards/*.json --with-start
    python scripts/comfy_generate.py content/cards/falten.json --style illustration --seed 500
    # videos: workflow picked per card (first + last frame if it has a video_start_prompt, else i2v)
    python scripts/comfy_generate.py content/cards/*.json --prompt-field video_prompt
    # one workflow for all cards instead, e.g. 720p i2v
    python scripts/comfy_generate.py content/cards/durchblättern.json --prompt-field video_prompt --workflow workflows/wan22_14b_i2v_720.json

Workflow (without --workflow): image runs use qwen2512_lightning.json; video_prompt runs use
wan22_14b_flf2v.json for cards with a video_start_prompt (the video must end on the card image,
which shows the result) and wan22_14b_i2v.json for the rest (the card image is the first frame).

Workflows: API-format JSON (see workflows/) with the placeholders {{POSITIVE}}, {{NEGATIVE}},
{{SEED}}, {{PREFIX}} and, for image->video, {{IMAGE}} (start frame) and {{END_IMAGE}} (end frame)
(any subset). Standard library only.

Card fields usable with --prompt-field: image_prompt (default), video_start_prompt, video_prompt.
negative_prompt fills {{NEGATIVE}} (only the full Qwen workflow uses it; Lightning runs at cfg 1). Other card fields, such as
example_de and user_example_de, are for the website and are ignored here.

Style: card prompts describe only the scene. The style preset from config/styles.json (--style,
else its "default") is appended: the preset's "video" text for video_prompt, its "image" text
for every other field.

Output in content/media/<card>/ (<card> = card file name without .json), role from the prompt field (image_prompt -> card,
video_start_prompt -> start, video_prompt -> video): <role>_<style>.<ext> (e.g. card_realistic.png).
With --variants > 1, or --force when that file exists, files are numbered instead
(<card>_<style>_<role>_NNNNN_.<ext>); rename the chosen one by hand.

Seed: one per card (--seed, else random), shared by its card and start frame in --with-start runs.
To redo only the start frame, pass the card image's seed (printed when it was queued) with --seed.

Existing media is skipped: a job is skipped when the folder already has a file of that role
(final or numbered), so rerunning content/cards/*.json renders only what is missing, e.g. after
you deleted a bad image. --force renders anyway.

Videos are made only for cards with "needs_video": true. Start frame: --start-image, else
content/media/<card>/start_<style>.png, else card_<style>.png. Cards with a video_start_prompt
need their start_<style>.png (made by --with-start): their card image shows the result.
End frame ({{END_IMAGE}} workflows): card_<style>.png; only for cards with a video_start_prompt.
"""

import argparse
import glob
import json
import random
import sys
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORKFLOWS = ROOT / "workflows"
DEFAULT_WORKFLOW = WORKFLOWS / "qwen2512_lightning.json"
VIDEO_WORKFLOW = WORKFLOWS / "wan22_14b_i2v.json"
RESULT_VIDEO_WORKFLOW = WORKFLOWS / "wan22_14b_flf2v.json"  # first + last frame
MEDIA_DIR = ROOT / "content" / "media"
STYLES_FILE = ROOT / "config" / "styles.json"
ROLES = {"image_prompt": "card", "video_start_prompt": "start", "video_prompt": "video"}


def load_workflow(path, cache={}):
    """Return (workflow, needs_image, needs_end) for a workflow file, read once."""
    if path not in cache:
        text = Path(path).read_text(encoding="utf-8")
        cache[path] = (json.loads(text), "{{IMAGE}}" in text, "{{END_IMAGE}}" in text)
    return cache[path]


def pick_workflow(args, card):
    if args.workflow:
        return args.workflow
    if args.prompt_field != "video_prompt":
        return DEFAULT_WORKFLOW
    return RESULT_VIDEO_WORKFLOW if card.get("video_start_prompt") else VIDEO_WORKFLOW


def fill(node, values):
    """Recursively replace "{{KEY}}" placeholders, keeping non-string types (e.g. int seeds)."""
    if isinstance(node, dict):
        return {k: fill(v, values) for k, v in node.items()}
    if isinstance(node, list):
        return [fill(v, values) for v in node]
    if isinstance(node, str):
        for key, val in values.items():
            token = "{{" + key + "}}"
            if node == token:
                return val
            if token in node:
                node = node.replace(token, str(val))
    return node


def api(host, path, payload=None):
    url = f"http://{host}{path}"
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def upload_image(host, path):
    """Upload a local image to ComfyUI's input folder and return the name LoadImage expects."""
    boundary = uuid.uuid4().hex
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="{path.name}"\r\n'
        "Content-Type: application/octet-stream\r\n\r\n"
    ).encode() + path.read_bytes() + (
        f"\r\n--{boundary}\r\n"
        'Content-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n'
        f"--{boundary}--\r\n"
    ).encode()
    req = urllib.request.Request(
        f"http://{host}/upload/image", data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        info = json.loads(resp.read())
    return f"{info['subfolder']}/{info['name']}" if info.get("subfolder") else info["name"]


def wait_for(host, prompt_id, timeout):
    start = time.time()
    while time.time() - start < timeout:
        history = json.loads(api(host, f"/history/{prompt_id}"))
        if prompt_id in history:
            entry = history[prompt_id]
            status = entry.get("status", {})
            if status.get("status_str") == "error":
                raise RuntimeError(json.dumps(status.get("messages", []), indent=1))
            return entry.get("outputs", {})
        time.sleep(1.5)
    raise TimeoutError(f"prompt {prompt_id} not finished after {timeout}s")


def download_outputs(host, outputs, dest):
    dest.mkdir(parents=True, exist_ok=True)
    saved = []
    for node_out in outputs.values():
        for items in node_out.values():  # "images", "gifs", "videos", ...
            if not isinstance(items, list):
                continue
            for item in items:
                if not isinstance(item, dict) or "filename" not in item:
                    continue
                query = urllib.parse.urlencode({
                    "filename": item["filename"],
                    "subfolder": item.get("subfolder", ""),
                    "type": item.get("type", "output"),
                })
                target = dest / item["filename"]
                target.write_bytes(api(host, f"/view?{query}"))
                saved.append(target)
    return saved


def existing_final(card_id, style_name, role):
    return sorted((MEDIA_DIR / card_id).glob(f"{role}_{style_name}.*"))


def existing_media(card_id, style_name, role):
    return existing_final(card_id, style_name, role) + sorted((MEDIA_DIR / card_id).glob(f"{card_id}_{style_name}_{role}_*"))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("cards", nargs="+", help="card JSON files (globs allowed)")
    parser.add_argument("--host", default="127.0.0.1:8188", help="ComfyUI host:port")
    parser.add_argument("--workflow", help="API-format workflow JSON for all cards (default: picked per card, see above)")
    parser.add_argument("--prompt-field", default="image_prompt", choices=ROLES, help="card field used as {{POSITIVE}}")
    parser.add_argument("--force", action="store_true", help="render even if the card already has media for this role")
    parser.add_argument("--with-start", action="store_true", help="image runs: also render video_start_prompt for cards that have one")
    parser.add_argument("--variants", type=int, default=1, help="outputs per card (different seeds); > 1 saves numbered files")
    parser.add_argument("--seed", type=int, help="fixed base seed (default: random)")
    parser.add_argument("--start-image", help="start frame for image->video (default: media/<card>/start_<style>.png, else card_<style>.png)")
    parser.add_argument("--style", help="style name from config/styles.json (default: its 'default')")
    parser.add_argument("--timeout", type=int, default=3600, help="seconds to wait per job")
    args = parser.parse_args()

    styles = json.loads(STYLES_FILE.read_text(encoding="utf-8"))
    style_name = args.style or styles["default"]
    if style_name not in styles["styles"]:
        sys.exit(f"Unknown style '{style_name}'. Available: {', '.join(styles['styles'])}")

    paths = [p for pattern in args.cards for p in (glob.glob(pattern) or [pattern])]
    fields = [args.prompt_field]
    if args.with_start:
        if args.prompt_field != "image_prompt" or (args.workflow and load_workflow(args.workflow)[1]):
            sys.exit("--with-start only works for image runs (image workflow, --prompt-field image_prompt)")
        fields.append("video_start_prompt")
    client_id = str(uuid.uuid4())

    try:
        api(args.host, "/system_stats")
    except OSError as exc:
        sys.exit(f"Cannot reach ComfyUI at {args.host} ({exc}). Is it running? Check the port in ComfyUI settings and pass --host")

    for path in paths:
        card = json.loads(Path(path).read_text(encoding="utf-8"))
        card_id = Path(path).stem  # file name, e.g. umfahren_trennbar
        workflow_path = pick_workflow(args, card)
        workflow, needs_image, needs_end = load_workflow(workflow_path)
        # One seed per card: with --with-start, card and start frame share it, so the same seed and
        # camera sentence give the same scene (a video between two different scenes morphs).
        base_seed = args.seed if args.seed is not None else random.randint(0, 2**31)
        if card.get("video_start_prompt") and not card.get("needs_video"):
            print(f"warning {card_id}: has a video_start_prompt but needs_video is not true")
        for field in fields:
            positive = card.get(field)
            if not positive:
                if field == args.prompt_field:
                    print(f"skip {card_id}: no '{field}'")
                continue
            role = ROLES[field]
            if role == "video" and not card.get("needs_video"):
                print(f"skip {card_id} video: needs_video is false")
                continue
            found = existing_media(card_id, style_name, role)
            if found and not args.force:
                print(f"skip {card_id} {role}: already has {found[0].name} (--force to render anyway)")
                continue
            style_text = styles["styles"][style_name]["video" if field == "video_prompt" else "image"]
            values = {
                "POSITIVE": f"{positive}, {style_text}",
                "NEGATIVE": card.get("negative_prompt", ""),
                "PREFIX": f"deutschAI/{card_id}_{style_name}_{role}",
            }
            if needs_image:
                if args.start_image:
                    start = Path(args.start_image)
                    if not start.is_file():
                        sys.exit(f"Start image not found: {start}")
                else:
                    start = MEDIA_DIR / card_id / f"start_{style_name}.png"
                    if not start.is_file() and not card.get("video_start_prompt"):
                        start = MEDIA_DIR / card_id / f"card_{style_name}.png"
                    if not start.is_file():
                        print(f"skip {card_id} video: no {start.name} yet")
                        continue
                values["IMAGE"] = upload_image(args.host, start)
            if needs_end:
                end = MEDIA_DIR / card_id / f"card_{style_name}.png"
                if not card.get("video_start_prompt"):
                    print(f"skip {card_id} video: first+last frame needs a card with a video_start_prompt")
                    continue
                if not end.is_file():
                    print(f"skip {card_id} video: no {end.name} yet")
                    continue
                values["END_IMAGE"] = upload_image(args.host, end)
            for i in range(args.variants):
                seed = base_seed + i
                prompt = fill(workflow, {**values, "SEED": seed})
                result = json.loads(api(args.host, "/prompt", {"prompt": prompt, "client_id": client_id}))
                print(f"{card_id} {role} [{i + 1}/{args.variants}] style={style_name} seed={seed} workflow={Path(workflow_path).name} queued ...", flush=True)
                outputs = wait_for(args.host, result["prompt_id"], args.timeout)
                saved = download_outputs(args.host, outputs, MEDIA_DIR / card_id)
                if args.variants == 1 and len(saved) == 1 and not existing_final(card_id, style_name, role):
                    saved = [saved[0].replace(saved[0].with_name(f"{role}_{style_name}{saved[0].suffix}"))]
                for f in saved:
                    print(f"  saved {f.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
