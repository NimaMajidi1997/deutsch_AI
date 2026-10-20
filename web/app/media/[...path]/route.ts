import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { MEDIA } from "@/lib/cards";

// Serves ../content/media at request time. public/ is only scanned when the server starts, so
// files uploaded later by scripts/push_media.py would not show up there. next/image fetches
// these URLs internally, so optimization still works. URLs from lib/cards.ts start with a version
// segment (v<mtime>), so they never change content and can be cached for good.

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

/** Finds `parts` under MEDIA, matching names in NFC form (umlauts may be stored either way). */
function resolve(parts: string[]): string | null {
  let dir = MEDIA;
  for (const part of parts) {
    const want = part.normalize("NFC");
    if (!want || want === "." || want === ".." || want.includes("/") || want.includes("\\")) return null;
    const name = fs.existsSync(dir) ? fs.readdirSync(dir).find((n) => n.normalize("NFC") === want) : undefined;
    if (!name) return null;
    dir = path.join(dir, name);
  }
  return dir;
}

export async function GET(req: NextRequest, ctx: RouteContext<"/media/[...path]">) {
  const parts = (await ctx.params).path;
  const versioned = /^v\d+$/.test(parts[0] ?? "");
  const file = resolve(versioned ? parts.slice(1) : parts);
  const type = file && TYPES[path.extname(file).toLowerCase()];
  const stat = file && type ? fs.statSync(/*turbopackIgnore: true*/ file, { throwIfNoEntry: false }) : undefined;
  if (!file || !type || !stat?.isFile()) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Last-Modified": stat.mtime.toUTCString(),
    "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=3600",
  });

  // Videos are fetched in ranges (seeking; Safari requires it).
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  let start = 0;
  let end = stat.size - 1;
  if (range && (range[1] || range[2])) {
    start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
    end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
    if (start > end) {
      headers.set("Content-Range", `bytes */${stat.size}`);
      return new Response(null, { status: 416, headers });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${stat.size}`);
  }
  headers.set("Content-Length", String(end - start + 1));

  const body = Readable.toWeb(fs.createReadStream(/*turbopackIgnore: true*/ file, { start, end })) as ReadableStream;
  return new Response(body, { status: range && (range[1] || range[2]) ? 206 : 200, headers });
}
