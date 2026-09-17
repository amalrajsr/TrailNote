"use client";

import { LoaderCircle } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { authClient } from "../../lib/auth-client";

type LogoutState = "idle" | "pending" | "error";

const LogoutContext = createContext<(() => Promise<void>) | null>(null);

function clearDrafts() {
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith("fieldnotes:draft:")) sessionStorage.removeItem(key);
  }
}

export function LogoutProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LogoutState>("idle");
  const retryRef = useRef<HTMLButtonElement>(null);

  const signOut = useCallback(async () => {
    setState("pending");

    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);

      clearDrafts();
      window.location.replace("/?signedOut=1");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (state === "idle") return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [state]);

  useEffect(() => {
    if (state === "error") retryRef.current?.focus();
  }, [state]);

  const blocking = state !== "idle";

  return (
    <LogoutContext.Provider value={signOut}>
      <div className="app-shell" inert={blocking ? true : undefined}>
        {children}
      </div>
      {blocking && (
        <div className="logout-backdrop">
          <section
            className="logout-status"
            role={state === "error" ? "alertdialog" : "status"}
            aria-live={state === "pending" ? "polite" : undefined}
            aria-modal={state === "error" ? "true" : undefined}
            aria-labelledby="logout-status-title"
            aria-describedby="logout-status-description"
          >
            {state === "pending" ? (
              <>
                <LoaderCircle
                  className="logout-spinner spin"
                  size={30}
                  aria-hidden="true"
                />
                <h2 id="logout-status-title">Signing you out…</h2>
                <p id="logout-status-description" className="muted">
                  Just a moment while we close your session securely.
                </p>
              </>
            ) : (
              <>
                <h2 id="logout-status-title">Couldn&apos;t sign you out</h2>
                <p id="logout-status-description" className="muted">
                  Check your connection, then try again.
                </p>
                <div className="row logout-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setState("idle")}
                  >
                    Cancel
                  </button>
                  <button
                    ref={retryRef}
                    type="button"
                    className="btn"
                    onClick={signOut}
                  >
                    Try again
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </LogoutContext.Provider>
  );
}

export function useLogout() {
  const signOut = useContext(LogoutContext);
  if (!signOut) throw new Error("useLogout must be used within LogoutProvider");
  return signOut;
}
