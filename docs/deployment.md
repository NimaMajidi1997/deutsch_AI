# Deployment: deutschai.nimadevops.de

```
push to main --GitHub Actions--> ghcr.io/nimamajidi1997/deutschai:<sha> --ssh--> server: container "deutschai"
content/media --scripts/push_media.py (ssh + tar)--> server: /srv/deutschai/media (bind mount, read-only)
```

- **Code** goes through git and CI (`.github/workflows/deploy.yml`, `.github/scripts/deploy.sh`).
  The image holds `web/` and `content/cards/` only.
- **Media** never goes through git: `content/media/` is uploaded from the GPU PC and mounted into
  the container at `/app/content/media`. Pages and `app/media/[...path]/route.ts` read it per
  request, so new media shows up without a rebuild or restart.
- Container listens on `127.0.0.1:8001` only; nginx terminates TLS and proxies the subdomain.

## Media upload
```powershell
$env:DEUTSCHAI_SERVER = "nima@<server-ip>"     # or pass --host
python scripts/push_media.py                    # dry run
python scripts/push_media.py --apply            # send new/changed files
python scripts/push_media.py --apply --delete   # also remove files deleted locally
```
Only `card|start|video_<style>.<ext>` files are sent. Keep a backup of `content/media/` (it only
lives on the PC and the server).

## One-time setup
1. **GitHub secrets** (repo → Settings → Secrets → Actions): `SSH_PRIVATE_KEY_SERVER`, `SERVER_IP`
   (same values as the nimadevops.de repo) and `SSH_KNOWN_HOSTS` = output of
   `ssh-keyscan <server-ip>`. The registry login uses the built-in `GITHUB_TOKEN`.
   After the first run: Packages → deutschai → Package settings → visibility **Public**, then
   re-run the deploy job (the server pulls without credentials).
2. **Server**: `sudo mkdir -p /srv/deutschai/media && sudo chown nima: /srv/deutschai/media`, then
   run the first media upload.
3. **DNS**: A record `deutschai` → server IP.
4. **nginx**: server block for `deutschai.nimadevops.de` with `proxy_pass http://127.0.0.1:8001;`
   (copy the nimadevops.de block), then `sudo certbot --nginx -d deutschai.nimadevops.de` (or
   whatever issues the nimadevops.de certificate).

## Rollback
The server keeps the last 3 images. `docker images ghcr.io/nimamajidi1997/deutschai`, then rerun
`.github/scripts/deploy.sh` with the older tag, or re-run an older workflow from the Actions tab.
