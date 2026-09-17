"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

type Toast = { message: string; tone: "success" | "error" };
const toastEvent = "trailnote:toast";

export function toast(message: string, tone: Toast["tone"] = "success") {
  window.dispatchEvent(
    new CustomEvent<Toast>(toastEvent, { detail: { message, tone } }),
  );
}

export function Toaster() {
  const [current, setCurrent] = useState<Toast | null>(null);

  useEffect(() => {
    const show = (event: Event) =>
      setCurrent((event as CustomEvent<Toast>).detail);
    window.addEventListener(toastEvent, show);

    const url = new URL(window.location.href);
    const authToast = url.searchParams.get("authToast");
    const message =
      authToast === "signed-in"
        ? "Signed in successfully"
        : authToast === "signed-out"
          ? "Signed out successfully"
          : null;
    if (message) toast(message);
    if (authToast) {
      url.searchParams.delete("authToast");
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }

    return () => window.removeEventListener(toastEvent, show);
  }, []);

  useEffect(() => {
    if (!current) return;
    // ponytail: one visible toast; add a queue only if messages are being lost.
    const timer = window.setTimeout(() => setCurrent(null), 4000);
    return () => window.clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  const Icon = current.tone === "success" ? CircleCheck : CircleAlert;

  return (
    <div
      className="toast"
      data-tone={current.tone}
      role={current.tone === "error" ? "alert" : "status"}
    >
      <Icon size={20} aria-hidden="true" />
      <p>{current.message}</p>
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss notification"
        onClick={() => setCurrent(null)}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
