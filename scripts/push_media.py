"""Upload new or changed media from content/media/ to the server (a small rsync over ssh + tar).

Usage:
    python scripts/push_media.py                    # dry run: lists what would change
    python scripts/push_media.py --apply            # uploads new and changed files
    python scripts/push_media.py --apply --delete   # also removes files you deleted locally

Server: --host, else the DEUTSCHAI_SERVER environment variable (e.g. nima@203.0.113.7).
Target folder: --remote-dir (default /srv/deutschai/media), bind-mounted read-only into the
website container (see docs/deployment.md). The site picks up new files on the next page load.

How changes are found: the server lists its files (path, size, mtime) over one ssh call, and
each local file counts as new (missing there), changed (other size or mtime) or unchanged.
tar keeps the local mtimes, so after an upload the files match and the next run skips them.

Only media the website uses is sent: <role>_<style>.<ext> with role card, start or video.
Numbered variants from comfy_generate.py stay local. Needs ssh and tar (built into Windows 10+).
Standard library only.
"""

import argparse
import os
import re
import shlex
import subprocess
import sys
import tarfile
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / "content" / "media"
SITE_FILE = re.compile(r"^(card|start|video)_[a-z0-9-]+\.(png|jpe?g|webp|mp4|webm)$")
MTIME_SLACK = 2  # seconds; tar stores whole seconds


def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s)


def local_files() -> dict:
    """{relative path (NFC, '/'): (Path, size, mtime)} for the media the website uses."""
    files = {}
    for card in sorted(p for p in MEDIA.iterdir() if p.is_dir()):
        for f in sorted(card.iterdir()):
            if f.is_file() and SITE_FILE.match(f.name):
                st = f.stat()
                files[f"{nfc(card.name)}/{nfc(f.name)}"] = (f, st.st_size, st.st_mtime)
    return files


def ssh(host: str, command: str, data: bytes = b"") -> bytes:
    result = subprocess.run(["ssh", host, command], input=data, capture_output=True)
    if result.returncode != 0:
        sys.exit(f"ssh failed: {result.stderr.decode('utf-8', 'replace').strip()}")
    return result.stdout


def remote_files(host: str, remote_dir: str) -> dict:
    """{relative path (NFC): (path as stored, size, mtime)} for every file on the server."""
    d = shlex.quote(remote_dir)
    out = ssh(host, f"mkdir -p {d} && cd {d} && find . -type f -printf '%P\\t%s\\t%T@\\n'")
    files = {}
    for line in out.decode("utf-8", "replace").splitlines():
        path, size, mtime = line.rsplit("\t", 2)
        files[nfc(path)] = (path, int(size), float(mtime))
    return files


def upload(host: str, remote_dir: str, paths: list, local: dict) -> None:
    """Streams the files as one tar archive into `tar -x` on the server."""
    proc = subprocess.Popen(["ssh", host, f"tar -xf - -C {shlex.quote(remote_dir)}"], stdin=subprocess.PIPE)
    with tarfile.open(fileobj=proc.stdin, mode="w|", format=tarfile.PAX_FORMAT) as tar:
        for rel in paths:
            f, size, _ = local[rel]
            info = tar.gettarinfo(str(f), arcname=rel)
            info.mode, info.uid, info.gid, info.uname, info.gname = 0o644, 0, 0, "", ""
            with open(f, "rb") as fh:
                tar.addfile(info, fh)
            print(f"  sent {rel} ({size / 1e6:.1f} MB)")
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("upload failed (tar on the server returned an error)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--host", default=os.environ.get("DEUTSCHAI_SERVER"), help="ssh target, e.g. nima@203.0.113.7")
    parser.add_argument("--remote-dir", default="/srv/deutschai/media", help="media folder on the server")
    parser.add_argument("--apply", action="store_true", help="upload (default: dry run)")
    parser.add_argument("--delete", action="store_true", help="also delete server files that are gone locally")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")  # umlauts in card names, also when piped
    if not args.host:
        sys.exit("no server: pass --host or set DEUTSCHAI_SERVER")

    local = local_files()
    remote = remote_files(args.host, args.remote_dir)

    new = [p for p in local if p not in remote]
    changed = [
        p for p in local
        if p in remote and (local[p][1] != remote[p][1] or abs(local[p][2] - remote[p][2]) > MTIME_SLACK)
    ]
    gone = [p for p in remote if p not in local] if args.delete else []

    for label, paths in (("new", new), ("changed", changed), ("delete", gone)):
        for p in paths:
            print(f"{label:8} {p}")
    mb = sum(local[p][1] for p in new + changed) / 1e6
    print(f"{len(new)} new, {len(changed)} changed, {len(gone)} to delete, {mb:.1f} MB to send")

    if not args.apply:
        if new or changed or gone:
            print("dry run; add --apply to upload")
        return
    if new or changed:
        upload(args.host, args.remote_dir, new + changed, local)
    if gone:
        names = b"\0".join(remote[p][0].encode("utf-8") for p in gone)
        d = shlex.quote(args.remote_dir)
        ssh(args.host, f"cd {d} && xargs -0 -r rm -f -- && find . -mindepth 1 -type d -empty -delete", names)
        print(f"  deleted {len(gone)} file(s)")
    print("done")


if __name__ == "__main__":
    main()
