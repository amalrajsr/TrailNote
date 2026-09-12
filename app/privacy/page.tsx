export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main id="main" className="document-page">
      <header className="document-header">
        <p className="eyebrow">Privacy</p>
        <h1>Privacy at TrailNote</h1>
        <p>
          How TrailNote handles the information you share while keeping public
          traveler knowledge useful.
        </p>
        <div className="document-meta">Last updated September 2026</div>
      </header>
      <section className="doc-section">
        <h2>What we collect</h2>
        <p>
          TrailNote stores account information needed for Google sign-in,
          traveler tips you publish, and operational records needed to keep the
          service reliable and safe.
        </p>
      </section>
      <section className="doc-section">
        <h2>What appears publicly</h2>
        <p>
          Public contribution pages show the display name you use on TrailNote,
          the practical details you choose to share, the visit month when
          provided, and whether a public service contact is available.
        </p>
        <p>
          Your sign-in email and authentication details are not shown on public
          traveler pages.
        </p>
      </section>
      <section className="doc-section">
        <h2>Public service contacts</h2>
        <p>
          Phone numbers are stored separately from public contribution data. A
          reader must deliberately choose to reveal an available public business
          or service number before it is returned.
        </p>
      </section>
      <section className="doc-section">
        <h2>Photos</h2>
        <p>
          Uploaded traveler photos are processed before storage. TrailNote is
          designed to remove unnecessary metadata such as location metadata from
          accepted images before they are attached to public tips.
        </p>
      </section>
      <section className="doc-section">
        <h2>Operational data</h2>
        <p>
          Operational logs may record request timing, error codes, and service
          diagnostics. TrailNote does not intentionally log tip bodies, phone
          numbers, email addresses, image buffers, OAuth tokens, or secrets.
        </p>
      </section>
      <section className="doc-section">
        <h2>Your choices</h2>
        <p>
          Authors can edit or delete their own contributions. Public service
          contacts can be reported for review without requiring the affected
          person to create an account.
        </p>
      </section>
      <section className="doc-section">
        <h2>Contact and removal</h2>
        <p>
          If you believe a public business or service number should not appear
          on TrailNote, use the contact-removal flow linked from the relevant
          contribution so the exact number can be identified safely.
        </p>
      </section>
    </main>
  );
}
