declare module "fluent-ffmpeg" {
  import type { Readable } from "stream";

  interface FfmpegCommand {
    format(fmt: string): FfmpegCommand;
    audioCodec(codec: string): FfmpegCommand;
    audioBitrate(bitrate: number | string): FfmpegCommand;
    on(event: "error", listener: (err: Error) => void): FfmpegCommand;
    on(event: string, listener: (...args: unknown[]) => void): FfmpegCommand;
    pipe(): Readable;
  }

  interface FfmpegOptions {
    source: Readable;
  }

  interface FfmpegStatic {
    (options?: FfmpegOptions | string): FfmpegCommand;
    setFfmpegPath(path: string): void;
  }

  const ffmpeg: FfmpegStatic;
  export default ffmpeg;
}
