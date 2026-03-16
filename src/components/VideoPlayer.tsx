"use client";

import { useState } from "react";

export function VideoPlayer({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-black">
      <video
        src={src}
        controls
        preload="none"
        onError={() => setFailed(true)}
        className="max-h-52 w-full object-contain"
      />
    </div>
  );
}
