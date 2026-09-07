"use client";
import type { ImageLoaderProps } from "next/image";
export default function imageKitLoader({ src, width, quality }: ImageLoaderProps) {
  if (!src.startsWith("/fieldnotes/")) return src;
  const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (!endpoint) return src;
  return `${endpoint.replace(/\/$/, "")}/tr:w-${width},q-${quality ?? 78},f-auto/${src.replace(/^\//, "")}`;
}
