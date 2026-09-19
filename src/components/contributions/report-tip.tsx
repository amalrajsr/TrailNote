"use client";

import { useState, useTransition } from "react";
import { reportTip } from "../../../app/tips/[id]/actions";
import { CustomSelect } from "../ui/custom-select";
import { Dialog } from "../ui/overlays";
import { Button, Textarea } from "../ui/primitives";
import { toast } from "../ui/toaster";

export function ReportTip({ id, revision }: { id: string; revision: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("inaccurate");
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Report this tip"
      description="Tell us why this needs review."
      trigger={
        <button className="quiet" type="button">
          Report this tip
        </button>
      }
    >
      <div className="stack">
        <label className="label" htmlFor="report-reason">
          Reason
        </label>
        <CustomSelect
          id="report-reason"
          ariaLabel="Reason"
          value={reason}
          onValueChange={setReason}
          options={[
            { value: "inaccurate", label: "Inaccurate" },
            { value: "spam", label: "Spam" },
            { value: "unsafe", label: "Unsafe" },
            {
              value: "private_information",
              label: "Private information",
            },
            { value: "other", label: "Other" },
          ]}
        />
        <label className="label" htmlFor="report-details">
          Context (optional)
        </label>
        <Textarea
          id="report-details"
          value={details}
          maxLength={1000}
          onChange={(event) => setDetails(event.target.value)}
        />
        <Button
          busy={pending}
          className="report-tip-submit"
          type="button"
          onClick={() =>
            startTransition(async () => {
              const result = await reportTip(id, revision, reason, details);
              if (result.ok) {
                toast("Report sent. A moderator will review it.");
                setDetails("");
              } else {
                toast(result.message, "error");
              }
            })
          }
        >
          Send report
        </Button>
      </div>
    </Dialog>
  );
}
