"use client";

import {
  ArrowUpRight,
  Eye,
  EyeOff,
  LogOut,
  MapPin,
  Pencil,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteOwnTip } from "../../../app/me/actions";
import { authClient } from "../../lib/auth-client";
import { categoryLabels, type Category } from "../../lib/constants";
import { CategoryIcon } from "../ui/category-icon";
import { Dialog } from "../ui/overlays";
import { Button } from "../ui/primitives";

type Tip = {
  id: string;
  title: string;
  body: string;
  revision: number;
  status: string;
  category: Category;
  destination: { name: string; slug: string };
};

export function AccountSignOut() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="quiet"
      busy={pending}
      className="account-sign-out"
      onClick={() =>
        startTransition(async () => {
          await authClient.signOut();
          for (const key of Object.keys(sessionStorage))
            if (key.startsWith("fieldnotes:draft:"))
              sessionStorage.removeItem(key);
          router.push("/");
          router.refresh();
        })
      }
    >
      <LogOut size={16} aria-hidden="true" /> Sign out
    </Button>
  );
}

function ContributionRow({
  tip,
  onDeleted,
}: {
  tip: Tip;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const isPublished = tip.status === "published";
  const isDeleted = tip.status === "deleted";
  const statusLabel = isPublished
    ? "Published"
    : tip.status === "hidden"
      ? "Hidden"
      : "Deleted";

  return (
    <article className="account-tip-card">
      <div className="account-tip-topline">
        <Link
          href={`/destinations/${tip.destination.slug}`}
          className="account-destination"
        >
          <MapPin size={15} aria-hidden="true" /> {tip.destination.name}
        </Link>
        <span className="account-status" data-status={tip.status}>
          {isPublished ? (
            <Eye size={14} aria-hidden="true" />
          ) : isDeleted ? (
            <Trash2 size={14} aria-hidden="true" />
          ) : (
            <EyeOff size={14} aria-hidden="true" />
          )}
          {statusLabel}
        </span>
      </div>

      <div className={`category-label ${tip.category}`}>
        <CategoryIcon category={tip.category} />
        {categoryLabels[tip.category]}
      </div>
      <h2>
        {isPublished ? (
          <Link href={`/tips/${tip.id}`}>{tip.title}</Link>
        ) : (
          tip.title
        )}
      </h2>
      <p className="account-tip-copy">{tip.body}</p>

      {!isDeleted && (
        <footer className="account-tip-actions">
          {isPublished && (
            <Link className="account-read-link" href={`/tips/${tip.id}`}>
              Read tip <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          )}
          <div className="row">
            <Link className="btn secondary" href={`/tips/${tip.id}/edit`}>
              <Pencil size={16} aria-hidden="true" /> Edit
            </Link>
            <Dialog
              open={open}
              onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) setError("");
              }}
              className="delete-tip-dialog"
              title="Delete this tip?"
              description="It will no longer be visible to travelers. This action cannot be undone."
              icon={
                <span className="delete-tip-icon" aria-hidden="true">
                  <TriangleAlert size={23} />
                </span>
              }
              trigger={
                <button type="button" className="btn account-delete-trigger">
                  <Trash2 size={16} aria-hidden="true" /> Delete
                </button>
              }
            >
              <div className="delete-tip-context">
                <span>{tip.destination.name}</span>
                <strong>{tip.title}</strong>
              </div>
              {error && (
                <p className="delete-tip-error" role="alert">
                  {error}
                </p>
              )}
              <div className="delete-tip-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  busy={pending}
                  type="button"
                  className="danger"
                  onClick={() =>
                    startTransition(async () => {
                      setError("");
                      const result = await deleteOwnTip(tip.id, tip.revision);
                      if (result.ok) {
                        setOpen(false);
                        onDeleted();
                        router.refresh();
                      } else {
                        setError(result.message);
                      }
                    })
                  }
                >
                  {pending ? "Deleting…" : "Delete tip"}
                </Button>
              </div>
            </Dialog>
          </div>
        </footer>
      )}
    </article>
  );
}

export function MyContributions({ tips }: { tips: Tip[] }) {
  const [message, setMessage] = useState("");
  if (!tips.length)
    return (
      <section className="empty-state account-empty-state">
        <h2>Your first tip could make someone&apos;s trip easier.</h2>
        <p className="muted">
          Share one practical detail you wish you had known before you went.
        </p>
        <Link className="btn" href="/search">
          Find a destination
        </Link>
      </section>
    );
  return (
    <div className="account-contributions">
      {message && (
        <p className="account-notice" role="status">
          {message}
        </p>
      )}
      {tips.map((tip) => (
        <ContributionRow
          tip={tip}
          key={tip.id}
          onDeleted={() => setMessage("Tip deleted.")}
        />
      ))}
    </div>
  );
}
