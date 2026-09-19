"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Images,
  Info,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { ContributionDetailDTO } from "../../server/queries/contributions";

type Photo = ContributionDetailDTO["photos"][number];

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [active, setActive] = useState<number | null>(null);

  if (photos.length === 0) {
    return null;
  }

  const photo = active === null ? null : photos[active];
  const isSingle = photos.length === 1;

  function movePhoto(direction: -1 | 1) {
    setActive((current) => {
      if (current === null) return null;
      return (current + direction + photos.length) % photos.length;
    });
  }

  return (
    <>
      <section
        className="detail-photo-section"
        aria-labelledby="detail-photos-title"
      >
        <div className="detail-photo-head">
          <div className="detail-photo-title">
            <h2 id="detail-photos-title">Photos</h2>
            <span className="detail-photo-count">{photos.length}</span>
          </div>
          <span className="detail-photo-hint">
            Open a photo to view it in full
          </span>
        </div>

        {isSingle ? (
          <div className="detail-single-photo">
            <button
              type="button"
              className="detail-photo-preview is-single"
              onClick={() => setActive(0)}
              aria-label={`Open photo 1 of 1: ${photos[0].alt}`}
            >
              <Image
                src={photos[0].path}
                width={photos[0].width}
                height={photos[0].height}
                sizes="(max-width: 620px) calc(100vw - 64px), 760px"
                alt={photos[0].alt}
              />
            </button>
            <button
              type="button"
              className="detail-photo-view-all"
              onClick={() => setActive(0)}
              aria-label="View photo"
            >
              <Expand size={16} aria-hidden="true" /> View photo
            </button>
          </div>
        ) : (
          <div className={`detail-photo-gallery photo-count-${photos.length}`}>
            {photos.map((item, index) => (
              <button
                type="button"
                className="detail-photo-preview"
                onClick={() => setActive(index)}
                aria-label={`Open photo ${index + 1} of ${photos.length}: ${item.alt}`}
                key={`${item.path}-${index}`}
              >
                <Image
                  src={item.path}
                  width={item.width}
                  height={item.height}
                  sizes={
                    photos.length === 2
                      ? "(max-width: 620px) calc(100vw - 64px), (max-width: 1023px) 50vw, 380px"
                      : index === 0
                        ? "(max-width: 620px) calc(100vw - 64px), (max-width: 1023px) 62vw, 475px"
                        : "(max-width: 620px) calc(100vw - 64px), (max-width: 1023px) 38vw, 285px"
                  }
                  alt={item.alt}
                />
              </button>
            ))}
            <button
              type="button"
              className="detail-photo-view-all"
              onClick={() => setActive(0)}
              aria-label={`View all ${photos.length} photos`}
            >
              <Images size={16} aria-hidden="true" /> View all {photos.length}{" "}
              photos
            </button>
          </div>
        )}

       
      </section>

      <DialogPrimitive.Root
        open={active !== null}
        onOpenChange={(open) => !open && setActive(null)}
      >
        {photo && (
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="detail-photo-lightbox-backdrop" />
            <DialogPrimitive.Content
              className="detail-photo-lightbox"
              onKeyDown={(event) => {
                if (photos.length === 1) return;
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  movePhoto(-1);
                }
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  movePhoto(1);
                }
              }}
            >
              <header className="detail-photo-lightbox-head">
                <DialogPrimitive.Title className="detail-photo-lightbox-counter">
                  <span className="sr-only">Photo </span>
                  {active! + 1} / {photos.length}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="detail-photo-lightbox-alt">
                  {photo.alt}
                </DialogPrimitive.Description>
                <DialogPrimitive.Close
                  type="button"
                  className="detail-photo-lightbox-button detail-photo-lightbox-close"
                  aria-label="Close photo viewer"
                >
                  <X size={21} aria-hidden="true" />
                </DialogPrimitive.Close>
              </header>

              <div className="detail-photo-lightbox-stage">
                {photos.length > 1 && (
                  <button
                    type="button"
                    className="detail-photo-lightbox-button detail-photo-lightbox-arrow is-previous"
                    onClick={() => movePhoto(-1)}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft size={24} aria-hidden="true" />
                  </button>
                )}
                <Image
                  className="detail-photo-lightbox-image"
                  src={photo.path}
                  width={photo.width}
                  height={photo.height}
                  sizes="100vw"
                  alt={photo.alt}
                />
                {photos.length > 1 && (
                  <button
                    type="button"
                    className="detail-photo-lightbox-button detail-photo-lightbox-arrow is-next"
                    onClick={() => movePhoto(1)}
                    aria-label="Next photo"
                  >
                    <ChevronRight size={24} aria-hidden="true" />
                  </button>
                )}
              </div>

              {photos.length > 1 && (
                <div
                  className="detail-photo-thumbnails"
                  role="group"
                  aria-label="Photo thumbnails"
                >
                  {photos.map((item, index) => (
                    <button
                      type="button"
                      className={`detail-photo-thumbnail${index === active ? " is-active" : ""}`}
                      onClick={() => setActive(index)}
                      aria-label={`View photo ${index + 1}`}
                      aria-pressed={index === active}
                      key={`${item.path}-thumbnail`}
                    >
                      <Image
                        src={item.path}
                        width={item.width}
                        height={item.height}
                        sizes="54px"
                        alt=""
                      />
                    </button>
                  ))}
                </div>
              )}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </DialogPrimitive.Root>
    </>
  );
}
