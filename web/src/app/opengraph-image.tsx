import { ImageResponse } from "next/og";

export const alt = "SOMANADH.OS — The human behind the intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#08090D",
          padding: "72px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(55% 55% at 78% 28%, rgba(0,229,255,0.20), transparent 65%), radial-gradient(40% 40% at 12% 90%, rgba(137,87,255,0.18), transparent 70%)",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                border: "1px solid rgba(220,229,242,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#DCE5F2",
                fontSize: 18,
                letterSpacing: "0.05em",
              }}
            >
              SK
            </div>
            <span style={{ color: "#8B93A7", fontSize: 16, letterSpacing: "0.32em" }}>
              SOMANADH.OS
            </span>
          </div>
          <span style={{ color: "#00E5FF", fontSize: 15, letterSpacing: "0.3em" }}>
            LIVING INTELLIGENCE
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 110,
              lineHeight: 0.9,
              color: "#DCE5F2",
              letterSpacing: "-0.055em",
              fontWeight: 600,
            }}
          >
            SOMANADH K
          </div>
          <div
            style={{
              marginTop: 26,
              fontSize: 34,
              color: "#8B93A7",
              letterSpacing: "-0.02em",
            }}
          >
            Building systems that think.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: "1px solid rgba(220,229,242,0.14)",
            paddingTop: 24,
          }}
        >
          <div style={{ display: "flex", gap: 26, color: "#DCE5F2", fontSize: 17 }}>
            <span>AI ENGINEERING</span>
            <span style={{ color: "#00E5FF" }}>·</span>
            <span>BACKEND</span>
            <span style={{ color: "#00E5FF" }}>·</span>
            <span>AGENTS + RAG</span>
          </div>
          <span style={{ color: "#8B93A7", fontSize: 15, letterSpacing: "0.2em" }}>
            VERIFIED RECORDS · GROUNDED AI
          </span>
        </div>
      </div>
    ),
    size,
  );
}
