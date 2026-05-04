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
/** Codecs the browser usually can't decode — resolve empty instead of hanging */
export const UNSUPPORTED_FRAME_EXTENSIONS = ['.mov', '.mxf', '.avi', '.r3d', '.braw', '.dng'];
export const CLIENT_FRAME_EXTRACTION_MAX_BYTES = 500 * 1024 * 1024;

export async function extractFrames(
  file: File,
  count = 4
): Promise<ExtractedFrame[]> {
  // Skip frame extraction entirely for very large files (>500 MB) or known-unsupported codecs
  // These would require downloading the full file to the browser which is wasteful,
  // and ProRes / RAW codecs can't be decoded in Chrome anyway.
  const ext = (file.name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
  if (file.size > CLIENT_FRAME_EXTRACTION_MAX_BYTES || UNSUPPORTED_FRAME_EXTENSIONS.includes(ext)) {
    console.warn(`Skipping frame extraction: ${file.name} (${(file.size / 1024 / 1024).toFixed(0)} MB, ext=${ext})`);
    return [];
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    // Global timeout — if frame extraction takes more than 20s total, give up gracefully
    const globalTimeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      console.warn(`Frame extraction timed out for ${file.name}, proceeding without frames`);
      resolve([]);
    }, 20_000);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    video.addEventListener("loadedmetadata", () => {
      const duration = video.duration;

      if (!duration || duration === Infinity) {
        clearTimeout(globalTimeout);
        URL.revokeObjectURL(objectUrl);
        resolve([]); // graceful fallback instead of reject
        return;
      }

      // Spread frames evenly — skip first and last 5% to avoid black frames
      const margin = duration * 0.05;
      const usable = duration - margin * 2;
      const timestamps = Array.from({ length: count }, (_, i) =>
        margin + (usable / (count - 1)) * i
      );

      captureFramesSequentially(video, timestamps, objectUrl)
        .then((frames) => {
          clearTimeout(globalTimeout);
          resolve(frames);
        })
        .catch(() => {
          clearTimeout(globalTimeout);
          resolve([]); // graceful fallback
        });
    });

    video.addEventListener("error", () => {
      clearTimeout(globalTimeout);
      URL.revokeObjectURL(objectUrl);
      resolve([]); // graceful fallback instead of reject
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

const MAX_FRAME_WIDTH = 768; // Keeps base64 payload small; GPT-4o low detail = 512px anyway

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

        // Scale down to keep payload under Vercel's 4.5 MB body limit
        let w = video.videoWidth;
        let h = video.videoHeight;
        if (w > MAX_FRAME_WIDTH) {
          const scale = MAX_FRAME_WIDTH / w;
          w = MAX_FRAME_WIDTH;
          h = Math.round(h * scale);
        }

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve({ dataUrl, timestampSeconds: timestamp });
      },
      { once: true }
    );

    video.currentTime = timestamp;
  });
}
