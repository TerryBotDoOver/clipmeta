"use client";
import { useState } from "react";

const ARCADE_THUMB = "https://app.arcade.software/og/WGXcx6Ps8BJIvPs4iDw7";
const ARCADE_SRC =
  "https://demo.arcade.software/WGXcx6Ps8BJIvPs4iDw7?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true";

export function ArcadeDemo() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-md overflow-hidden">
      <div
        style={{
          position: "relative",
          paddingBottom: "calc(56.67989417989418% + 41px)",
          height: 0,
          width: "100%",
        }}
      >
        {!loaded && (
          <div
            onClick={() => setLoaded(true)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              borderRadius: "12px",
              cursor: "pointer",
              overflow: "hidden",
            }}
          >
            {/* Thumbnail image */}
            <img
              src={ARCADE_THUMB}
              alt="ClipMeta demo preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />

            {/* Dark overlay for contrast */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.4) 100%)",
                transition: "background 0.2s ease",
              }}
            />

            {/* Play button + label */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "hsl(var(--primary))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 24px rgba(139, 92, 246, 0.4)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                className="group-hover:scale-110"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="white"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 500,
                  color: "white",
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                }}
              >
                Watch interactive demo
              </span>
            </div>
          </div>
        )}
        {loaded && (
          <iframe
            src={ARCADE_SRC}
            title="ClipMeta Demo"
            frameBorder="0"
            allowFullScreen
            allow="clipboard-write"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              colorScheme: "light",
              borderRadius: "12px",
            }}
          />
        )}
      </div>
    </div>
  );
}
