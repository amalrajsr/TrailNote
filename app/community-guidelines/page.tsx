const goodContributions = [
  [
    "Share first-hand details",
    "What you paid, saw, used, or learned yourself.",
  ],
  [
    "Include when you visited",
    "Freshness helps the next traveler judge the information.",
  ],
  [
    "Be specific",
    "A route, fare, room type, useful contact, or practical warning.",
  ],
  ["Report changes", "Add an update instead of erasing useful history."],
] as const;

const avoidContributions = [
  ["Advertising", "TrailNote is not a promotional listing directory."],
  ["Copied reviews", "Do not repost text or images from elsewhere."],
  [
    "Private information",
    "Do not publish personal numbers or sensitive details.",
  ],
  ["Harassment", "Keep contributions about useful travel information."],
] as const;

function PrincipleList({
  items,
  mark,
}: {
  items: ReadonlyArray<readonly [string, string]>;
  mark: "✓" | "×";
}) {
  return (
    <div className="principle-list">
      {items.map(([title, description]) => (
        <div className="principle-row" key={title}>
          <span className="principle-mark" aria-hidden="true">
            {mark}
          </span>
          <div>
            <strong>{title}</strong>
            <p>{description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export const metadata = { title: "Community guidelines" };

export default function CommunityGuidelinesPage() {
  return (
    <main id="main" className="document-page">
      <header className="document-header">
        <p className="eyebrow">Community</p>
        <h1>Community guidelines</h1>
        <p>
          TrailNote is most useful when every contribution gives the next
          traveler one practical thing they can actually use.
        </p>
      </header>
      <div className="guideline-grid">
        <section className="principle-card good">
          <h2>Good contributions</h2>
          <PrincipleList items={goodContributions} mark="✓" />
        </section>
        <section className="principle-card bad">
          <h2>Don&apos;t use TrailNote for</h2>
          <PrincipleList items={avoidContributions} mark="×" />
        </section>
      </div>
      <section className="doc-section">
        <h2>When information changes</h2>
        <p>
          Use the Changed action to add a new observation. TrailNote keeps the
          earlier report visible so travelers can see what changed and when.
        </p>
      </section>
      <section className="doc-section">
        <h2>How moderation works</h2>
        <p>
          Report content that is spam, inaccurate, unsafe, or exposes private
          information. Reports go to a private moderator queue and do not
          automatically remove a traveler tip.
        </p>
      </section>
    </main>
  );
}
