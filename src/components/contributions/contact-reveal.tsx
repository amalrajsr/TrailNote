"use client";

import { Copy, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "../ui/primitives";

export function ContactReveal({ contributionId }: { contributionId: string }) {
  const [contact, setContact] = useState<{ id: string; phone: string } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const reveal = async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/contacts/${contributionId}/reveal`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        id?: string;
        phone?: string;
        message?: string;
      };
      if (!response.ok || !data.id || !data.phone)
        throw new Error(
          data.message ?? "Couldn't reveal this contact. Try again.",
        );
      setContact({ id: data.id, phone: data.phone });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Couldn't reveal this contact. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!contact) return;
    try {
      await navigator.clipboard.writeText(contact.phone);
      setMessage("Number copied");
    } catch {
      setMessage("Copy isn't available. Select the number to copy it.");
    }
  };
  if (!contact)
    return (
      <section className="contact-block">
        <h2>Contact shared by a traveler</h2>
        <p className="muted">Only share a public business or service number.</p>
        <Button type="button" variant="secondary" busy={busy} onClick={reveal}>
          Show contact
        </Button>
        {message && (
          <p className="field-error" role="alert">
            {message}
          </p>
        )}
      </section>
    );
  return (
    <section className="contact-block" aria-live="polite">
      <h2>Contact shared by a traveler</h2>
      <p className="contact-number">{contact.phone}</p>
      <div className="row">
        <a className="btn secondary" href={`tel:${contact.phone}`}>
          <Phone size={18} aria-hidden /> Call
        </a>
        <Button type="button" variant="secondary" onClick={copy}>
          <Copy size={18} aria-hidden /> Copy
        </Button>
        <Link
          className="quiet"
          href={`/contact-removal?tip=${encodeURIComponent(contributionId)}&contact=${encodeURIComponent(contact.id)}`}
        >
          Report this number
        </Link>
      </div>
      {message && <p className="status-message">{message}</p>}
    </section>
  );
}
