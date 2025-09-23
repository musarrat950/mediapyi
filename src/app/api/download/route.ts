import { NextRequest } from "next/server";
import ytdl, { chooseFormat, getInfo, type videoInfo, type videoFormat } from "@distube/ytdl-core";
import { extractVideoId } from "@/api/youtube";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

// Ensure Node.js runtime (not Edge) for Node stream compatibility
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withCORS(init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");
  return { ...init, headers };
}

function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|\u0000-\u001F\u007F]+/g, " ").trim();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const input = (searchParams.get("id") || searchParams.get("input") || searchParams.get("url") || "").toString().trim();
    const type = (searchParams.get("type") || "video").toString(); // "video" | "audio"

    if (!input) {
      return new Response(JSON.stringify({ error: "Missing input (YouTube URL or videoId)" }), withCORS({ status: 400 }));
    }

    const id = extractVideoId(input);
    if (!id) {
      return new Response(JSON.stringify({ error: "Unable to resolve a video from the provided input" }), withCORS({ status: 404 }));
    }

    const url = `https://www.youtube.com/watch?v=${id}`;

    // Fetch full info to select appropriate format and set headers
    const info: videoInfo = await getInfo(url);

    // Filter formats based on desired type
    const wantAudioOnly = type === "audio";
    if (wantAudioOnly) {
      // Audio-only: transcode to MP3 using ffmpeg
      if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath as string);

      const title = sanitizeFilename(info.videoDetails.title || id);
      const filename = `${title}.mp3`;

      // Source audio stream (best audio-only stream)
      const audioFormatCandidates = info.formats.filter((f: videoFormat) => f.hasAudio);
      if (!audioFormatCandidates.length) {
        return new Response(JSON.stringify({ error: "No audio formats found for this video." }), withCORS({ status: 422 }));
      }
      const source = ytdl.downloadFromInfo(info, { filter: "audioonly", quality: "highestaudio" });

      // Build ffmpeg pipeline -> mp3
      const ff = ffmpeg({ source })
        .format("mp3")
        .audioCodec("libmp3lame")
        .audioBitrate(192)
        .on("error", (err: unknown) => {
          // The error will be surfaced to the ReadableStream
        });

      const ffStream = ff.pipe();

      const readable = new ReadableStream<Uint8Array>({
        start(controller) {
          ffStream.on("data", (chunk: Uint8Array) => controller.enqueue(chunk));
          ffStream.on("end", () => controller.close());
          ffStream.on("error", (err: unknown) => controller.error(err));
        },
        cancel() {
          try {
            ffStream.destroy();
          } catch {}
          try {
            source.destroy();
          } catch {}
        },
      });

      return new Response(readable, withCORS({
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
          "Cache-Control": "no-store",
        },
      }));
    } else {
      // Video+Audio: stream a muxed format without transcoding
      const filtered = info.formats.filter((f: videoFormat) => f.hasAudio && f.hasVideo);
      if (!filtered.length) {
        return new Response(JSON.stringify({ error: "No matching muxed formats found for this video." }), withCORS({ status: 422 }));
      }
      const best = chooseFormat(filtered, { quality: "highest" });

      const mime = best.mimeType?.split(";")[0] || "video/mp4";
      let ext = "mp4";
      if (mime.includes("webm")) ext = "webm";
      else if (mime.includes("mp4")) ext = "mp4";
      else if (mime.includes("x-matroska") || mime.includes("matroska")) ext = "mkv";

      const title = sanitizeFilename(info.videoDetails.title || id);
      const filename = `${title}.${ext}`;

      const stream = ytdl.downloadFromInfo(info, { format: best });

      const readable = new ReadableStream<Uint8Array>({
        start(controller) {
          stream.on("data", (chunk: Uint8Array) => controller.enqueue(chunk));
          stream.on("end", () => controller.close());
          stream.on("error", (err: unknown) => controller.error(err));
        },
        cancel() {
          try { stream.destroy(); } catch {}
        },
      });

      return new Response(readable, withCORS({
        status: 200,
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
          "Cache-Control": "no-store",
        },
      }));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: message }), withCORS({ status: 500 }));
  }
}

export async function OPTIONS() {
  return new Response(null, withCORS({ status: 204 }));
}
