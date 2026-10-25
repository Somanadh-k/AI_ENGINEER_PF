import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090D",
          color: "#DCE5F2",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.05em",
          position: "relative",
          border: "1px solid rgba(220,229,242,0.2)",
        }}
      >
        SK
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 6,
            height: 6,
            background: "#00E5FF",
          }}
        />
      </div>
    ),
    size,
  );
}
