"use client";

import { Check, Flag, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  confirmTip,
  markHelpful,
  undoConfirmation,
} from "../../../app/tips/[id]/actions";
import { currentMonth, formatMonth } from "../../lib/visit-month";
import { Button, Input } from "../ui/primitives";
import { Popover } from "../ui/overlays";

type State = {
  authenticated: boolean;
  isAuthor: boolean;
  confirmationMonth: string | null;
  helpful: boolean;
};

export function ReactionControls({
  id,
  rootId,
  revision,
  visitedMonth,
  initialState,
  initialConfirmationCount,
  initialHelpfulCount,
  intent,
}: {
  id: string;
  rootId: string;
  revision: number;
  visitedMonth: string | null;
  initialState: State;
  initialConfirmationCount: number;
  initialHelpfulCount: number;
  intent?: string;
}) {
  const router = useRouter();
  const [confirmationMonth, setConfirmationMonth] = useState(
    initialState.confirmationMonth,
  );
  const [confirmationCount, setConfirmationCount] = useState(
    initialConfirmationCount,
  );
  const [helpful, setHelpful] = useState(initialState.helpful);
  const [helpfulCount, setHelpfulCount] = useState(initialHelpfulCount);
  const [pending, setPending] = useState<"confirm" | "helpful" | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [monthDraft, setMonthDraft] = useState(
    initialState.confirmationMonth ?? currentMonth(),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const helpfulRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (intent === "confirm") confirmRef.current?.focus();
    if (intent === "helpful") helpfulRef.current?.focus();
  }, [intent]);

  function requestSignIn(nextIntent: "confirm" | "helpful") {
    router.push(
      `/sign-in?returnTo=${encodeURIComponent(`/tips/${id}?intent=${nextIntent}`)}`,
    );
  }

  async function saveConfirmation(month: string) {
    if (!initialState.authenticated) return requestSignIn("confirm");
    const before = { confirmationMonth, confirmationCount };
    setError("");
    setPending("confirm");
    setConfirmationMonth(month);
    if (!confirmationMonth) setConfirmationCount((count) => count + 1);
    let result: Awaited<ReturnType<typeof confirmTip>>;
    try {
      result = await confirmTip(id, revision, month);
    } catch {
      setConfirmationMonth(before.confirmationMonth);
      setConfirmationCount(before.confirmationCount);
      setError(
        "The confirmation could not be saved. Your previous choice is unchanged.",
      );
      setPending(null);
      return;
    }
    if (!result.ok) {
      setConfirmationMonth(before.confirmationMonth);
      setConfirmationCount(before.confirmationCount);
      setError(result.message);
    } else {
      setConfirmationMonth(result.data.confirmationMonth);
      setConfirmationCount(result.data.confirmationCount);
      setHelpful(result.data.helpful);
      setHelpfulCount(result.data.helpfulCount);
      setMonthDraft(result.data.confirmationMonth ?? month);
      setMessage(
        `Thanks. You confirmed this tip for ${formatMonth(result.data.confirmationMonth ?? month)}.`,
      );
      setConfirmationOpen(true);
    }
    setPending(null);
  }

  async function remove() {
    const before = { confirmationMonth, confirmationCount };
    setError("");
    setPending("confirm");
    setConfirmationMonth(null);
    setConfirmationCount((count) => Math.max(0, count - 1));
    let result: Awaited<ReturnType<typeof undoConfirmation>>;
    try {
      result = await undoConfirmation(id, revision);
    } catch {
      setConfirmationMonth(before.confirmationMonth);
      setConfirmationCount(before.confirmationCount);
      setError(
        "The confirmation could not be removed. Your previous choice is unchanged.",
      );
      setPending(null);
      return;
    }
    if (!result.ok) {
      setConfirmationMonth(before.confirmationMonth);
      setConfirmationCount(before.confirmationCount);
      setError(result.message);
    } else {
      setConfirmationMonth(null);
      setConfirmationCount(result.data.confirmationCount);
      setMessage("Your confirmation was removed.");
      setConfirmationOpen(false);
    }
    setPending(null);
  }

  async function changeHelpful() {
    if (!initialState.authenticated) return requestSignIn("helpful");
    const before = { helpful, helpfulCount };
    const next = !helpful;
    setError("");
    setPending("helpful");
    setHelpful(next);
    setHelpfulCount((count) => Math.max(0, count + (next ? 1 : -1)));
    let result: Awaited<ReturnType<typeof markHelpful>>;
    try {
      result = await markHelpful(id, next);
    } catch {
      setHelpful(before.helpful);
      setHelpfulCount(before.helpfulCount);
      setError(
        "Helpful could not be updated. Your previous choice is unchanged.",
      );
      setPending(null);
      return;
    }
    if (!result.ok) {
      setHelpful(before.helpful);
      setHelpfulCount(before.helpfulCount);
      setError(result.message);
    } else {
      setHelpful(result.data.helpful);
      setHelpfulCount(result.data.helpfulCount);
      setConfirmationMonth(result.data.confirmationMonth);
      setConfirmationCount(result.data.confirmationCount);
      setMessage(
        result.data.helpful ? "Marked helpful." : "Removed your helpful mark.",
      );
    }
    setPending(null);
  }

  if (initialState.isAuthor)
    return (
      <div className="reaction-region">
        <p className="muted">This is your tip.</p>
        <Link className="btn secondary" href={`/tips/${rootId}/update`}>
          <Flag size={18} aria-hidden="true" /> Changed
        </Link>
      </div>
    );

  return (
    <div className="reaction-region">
      <div className="row reaction-buttons">
        {confirmationMonth ? (
          <Popover
            open={confirmationOpen}
            onOpenChange={setConfirmationOpen}
            align="start"
            trigger={
              <Button
                ref={confirmRef}
                variant="secondary"
                busy={pending === "confirm"}
                aria-pressed="true"
              >
                <Check size={18} aria-hidden="true" /> Confirmed
              </Button>
            }
          >
            <div className="confirmation-editor">
              <p>
                Confirmed for <strong>{formatMonth(confirmationMonth)}</strong>
              </p>
              <label className="label" htmlFor={`confirmation-month-${id}`}>
                Change month
              </label>
              <Input
                id={`confirmation-month-${id}`}
                type="month"
                min={visitedMonth ?? "2000-01"}
                max={currentMonth()}
                value={monthDraft}
                onChange={(event) => setMonthDraft(event.target.value)}
              />
              <div className="row">
                <Button
                  type="button"
                  busy={pending === "confirm"}
                  onClick={() => saveConfirmation(monthDraft)}
                >
                  Save month
                </Button>
                <Button
                  type="button"
                  variant="quiet"
                  disabled={pending === "confirm"}
                  onClick={remove}
                >
                  Undo
                </Button>
              </div>
            </div>
          </Popover>
        ) : (
          <Button
            ref={confirmRef}
            variant="secondary"
            busy={pending === "confirm"}
            onClick={() => saveConfirmation(currentMonth())}
          >
            <Check size={18} aria-hidden="true" /> Still accurate
          </Button>
        )}
        <Link className="quiet" href={`/tips/${rootId}/update`}>
          <Flag size={18} aria-hidden="true" /> Changed
        </Link>
        <Button
          ref={helpfulRef}
          variant="quiet"
          busy={pending === "helpful"}
          aria-pressed={helpful}
          onClick={changeHelpful}
        >
          <ThumbsUp size={18} aria-hidden="true" /> Helpful {helpfulCount}
        </Button>
      </div>
      <p className="reaction-count small muted">
        {confirmationCount === 0
          ? "No confirmations yet"
          : `${confirmationCount} ${confirmationCount === 1 ? "traveler" : "travelers"} confirmed this version`}
      </p>
      <p
        className={error ? "field-error" : "sr-only"}
        role={error ? "alert" : undefined}
      >
        {error}
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {message}
      </p>
    </div>
  );
}
