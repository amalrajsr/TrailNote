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
      <main id="main" className="container page-top narrow-page">
        <h1 className="page-title">Request contact removal</h1>
        <p className="muted">
          Open this form from a revealed contact so we can identify the number
          for review.
        </p>
        <Link className="btn secondary" href="/">
          Explore tips
        </Link>
      </main>
    );
  return (
    <main id="main" className="container page-top narrow-page">
      <h1 className="page-title">Request contact removal</h1>
      <p className="muted">
        Tell us why this public service contact should be reviewed. Removal is
        not complete until a moderator reviews the request.
      </p>
      <ContactRemovalForm contributionId={tip} contactId={contact} />
    </main>
  );
}
