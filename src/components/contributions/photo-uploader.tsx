"use client";

/* eslint-disable @next/next/no-img-element -- local object URLs cannot use the configured ImageKit loader */

import { ArrowDown, ArrowUp, ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button, Input } from "../ui/primitives";
import imageKitLoader from "../../lib/imagekit-loader";

export type UploadedPhoto = {
  id: string;
  path: string;
  width: number;
  height: number;
  bytes: number;
  alt: string;
};

type PhotoItem = {
  localId: string;
  file?: File;
  previewUrl?: string;
  requestId: string;
  slot: number;
  status: "preparing" | "uploading" | "ready" | "error";
  error?: string;
  uploaded?: UploadedPhoto;
  alt: string;
};

type UploadResponse = Omit<UploadedPhoto, "alt"> & {
  code?: string;
  message?: string;
};

const MAX_PHOTOS = 3;

function restoredItem(photo: UploadedPhoto, index: number): PhotoItem {
  return {
    localId: photo.id,
    requestId: crypto.randomUUID(),
    slot: index,
    status: "ready",
    uploaded: photo,
    alt: photo.alt,
  };
}

export function PhotoUploader({
  signedIn,
  photos,
  onChange,
  onBusyChange,
  onRequireAuth,
}: {
  signedIn: boolean;
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  onBusyChange: (busy: boolean) => void;
  onRequireAuth: () => void;
}) {
  const [items, setItems] = useState<PhotoItem[]>(() =>
    photos.map(restoredItem),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  const controllers = useRef(new Map<string, AbortController>());

  useEffect(() => {
    itemsRef.current = items;
    onBusyChange(
      items.some(
        ({ status }) => status === "preparing" || status === "uploading",
      ),
    );
    onChange(
      items.flatMap((item) =>
        item.status === "ready" && item.uploaded
          ? [{ ...item.uploaded, alt: item.alt }]
          : [],
      ),
    );
  }, [items, onBusyChange, onChange]);

  useEffect(
    () => () => {
      for (const controller of controllers.current.values()) controller.abort();
      for (const item of itemsRef.current)
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    },
    [],
  );

  async function upload(item: PhotoItem) {
    if (!item.file) return;
    const controller = new AbortController();
    controllers.current.set(item.localId, controller);
    try {
      const { preparePhoto } = await import("../../lib/photo-normalization");
      const prepared = await preparePhoto(item.file);
      setItems((current) =>
        current.map((entry) =>
          entry.localId === item.localId
            ? { ...entry, status: "uploading", error: undefined }
            : entry,
        ),
      );
      const body = new FormData();
      body.set("uploadRequestId", item.requestId);
      body.set("slot", String(item.slot));
      body.set("file", prepared, "prepared.jpg");
      const response = await fetch("/api/uploads", {
        method: "POST",
        body,
        signal: controller.signal,
      });
      const result = (await response.json()) as UploadResponse;
      if (!response.ok)
        throw new Error(result.message || "The photo could not be uploaded.");
      setItems((current) =>
        current.map((entry) =>
          entry.localId === item.localId
            ? {
                ...entry,
                status: "ready",
                uploaded: { ...result, alt: entry.alt },
                error: undefined,
              }
            : entry,
        ),
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      setItems((current) =>
        current.map((entry) =>
          entry.localId === item.localId
            ? {
                ...entry,
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "The photo could not be uploaded.",
              }
            : entry,
        ),
      );
    } finally {
      controllers.current.delete(item.localId);
    }
  }

  function choosePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(
      0,
      MAX_PHOTOS - items.length,
    );
    event.target.value = "";
    if (!files.length) return;
    const requestId = crypto.randomUUID();
    const added = files.map<PhotoItem>((file, index) => ({
      localId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      requestId,
      slot: items.length + index,
      status: "preparing",
      alt: "",
    }));
    setItems((current) => [...current, ...added]);
    for (const item of added) void upload(item);
  }

  function retry(item: PhotoItem) {
    const retried = {
      ...item,
      requestId: crypto.randomUUID(),
      status: "preparing" as const,
      error: undefined,
    };
    setItems((current) =>
      current.map((entry) =>
        entry.localId === item.localId ? retried : entry,
      ),
    );
    void upload(retried);
  }

  function remove(item: PhotoItem) {
    controllers.current.get(item.localId)?.abort();
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    if (item.uploaded)
      void fetch(`/api/uploads/${encodeURIComponent(item.uploaded.id)}`, {
        method: "DELETE",
      });
    setItems((current) =>
      current.filter((entry) => entry.localId !== item.localId),
    );
  }

  function move(index: number, offset: -1 | 1) {
    setItems((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[target]] = [
        reordered[target],
        reordered[index],
      ];
      return reordered;
    });
  }

  const busy = items.some(
    ({ status }) => status === "preparing" || status === "uploading",
  );

  return (
    <section className="photo-uploader" aria-labelledby="photos-label">
      <div className="row between">
        <div>
          <h3 id="photos-label">
            Photos <span className="optional">(optional)</span>
          </h3>
          <p className="small muted">
            Up to 3 photos. JPEG, PNG, or WebP; 20 MB each.
          </p>
        </div>
        {signedIn ? (
          <Button
            type="button"
            variant="secondary"
            disabled={items.length >= MAX_PHOTOS || busy}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus size={18} aria-hidden />
            Add photos
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={onRequireAuth}>
            <ImagePlus size={18} aria-hidden />
            Add photos
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        className="visually-hidden-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        aria-label="Choose photo files"
        tabIndex={-1}
        onChange={choosePhotos}
      />

      {items.length > 0 && (
        <ol className="photo-list" aria-label="Selected photos">
          {items.map((item, index) => {
            const source =
              item.previewUrl ??
              (item.uploaded
                ? imageKitLoader({
                    src: item.uploaded.path,
                    width: 240,
                    quality: 72,
                  })
                : undefined);
            return (
              <li className="photo-item" key={item.localId}>
                <div className="photo-preview">
                  {source ? (
                    <img src={source} alt="" />
                  ) : (
                    <ImagePlus aria-hidden />
                  )}
                </div>
                <div className="photo-copy">
                  <p className="photo-status" role="status">
                    {item.status === "preparing" && "Preparing photo…"}
                    {item.status === "uploading" && "Uploading and verifying…"}
                    {item.status === "ready" &&
                      `Ready · ${Math.max(1, Math.round((item.uploaded?.bytes ?? 0) / 1000))} KB`}
                    {item.status === "error" && item.error}
                  </p>
                  {item.status === "ready" && item.uploaded && (
                    <>
                      <input
                        type="hidden"
                        name="photoId"
                        value={item.uploaded.id}
                      />
                      <label
                        className="small"
                        htmlFor={`photo-alt-${item.localId}`}
                      >
                        Description <span className="optional">(optional)</span>
                      </label>
                      <Input
                        id={`photo-alt-${item.localId}`}
                        name="photoAlt"
                        maxLength={160}
                        value={item.alt}
                        placeholder="What is useful in this photo?"
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((entry) =>
                              entry.localId === item.localId
                                ? { ...entry, alt: event.target.value }
                                : entry,
                            ),
                          )
                        }
                      />
                    </>
                  )}
                  <div className="photo-actions">
                    <Button
                      type="button"
                      variant="quiet"
                      disabled={index === 0}
                      aria-label={`Move photo ${index + 1} up`}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={18} aria-hidden /> Up
                    </Button>
                    <Button
                      type="button"
                      variant="quiet"
                      disabled={index === items.length - 1}
                      aria-label={`Move photo ${index + 1} down`}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={18} aria-hidden /> Down
                    </Button>
                    {item.status === "error" && item.file && (
                      <Button
                        type="button"
                        variant="quiet"
                        onClick={() => retry(item)}
                      >
                        <RotateCcw size={18} aria-hidden /> Retry
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="quiet"
                      className="danger-action"
                      onClick={() => remove(item)}
                    >
                      <Trash2 size={18} aria-hidden /> Remove
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {items.length >= MAX_PHOTOS && (
        <p className="small muted">You have added the maximum of 3 photos.</p>
      )}
    </section>
  );
}
