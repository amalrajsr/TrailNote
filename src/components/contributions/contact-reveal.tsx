"use client";

import { Copy, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "../ui/primitives";
import { toast } from "../ui/toaster";

export function ContactReveal({ contributionId }: { contributionId: string }) {
  const [contact, setContact] = useState<{ id: string; phone: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const reveal = async () => {
    setBusy(true);
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
      toast("Contact revealed.");
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Couldn't reveal this contact. Try again.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!contact) return;
    try {
      await navigator.clipboard.writeText(contact.phone);
      toast("Number copied.");
    } catch {
      toast("Copy isn't available. Select the number to copy it.", "error");
    }
  };
  if (!contact)
    return (
      <section className="contact-block">
        <h2>Contact shared by a traveller</h2>
        <p className="muted">Only share a public business or service number.</p>
        <Button type="button" variant="secondary" busy={busy} onClick={reveal}>
          Show contact
        </Button>
      </section>
    );
  return (
    <section className="contact-block" aria-live="polite">
      <h2>Contact shared by a traveller</h2>
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
    </section>
  );
}
