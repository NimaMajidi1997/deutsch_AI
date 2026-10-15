#!/bin/bash
# Runs on the server: pulls the new image and restarts the container.
# Usage: deploy.sh <image:tag>   (public ghcr.io image, no login needed)
set -euo pipefail

IMAGE="$1"
CONTAINER_NAME=deutschai
MEDIA_DIR=/srv/deutschai/media   # filled by scripts/push_media.py
PORT=8001                        # nginx proxies deutschai.nimadevops.de here

echo "📥 Pulling $IMAGE..."
docker pull "$IMAGE"

echo "🔄 Replacing container..."
mkdir -p "$MEDIA_DIR"
docker rm -f "$CONTAINER_NAME" || true
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 127.0.0.1:$PORT:3000 \
  -v "$MEDIA_DIR":/app/content/media:ro \
  "$IMAGE"

echo "🧼 Removing old deutschai images (keeping the newest 3 for rollback)..."
docker images "${IMAGE%:*}" --format '{{.ID}}' | awk '!seen[$0]++' | tail -n +4 | xargs -r docker rmi -f || true

echo "✅ deutschAI deployed: $IMAGE"
