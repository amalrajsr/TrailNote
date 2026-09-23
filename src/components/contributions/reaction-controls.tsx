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
import { Dialog, Popover } from "../ui/overlays";
import { toast } from "../ui/toaster";

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
  compact = false,
}: {
  id: string;
  rootId: string;
  revision: number;
  visitedMonth: string | null;
  initialState: State;
  initialConfirmationCount: number;
  initialHelpfulCount: number;
  intent?: string;
  compact?: boolean;
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
  const [feedbackPrompt, setFeedbackPrompt] = useState<
    "confirm" | "helpful" | null
  >(null);
  const [monthDraft, setMonthDraft] = useState(
    initialState.confirmationMonth ?? currentMonth(),
  );
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

  function requestConfirmation() {
    if (!initialState.authenticated) return requestSignIn("confirm");
    setFeedbackPrompt("confirm");
  }

  function requestHelpful() {
    if (!initialState.authenticated) return requestSignIn("helpful");
    setFeedbackPrompt("helpful");
  }

  async function saveConfirmation(month: string) {
    if (!initialState.authenticated) return requestSignIn("confirm");
    const before = { confirmationMonth, confirmationCount };
    setPending("confirm");
    setConfirmationMonth(month);
    if (!confirmationMonth) setConfirmationCount((count) => count + 1);
    let result: Awaited<ReturnType<typeof confirmTip>>;
    try {
      result = await confirmTip(id, revision, month);
    } catch {
      setConfirmationMonth(before.confirmationMonth);
      setConfirmationCount(before.confirmationCount);
      toast(
        "The confirmation could not be saved. Your previous choice is unchanged.",
        "error",
      );
      setPending(null);
      return;
    }
    if (!result.ok) {
      setConfirmationMonth(before.confirmationMonth);
      setConfirmationCount(before.confirmationCount);
      toast(result.message, "error");
    } else {
      setConfirmationMonth(result.data.confirmationMonth);
      setConfirmationCount(result.data.confirmationCount);
      setHelpful(result.data.helpful);
      setHelpfulCount(result.data.helpfulCount);
      setMonthDraft(result.data.confirmationMonth ?? month);
      const confirmationMessage = "Thanks. You confirmed this tip.";
      toast(confirmationMessage);
      setConfirmationOpen(true);
    }
    setPending(null);
  }

  async function remove() {
    const before = { confirmationMonth, confirmationCount };
    setPending("confirm");
    setConfirmationMonth(null);
    setConfirmationCount((count) => Math.max(0, count - 1));
    let result: Awaited<ReturnType<typeof undoConfirmation>>;
    try {
      result = await undoConfirmation(id, revision);
    } catch {
      setConfirmationMonth(before.confirmationMonth);
      setConfirmationCount(before.confirmationCount);
      toast(
        "The confirmation could not be removed. Your previous choice is unchanged.",
        "error",
      );
      setPending(null);
      return;
    }
    if (!result.ok) {
      setConfirmationMonth(before.confirmationMonth);
      setConfirmationCount(before.confirmationCount);
      toast(result.message, "error");
    } else {
      setConfirmationMonth(null);
      setConfirmationCount(result.data.confirmationCount);
      const confirmationMessage = "Your confirmation was removed.";
      toast(confirmationMessage);
      setConfirmationOpen(false);
    }
    setPending(null);
  }

  async function changeHelpful() {
    if (!initialState.authenticated) return requestSignIn("helpful");
    const before = { helpful, helpfulCount };
    const next = !helpful;
    setPending("helpful");
    setHelpful(next);
    setHelpfulCount((count) => Math.max(0, count + (next ? 1 : -1)));
    let result: Awaited<ReturnType<typeof markHelpful>>;
    try {
      result = await markHelpful(id, next);
    } catch {
      setHelpful(before.helpful);
      setHelpfulCount(before.helpfulCount);
      toast(
        "Helpful could not be updated. Your previous choice is unchanged.",
        "error",
      );
      setPending(null);
      return;
    }
    if (!result.ok) {
      setHelpful(before.helpful);
      setHelpfulCount(before.helpfulCount);
      toast(result.message, "error");
    } else {
      setHelpful(result.data.helpful);
      setHelpfulCount(result.data.helpfulCount);
      setConfirmationMonth(result.data.confirmationMonth);
      setConfirmationCount(result.data.confirmationCount);
      const helpfulMessage = result.data.helpful
        ? "Marked helpful."
        : "Removed your helpful mark.";
      toast(helpfulMessage);
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
    <div className={`reaction-region${compact ? " tip-card-reactions" : ""}`}>
      <div
        className={`row reaction-buttons${compact ? " card-reaction-buttons" : ""}`}
      >
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
            onClick={requestConfirmation}
          >
            <Check size={18} aria-hidden="true" /> Still accurate
          </Button>
        )}
        {!compact && (
          <Link className="quiet" href={`/tips/${rootId}/update`}>
            <Flag size={18} aria-hidden="true" /> Report a change
          </Link>
        )}
        <Button
          ref={helpfulRef}
          variant="quiet"
          busy={pending === "helpful"}
          aria-pressed={helpful}
          onClick={requestHelpful}
        >
          <ThumbsUp size={18} aria-hidden="true" /> Helpful {helpfulCount}
        </Button>
      </div>
      {!compact && (
        <p className="reaction-count small muted">
          {confirmationCount === 0
            ? ""
            : `${confirmationCount} ${confirmationCount === 1 ? "traveller" : "travellers"} confirmed this tip.`}
        </p>
      )}
      <Dialog
        open={feedbackPrompt !== null}
        onOpenChange={(open) => {
          if (!open) setFeedbackPrompt(null);
        }}
        title={
          feedbackPrompt === "confirm"
            ? "Confirm this tip is still accurate?"
            : helpful
              ? "Remove Helpful mark?"
              : "Mark as helpful?"
        }
        description={
          feedbackPrompt === "confirm"
            ? "Only confirm this tip if you recently experienced the same information and it is still correct."
            : helpful
              ? "This will remove your Helpful mark from this tip."
              : "Mark this tip as helpful if you found the information useful."
        }
        className="feedback-confirmation-dialog"
      >
        <div className="dialog-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={() => setFeedbackPrompt(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const action = feedbackPrompt;
              setFeedbackPrompt(null);
              if (action === "confirm") void saveConfirmation(currentMonth());
              if (action === "helpful") void changeHelpful();
            }}
          >
            {feedbackPrompt === "confirm"
              ? "Confirm"
              : helpful
                ? "Remove mark"
                : "Mark helpful"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
