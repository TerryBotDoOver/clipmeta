export type ExtractedFrame = {
  dataUrl: string;      // base64 PNG — ready to send to OpenAI vision
  timestampSeconds: number;
};

/**
 * Extract representative frames from a video File using the browser's
 * canvas API. No server or ffmpeg required.
 *
 * @param file     - The video File object (already in the browser)
 * @param count    - How many frames to extract (default: 4)
 * @returns        - Array of ExtractedFrame objects
 */
export async function extractFrames(
  file: File,
  count = 4
): Promise<ExtractedFrame[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    video.addEventListener("loadedmetadata", () => {
      const duration = video.duration;

      if (!duration || duration === Infinity) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not read video duration."));
        return;
      }

      // Spread frames evenly — skip first and last 5% to avoid black frames
      const margin = duration * 0.05;
      const usable = duration - margin * 2;
      const timestamps = Array.from({ length: count }, (_, i) =>
        margin + (usable / (count - 1)) * i
      );

      captureFramesSequentially(video, timestamps, objectUrl)
        .then(resolve)
        .catch(reject);
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load video for frame extraction."));
    });
  });
}

async function captureFramesSequentially(
  video: HTMLVideoElement,
  timestamps: number[],
  objectUrl: string
): Promise<ExtractedFrame[]> {
  const frames: ExtractedFrame[] = [];
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Canvas context unavailable.");
  }

  for (const ts of timestamps) {
    const frame = await seekAndCapture(video, canvas, ctx, ts);
    frames.push(frame);
  }

  URL.revokeObjectURL(objectUrl);
  return frames;
}

function seekAndCapture(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  timestamp: number
): Promise<ExtractedFrame> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Seek timed out at ${timestamp}s`));
    }, 8000);

    video.addEventListener(
      "seeked",
      () => {
        clearTimeout(timeout);
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        resolve({ dataUrl, timestampSeconds: timestamp });
      },
      { once: true }
    );

    video.currentTime = timestamp;
  });
}
