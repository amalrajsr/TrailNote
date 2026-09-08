"use client";

const MAX_SOURCE_BYTES = 20_000_000;
const MAX_SOURCE_PIXELS = 40_000_000;
const MAX_SOURCE_EDGE = 12_000;
const MAX_RELAY_BYTES = 3_000_000;
const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const passes = [
  { edge: 2560, quality: 0.9 },
  { edge: 2560, quality: 0.82 },
  { edge: 2560, quality: 0.74 },
  { edge: 2048, quality: 0.8 },
] as const;

export class PhotoPreparationError extends Error {}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new PhotoPreparationError("This photo could not be prepared."),
            ),
      "image/jpeg",
      quality,
    );
  });
}

function containsAscii(bytes: Uint8Array, value: string) {
  const pattern = new TextEncoder().encode(value);
  for (let index = 0; index <= bytes.length - pattern.length; index += 1) {
    let matches = true;
    for (let offset = 0; offset < pattern.length; offset += 1) {
      if (bytes[index + offset] !== pattern[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

export async function preparePhoto(file: File): Promise<Blob> {
  if (!SUPPORTED_TYPES.has(file.type))
    throw new PhotoPreparationError(
      "Choose a JPEG, PNG, or WebP still image. HEIC and animated images are not supported yet.",
    );
  if (!file.size || file.size > MAX_SOURCE_BYTES)
    throw new PhotoPreparationError("Choose a photo smaller than 20 MB.");

  const sourceBytes = new Uint8Array(await file.arrayBuffer());
  if (
    (file.type === "image/webp" &&
      (containsAscii(sourceBytes, "ANIM") ||
        containsAscii(sourceBytes, "ANMF"))) ||
    (file.type === "image/png" && containsAscii(sourceBytes, "acTL"))
  )
    throw new PhotoPreparationError(
      "Animated images are not supported. Choose a still photo.",
    );

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(
      new Blob([sourceBytes], { type: file.type }),
      {
        imageOrientation: "from-image",
      },
    );
  } catch {
    throw new PhotoPreparationError(
      "This photo could not be opened. Choose another JPEG, PNG, or WebP image.",
    );
  }

  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width > MAX_SOURCE_EDGE ||
      bitmap.height > MAX_SOURCE_EDGE ||
      bitmap.width * bitmap.height > MAX_SOURCE_PIXELS
    )
      throw new PhotoPreparationError(
        "This photo is too large. Choose an image under 40 megapixels.",
      );

    for (const pass of passes) {
      const scale = Math.min(
        1,
        pass.edge / Math.max(bitmap.width, bitmap.height),
      );
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context)
        throw new PhotoPreparationError("This browser cannot prepare photos.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvasBlob(canvas, pass.quality);
      canvas.width = 1;
      canvas.height = 1;
      if (blob.size <= MAX_RELAY_BYTES) return blob;
    }
  } finally {
    bitmap.close();
  }

  throw new PhotoPreparationError(
    "This photo is still too large after preparation. Try another photo.",
  );
}
