declare module "fluent-ffmpeg" {
  type FfmpegCommand = any;

  interface FfmpegStatic {
    (options?: any): FfmpegCommand;
    setFfmpegPath(path: string): void;
  }

  const ffmpeg: FfmpegStatic;
  export default ffmpeg;
}
