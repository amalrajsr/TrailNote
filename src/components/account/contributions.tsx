"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteOwnTip } from "../../../app/me/actions";
import { Dialog } from "../ui/overlays";
import { Button } from "../ui/primitives";

type Tip = {
  id: string;
  title: string;
  body: string;
  revision: number;
  status: string;
  destination: { name: string };
};
export function MyContributions({ tips }: { tips: Tip[] }) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  if (!tips.length)
    return (
      <section className="empty-state">
        <h2>Your first tip could make someone&apos;s trip easier.</h2>
        <Link className="btn" href="/search">
          Find a destination
        </Link>
      </section>
    );
  return (
    <div className="stack">
      {tips.map((tip) => (
        <article className="tip-card" key={tip.id}>
          <p className="eyebrow">
            {tip.destination.name} · {tip.status}
          </p>
          <h2>
            <Link href={`/tips/${tip.id}`}>{tip.title}</Link>
          </h2>
          <p>{tip.body}</p>
          <div className="row">
            <Link className="btn secondary" href={`/tips/${tip.id}/edit`}>
              Edit
            </Link>
            <Dialog
              title="Delete this tip?"
              description="It will no longer be visible to travelers."
              trigger={
                <button type="button" className="btn danger">
                  Delete
                </button>
              }
            >
              <Button
                busy={pending}
                type="button"
                className="danger"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteOwnTip(tip.id, tip.revision);
                    setMessage(result.ok ? "Tip deleted." : result.message);
                  })
                }
              >
                Delete
              </Button>
            </Dialog>
          </div>
        </article>
      ))}
      {message && (
        <p className="status-message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
