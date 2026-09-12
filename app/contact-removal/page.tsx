import Link from "next/link";
import { ContactRemovalForm } from "../../src/components/contributions/contact-removal-form";

export const metadata = {
  title: "Request contact removal",
  robots: { index: false },
};

export default async function ContactRemovalPage({
  searchParams,
}: {
  searchParams: Promise<{ tip?: string; contact?: string }>;
}) {
  const { tip, contact } = await searchParams;
  if (!tip || !contact)
    return (
      <main id="main" className="task-page">
        <p className="eyebrow">Contact review</p>
        <h1>Request contact removal</h1>
        <p className="task-lead">
          If a public business or service number was shared on TrailNote and
          you&apos;d like us to review it, start from the traveler tip where the
          number appears.
        </p>
        <section className="instruction-panel">
          <h2>How removal requests work</h2>
          <ol className="steps">
            <li className="step">
              <span className="step-number">1</span>
              <div>
                <strong>Open the relevant traveler tip</strong>
                <p>Find the contribution where the contact is attached.</p>
              </div>
            </li>
            <li className="step">
              <span className="step-number">2</span>
              <div>
                <strong>Reveal the contact</strong>
                <p>
                  The number stays hidden from the initial public page data.
                </p>
              </div>
            </li>
            <li className="step">
              <span className="step-number">3</span>
              <div>
                <strong>Choose “Report this number”</strong>
                <p>
                  This identifies the exact contact without asking you to paste
                  the number here.
                </p>
              </div>
            </li>
          </ol>
        </section>
        <div className="task-actions">
          <Link className="btn" href="/search">
            Explore tips
          </Link>
          <Link className="btn secondary" href="/privacy">
            Read privacy
          </Link>
        </div>
      </main>
    );
  return (
    <main id="main" className="task-page">
      <p className="eyebrow">Contact review</p>
      <h1>Request contact removal</h1>
      <p className="task-lead">
        Tell us why this public service contact should be reviewed. Removal is
        not complete until a moderator reviews the request.
      </p>
      <ContactRemovalForm contributionId={tip} contactId={contact} />
    </main>
  );
}
