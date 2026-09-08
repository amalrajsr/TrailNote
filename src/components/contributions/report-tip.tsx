"use client";

import { useState, useTransition } from "react";
import { reportTip } from "../../../app/tips/[id]/actions";
import { Dialog } from "../ui/overlays";
import { Button, Select, Textarea } from "../ui/primitives";

export function ReportTip({ id, revision }: { id: string; revision: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("inaccurate");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Report this tip"
      description="Tell us why this needs review."
      trigger={
        <button className="quiet" type="button">
          Report
        </button>
      }
    >
      <div className="stack">
        <label className="label" htmlFor="report-reason">
          Reason
        </label>
        <Select
          id="report-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          <option value="inaccurate">Inaccurate</option>
          <option value="spam">Spam</option>
          <option value="unsafe">Unsafe</option>
          <option value="private_information">Private information</option>
          <option value="other">Other</option>
        </Select>
        <label className="label" htmlFor="report-details">
          Context (optional)
        </label>
        <Textarea
          id="report-details"
          value={details}
          maxLength={1000}
          onChange={(event) => setDetails(event.target.value)}
        />
        {message && (
          <p className="field-error" role="alert">
            {message}
          </p>
        )}
        <Button
          busy={pending}
          type="button"
          onClick={() =>
            startTransition(async () => {
              const result = await reportTip(id, revision, reason, details);
              if (result.ok) {
                setMessage("Thanks. Your report is queued for review.");
                setDetails("");
              } else setMessage(result.message);
            })
          }
        >
          Send report
        </Button>
      </div>
    </Dialog>
  );
}
