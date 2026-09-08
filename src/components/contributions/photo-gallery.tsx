"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { ContributionDetailDTO } from "../../server/queries/contributions";
import { Button } from "../ui/primitives";
import { Dialog } from "../ui/overlays";

type Photo = ContributionDetailDTO["photos"][number];

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [active, setActive] = useState<number | null>(null);
  const photo = active === null ? null : photos[active];
  return (
    <>
      <div className={`detail-photos photo-count-${photos.length}`}>
        {photos.map((item, index) => (
          <button
            type="button"
            className="detail-photo-button"
            onClick={() => setActive(index)}
            aria-label={`Enlarge photo ${index + 1} of ${photos.length}: ${item.alt}`}
            key={`${item.path}-${index}`}
          >
            <Image
              src={item.path}
              width={item.width}
              height={item.height}
              sizes="(max-width: 767px) calc(100vw - 72px), (max-width: 1023px) calc(100vw - 112px), 392px"
              alt={item.alt}
            />
          </button>
        ))}
      </div>
      {photo && (
        <Dialog
          open={active !== null}
          onOpenChange={(open) => !open && setActive(null)}
          className="photo-dialog"
          title={`Photo ${active! + 1} of ${photos.length}`}
          description={photo.alt}
        >
          <div className="lightbox-frame">
            <Image
              src={photo.path}
              width={photo.width}
              height={photo.height}
              sizes="(max-width: 767px) calc(100vw - 64px), 1100px"
              alt={photo.alt}
            />
          </div>
          {photos.length > 1 && (
            <div className="row between lightbox-actions">
              <Button
                variant="secondary"
                onClick={() =>
                  setActive((active! - 1 + photos.length) % photos.length)
                }
              >
                <ChevronLeft size={18} aria-hidden="true" /> Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setActive((active! + 1) % photos.length)}
              >
                Next <ChevronRight size={18} aria-hidden="true" />
              </Button>
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
