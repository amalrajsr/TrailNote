"use client";

import { ArrowUpRight, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/primitives";

export function CopyLink({ tipId }: { tipId: string }) {
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fallback || !fallbackUrl || !input.current) return;
    input.current.focus();
    input.current.select();
  }, [fallback, fallbackUrl]);

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
      setFallbackUrl(url);
      setFallback(true);
      setMessage("Copy unavailable. The link is selected.");
    }
  }

  return (
    <div className="copy-link">
      <Button variant="quiet" type="button" onClick={() => void copy()}>
        {fallback ? (
          <Copy size={18} aria-hidden="true" />
        ) : (
          <ArrowUpRight size={18} aria-hidden="true" />
        )}
        Copy tip link
      </Button>
      {fallback && (
        <input
          ref={input}
          className="field-input copy-fallback"
          aria-label="Canonical tip link"
          value={fallbackUrl}
          readOnly
        />
      )}
      <p className="small muted" role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
