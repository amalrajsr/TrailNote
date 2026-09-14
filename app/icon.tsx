import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

/** A compact compass mark that matches the TrailNote wordmark. */
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
          background: "#245c43",
          borderRadius: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            border: "3px solid #ffffff",
            borderRadius: 999,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              position: "absolute",
              top: 5,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom: "17px solid #b45a3c",
            }}
          />
          <div
            style={{
              width: 0,
              height: 0,
              position: "absolute",
              bottom: 5,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "17px solid #ffffff",
            }}
          />
          <div
            style={{
              width: 8,
              height: 8,
              position: "absolute",
              background: "#245c43",
              border: "2px solid #ffffff",
              borderRadius: 999,
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
