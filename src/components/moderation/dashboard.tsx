"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  changeAccountStatus,
  changeTipVisibility,
  reviewContactRequest,
} from "../../../app/moderation/actions";
import { Dialog } from "../ui/overlays";
import { Button, Input, Select, Textarea } from "../ui/primitives";
import { toast } from "../ui/toaster";
import { ReportReviewDrawer } from "./report-review-drawer";
import type { ModerationReportDetail } from "../../server/services/moderation";

type Event = {
  targetType: string;
  targetId: string;
  action: string;
  reason: string;
  createdAt: number;
};
type Tip = {
  id: string;
  body: string;
  destination: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  status: "published" | "hidden" | "deleted";
  createdAt: number;
};
type User = {
  id: string;
  displayName: string;
  username: string;
  email: string;
  status: "active" | "suspended";
  createdAt: number;
};
type Report = {
  id: string;
  contributionId: string;
  revision: number;
  reason: string;
  details: string | null;
  createdAt: number;
  status: "open" | "resolved" | "dismissed";
  resolutionNote: string | null;
  body: string;
  destination: string;
  contributionStatus: "published" | "hidden" | "deleted";
  authorId: string;
  authorName: string;
  authorStatus: "active" | "suspended";
};
type Contact = {
  id: string;
  contributionId: string;
  contactId: string;
  requestText: string;
  createdAt: number;
  status: "open" | "resolved" | "dismissed";
  resolutionNote: string | null;
  body: string;
  destination: string;
  contactStatus: "visible" | "hidden";
};
type ActionResult = { ok: boolean; code?: string; message?: string };

const historyActionLabels: Record<string, string> = {
  hide: "Tip hidden",
  issue_fixed: "Report resolved — issue fixed",
  dismiss: "Report dismissed",
};

const formatDate = (value: number) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`moderation-badge moderation-badge-${value}`}>
      {value}
    </span>
  );
}

function ActionDialog({
  label,
  description,
  onConfirm,
  danger = false,
}: {
  label: string;
  description: string;
  onConfirm: (reason: string) => Promise<ActionResult>;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const submit = () =>
    startTransition(async () => {
      const result = await onConfirm(reason);
      if (result.ok) {
        const successMessage = "Moderation action saved.";
        toast(successMessage);
        setOpen(false);
        setReason("");
        router.refresh();
      } else {
        const errorMessage = result.message ?? "Could not save this action.";
        toast(errorMessage, "error");
      }
    });
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={danger ? "danger-outline" : undefined}
        onClick={() => {
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`${label}?`}
        description={description}
      >
        <label className="label" htmlFor={`moderation-reason-${label}`}>
          Reason <span className="optional">(required)</span>
        </label>
        <Textarea
          id={`moderation-reason-${label}`}
          value={reason}
          maxLength={1000}
          required
          aria-required="true"
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={danger ? "danger" : undefined}
            busy={pending}
            disabled={!reason.trim()}
            onClick={submit}
          >
            Confirm
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function History({ events, targetId }: { events: Event[]; targetId: string }) {
  const matching = events.filter((event) => event.targetId === targetId);
  if (!matching.length) return null;
  return (
    <details className="moderation-history-details">
      <summary>History ({matching.length})</summary>
      <ul className="moderation-history">
        {matching.map((event) => (
          <li key={`${event.createdAt}-${event.action}`}>
            <strong>{historyActionLabels[event.action] ?? event.action}</strong>{" "}
            · {event.reason}
          </li>
        ))}
      </ul>
    </details>
  );
}

function Reports({
  reports,
  contacts,
  events,
  reviewHref,
}: {
  reports: Report[];
  contacts: Contact[];
  events: Event[];
  reviewHref: (id: string) => string;
}) {
  const rows = [
    ...reports.map((item) => ({ kind: "report" as const, item })),
    ...contacts.map((item) => ({ kind: "contact" as const, item })),
  ].sort((a, b) => b.item.createdAt - a.item.createdAt);
  return (
    <div className="moderation-table-wrap">
      <table className="moderation-table">
        <thead>
          <tr>
            <th scope="col">Reason</th>
            <th scope="col">Tip excerpt</th>
            <th scope="col">Destination</th>
            <th scope="col">Author</th>
            <th scope="col">Reported</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ kind, item }) => {
            const report = kind === "report" ? item : null;
            const contact = kind === "contact" ? item : null;
            return (
              <tr key={item.id}>
                <td data-label="Reason">
                  {report ? report.reason : "Contact removal"}
                </td>
                <td data-label="Tip excerpt" className="moderation-excerpt">
                  {report
                    ? (report.details ?? report.body)
                    : contact?.requestText}
                </td>
                <td data-label="Destination">{item.destination}</td>
                <td data-label="Author">
                  {report ? report.authorName : "Contact owner"}
                </td>
                <td data-label="Reported">{formatDate(item.createdAt)}</td>
                <td data-label="Status">
                  <StatusBadge value={item.status} />
                </td>
                <td data-label="Action" className="moderation-action-cell">
                  {report && (
                    <Link
                      className="btn secondary"
                      href={reviewHref(report.id)}
                    >
                      Review
                    </Link>
                  )}
                  {item.status === "open" && contact && (
                    <div className="moderation-actions">
                      <ActionDialog
                        label="Hide contact"
                        description="Hide the requested contact from readers."
                        danger
                        onConfirm={(reason) =>
                          reviewContactRequest(contact.id, "hide", reason)
                        }
                      />
                      <ActionDialog
                        label="Dismiss request"
                        description="Mark this contact-removal request as dismissed."
                        onConfirm={(reason) =>
                          reviewContactRequest(contact.id, "dismiss", reason)
                        }
                      />
                    </div>
                  )}
                  <History
                    events={events}
                    targetId={
                      report?.contributionId ?? contact?.contactId ?? ""
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length && (
        <p className="moderation-empty">No reports match these filters.</p>
      )}
    </div>
  );
}

function Users({ users }: { users: User[] }) {
  return (
    <div className="moderation-table-wrap">
      <table className="moderation-table">
        <thead>
          <tr>
            <th scope="col">User</th>
            <th scope="col">Username</th>
            <th scope="col">Joined</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td data-label="User">
                <strong>{user.displayName}</strong>
                <span className="moderation-secondary">{user.email}</span>
              </td>
              <td data-label="Username">@{user.username}</td>
              <td data-label="Joined">{formatDate(user.createdAt)}</td>
              <td data-label="Status">
                <StatusBadge
                  value={user.status === "suspended" ? "blocked" : "active"}
                />
              </td>
              <td data-label="Action" className="moderation-action-cell">
                {user.status === "active" ? (
                  <ActionDialog
                    label="Block"
                    description="Published tips and activity will immediately leave public views."
                    danger
                    onConfirm={(reason) =>
                      changeAccountStatus(
                        user.id,
                        "active",
                        "suspended",
                        reason,
                      )
                    }
                  />
                ) : (
                  <ActionDialog
                    label="Unblock"
                    description="Published tips will become public again. Individually hidden tips stay hidden."
                    onConfirm={(reason) =>
                      changeAccountStatus(
                        user.id,
                        "suspended",
                        "active",
                        reason,
                      )
                    }
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!users.length && (
        <p className="moderation-empty">No users match these filters.</p>
      )}
    </div>
  );
}

function Tips({ tips, events }: { tips: Tip[]; events: Event[] }) {
  return (
    <div className="moderation-table-wrap">
      <table className="moderation-table">
        <thead>
          <tr>
            <th scope="col">Tip excerpt</th>
            <th scope="col">Destination</th>
            <th scope="col">Author</th>
            <th scope="col">Published</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tips.map((tip) => (
            <tr key={tip.id}>
              <td data-label="Tip excerpt" className="moderation-excerpt">
                {tip.body}
              </td>
              <td data-label="Destination">{tip.destination}</td>
              <td data-label="Author">
                <strong>{tip.authorName}</strong>
                <span className="moderation-secondary">
                  @{tip.authorUsername}
                </span>
              </td>
              <td data-label="Published">{formatDate(tip.createdAt)}</td>
              <td data-label="Status">
                <StatusBadge value={tip.status} />
              </td>
              <td data-label="Action" className="moderation-action-cell">
                {tip.status === "published" ? (
                  <ActionDialog
                    label="Unpublish"
                    description="This tip will be hidden from travellers."
                    danger
                    onConfirm={(reason) =>
                      changeTipVisibility(tip.id, "published", "hidden", reason)
                    }
                  />
                ) : (
                  <ActionDialog
                    label="Republish"
                    description="This tip will be visible to travellers unless its author is blocked."
                    onConfirm={(reason) =>
                      changeTipVisibility(tip.id, "hidden", "published", reason)
                    }
                  />
                )}
                <History events={events} targetId={tip.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!tips.length && (
        <p className="moderation-empty">No tips match these filters.</p>
      )}
    </div>
  );
}

export function ModerationDashboard({
  data,
}: {
  data: {
    section: "reports" | "users" | "tips";
    type: string;
    q: string;
    status: string;
    from: string;
    to: string;
    page: number;
    review?: string;
    selectedReport: ModerationReportDetail | null;
    reviewError: string | null;
    contributions: Report[];
    contacts: Contact[];
    users: User[];
    tips: Tip[];
    events: Event[];
    hasPrevious: boolean;
    hasNext: boolean;
  };
}) {
  const params = new URLSearchParams({
    section: data.section,
    ...(data.type !== "all" ? { type: data.type } : {}),
    ...(data.q ? { q: data.q } : {}),
    ...(data.status !== "all" ? { status: data.status } : {}),
    ...(data.from ? { from: data.from } : {}),
    ...(data.to ? { to: data.to } : {}),
    ...(data.page > 1 ? { page: String(data.page) } : {}),
  });
  const sectionHref = (section: string) => {
    const next = new URLSearchParams(params);
    next.set("section", section);
    if (section !== "reports") next.delete("type");
    return `/moderation?${next}`;
  };
  const pageHref = (page: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    return `/moderation?${next}`;
  };
  const reviewHref = (review: string) => {
    const next = new URLSearchParams(params);
    next.set("review", review);
    return `/moderation?${next}`;
  };
  const closeReviewHref = `/moderation?${params}`;
  const searchPlaceholder =
    data.section === "users"
      ? "Search users..."
      : data.section === "tips"
        ? "Search tips..."
        : "Search reports...";
  return (
    <section className="moderation-workspace">
      <nav className="tabs moderation-tabs" aria-label="Moderation sections">
        <Link
          className={data.section === "reports" ? "selected" : ""}
          aria-current={data.section === "reports" ? "page" : undefined}
          href={sectionHref("reports")}
        >
          Reports
        </Link>
        <Link
          className={data.section === "users" ? "selected" : ""}
          aria-current={data.section === "users" ? "page" : undefined}
          href={sectionHref("users")}
        >
          Users
        </Link>
        <Link
          className={data.section === "tips" ? "selected" : ""}
          aria-current={data.section === "tips" ? "page" : undefined}
          href={sectionHref("tips")}
        >
          Tips
        </Link>
      </nav>
      <form className="moderation-filters" method="get">
        <input type="hidden" name="section" value={data.section} />
        <div className="moderation-search-field">
          <label className="sr-only" htmlFor="moderation-q">
            Search
          </label>
          <Input
            id="moderation-q"
            name="q"
            defaultValue={data.q}
            placeholder={searchPlaceholder}
          />
        </div>
        <div className="moderation-filter-field">
          <label htmlFor="moderation-from">From</label>
          <Input
            id="moderation-from"
            name="from"
            type="date"
            defaultValue={data.from}
          />
        </div>
        <div className="moderation-filter-field">
          <label htmlFor="moderation-to">To</label>
          <Input
            id="moderation-to"
            name="to"
            type="date"
            defaultValue={data.to}
          />
        </div>
        <div className="moderation-filter-field">
          <label htmlFor="moderation-status">Status</label>
          <Select
            id="moderation-status"
            name="status"
            defaultValue={data.status}
          >
            <option value="all">All</option>
            {data.section === "reports" && (
              <>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </>
            )}
            {data.section === "users" && (
              <>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </>
            )}
            {data.section === "tips" && (
              <>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </>
            )}
          </Select>
        </div>
        {data.section === "reports" && (
          <div className="moderation-filter-field">
            <label htmlFor="moderation-type">Type</label>
            <Select id="moderation-type" name="type" defaultValue={data.type}>
              <option value="all">All reports</option>
              <option value="tip">Tip reports</option>
              <option value="contact">Contact removal</option>
            </Select>
          </div>
        )}
        <Button type="submit">Apply</Button>
        <Link
          className="quiet moderation-clear"
          href={`/moderation?section=${data.section}`}
        >
          Clear filters
        </Link>
      </form>
      {data.section === "reports" && (
        <Reports
          reports={data.contributions}
          contacts={data.contacts}
          events={data.events}
          reviewHref={reviewHref}
        />
      )}
      {data.section === "users" && <Users users={data.users} />}
      {data.section === "tips" && (
        <Tips tips={data.tips} events={data.events} />
      )}
      <nav className="moderation-pagination" aria-label="Moderation pages">
        {data.hasPrevious ? (
          <Link className="btn secondary" href={pageHref(data.page - 1)}>
            Previous
          </Link>
        ) : (
          <span />
        )}
        {<span>Page {data.page}</span>}
        {data.hasNext ? (
          <Link className="btn secondary" href={pageHref(data.page + 1)}>
            Next
          </Link>
        ) : (
          <span />
        )}
      </nav>
      {data.review && !data.selectedReport && (
        <p className="moderation-review-error" role="status">
          {data.reviewError ?? "This report is unavailable."}
        </p>
      )}
      <ReportReviewDrawer
        detail={data.selectedReport}
        closeHref={closeReviewHref}
      />
    </section>
  );
}
