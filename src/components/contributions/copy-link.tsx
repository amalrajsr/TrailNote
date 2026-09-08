"use client";

import { ArrowUpRight, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../ui/primitives";

export function CopyLink({ tipId }: { tipId: string }) {
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function copy() {
    const url = `${window.location.origin}/tips/${tipId}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("unavailable");
      await Promise.race([
        navigator.clipboard.writeText(url),
        new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error("clipboard-timeout")), 750),
        ),
      ]);
      setFallback(false);
      setMessage("Link copied");
    } catch {
      setFallback(true);
      setMessage("Copy unavailable. The link is selected.");
      requestAnimationFrame(() => {
        if (!input.current) return;
        input.current.value = url;
        input.current.focus();
        input.current.select();
      });
    }
  }

  return (
    <div className="copy-link">
      <Button variant="quiet" type="button" onClick={copy}>
        {fallback ? (
          <Copy size={18} aria-hidden="true" />
        ) : (
          <ArrowUpRight size={18} aria-hidden="true" />
        )}
        Copy link
      </Button>
      {fallback && (
        <input
          ref={input}
          className="field-input copy-fallback"
          aria-label="Canonical tip link"
          readOnly
        />
      )}
      <p className="small muted" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
