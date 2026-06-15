import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
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
          background: "#c96442",
          borderRadius: 112,
        }}
      >
        <div
          style={{
            width: 280,
            height: 340,
            background: "rgba(255,255,255,0.95)",
            borderRadius: 28,
            display: "flex",
            flexDirection: "column",
            gap: 28,
            padding: "48px 40px",
          }}
        >
          <div style={{ height: 24, width: 200, background: "#c96442", borderRadius: 12 }} />
          <div style={{ height: 24, width: 150, background: "rgba(201,100,66,0.7)", borderRadius: 12 }} />
          <div style={{ height: 24, width: 170, background: "rgba(201,100,66,0.5)", borderRadius: 12 }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
