export const metadata = { title: "Privacy" };
export default function PrivacyPage() {
  return (
    <main id="main" className="container page-top narrow-page">
      <h1 className="page-title">Privacy</h1>
      <p>
        TrailNote stores account details needed for Google sign-in, the tips you
        publish, and moderation records needed to keep the service useful.
        Public pages show only your chosen display name, tip details, and
        whether a contact exists.
      </p>
      <p>
        Phone numbers are stored separately and are not included in public page
        data. A reader must explicitly reveal a public service contact before
        they can call or copy it.
      </p>
      <p>
        We use operational logs to diagnose failures and do not intentionally
        log tip text, phone numbers, email addresses, image buffers, OAuth
        tokens, or secrets.
      </p>
    </main>
  );
}
