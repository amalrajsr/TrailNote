export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <main id="main" className="document-page">
      <header className="document-header">
        <p className="eyebrow">Terms</p>
        <h1>Terms for using TrailNote</h1>
        <p>
          TrailNote is a community-maintained collection of practical travel
          information. These terms explain the basic expectations for reading
          and contributing.
        </p>
        <div className="document-meta">Last updated September 2026</div>
      </header>
      <section className="doc-section">
        <h2>Use traveler information with judgment</h2>
        <p>
          Prices, routes, opening conditions, and availability can change.
          TrailNote presents what travelers report from their own experiences;
          it does not guarantee that a contribution remains current.
        </p>
      </section>
      <section className="doc-section">
        <h2>Share your own experience</h2>
        <p>
          Contributions should be based on something you actually experienced or
          observed. Do not copy reviews, descriptions, or photos from another
          person or website.
        </p>
      </section>
      <section className="doc-section">
        <h2>Respect people and privacy</h2>
        <p>
          Do not publish private personal information. Public-facing business or
          service contact details should only be shared when you are comfortable
          making that information available to other travelers.
        </p>
      </section>
      <section className="doc-section">
        <h2>Moderation</h2>
        <p>
          TrailNote may hide contributions or contacts that are spam, unsafe,
          inaccurate, abusive, or privacy-invasive. Moderation actions are
          recorded internally and handled consistently.
        </p>
      </section>
      <section className="doc-section">
        <h2>Your content</h2>
        <p>
          You remain responsible for the information you contribute. You may
          edit or delete your own published traveler tips subject to the
          product&apos;s revision and moderation rules.
        </p>
      </section>
    </main>
  );
}
