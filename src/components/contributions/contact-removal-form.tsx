"use client";

import { useState } from "react";
import { Button, Input, Textarea } from "../ui/primitives";

export function ContactRemovalForm({
  contributionId,
  contactId,
}: {
  contributionId: string;
  contactId: string;
}) {
  const [requestText, setRequestText] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/contact-removal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributionId,
          contactId,
          requestText,
          replyEmail,
          honeypot,
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(
          data.message ?? "Please check the request and try again.",
        );
      setMessage("Your request has been sent for review.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Please check the request and try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="form-card stack" onSubmit={submit} noValidate>
      <Input type="hidden" value={contributionId} readOnly aria-label="Tip" />
      <label className="label" htmlFor="removal-context">
        Why should this number be removed?
      </label>
      <Textarea
        id="removal-context"
        value={requestText}
        minLength={10}
        maxLength={1000}
        required
        onChange={(event) => setRequestText(event.target.value)}
      />
      <label className="label" htmlFor="removal-email">
        Reply email (optional)
      </label>
      <Input
        id="removal-email"
        type="email"
        value={replyEmail}
        onChange={(event) => setReplyEmail(event.target.value)}
      />
      <label className="sr-only" htmlFor="removal-website">
        Website
      </label>
      <Input
        id="removal-website"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
      />
      {message && (
        <p
          className={
            message.startsWith("Your request")
              ? "status-message"
              : "field-error"
          }
          role="status"
        >
          {message}
        </p>
      )}
      <Button busy={busy}>Send request</Button>
    </form>
  );
}
