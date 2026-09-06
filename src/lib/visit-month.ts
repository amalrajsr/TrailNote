export function currentMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}
export function validMonth(value: string, now = new Date()) {
  return (
    /^\d{4}-(0[1-9]|1[0-2])$/.test(value) &&
    value >= "2000-01" &&
    value <= currentMonth(now)
  );
}
export function formatMonth(month: string | null) {
  return month
    ? new Intl.DateTimeFormat("en-IN", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${month}-01T00:00:00Z`))
    : "Visit month not provided";
}
export function freshness(
  visited: string | null,
  confirmed: string | null,
  changed: boolean,
  now = new Date(),
) {
  const effective =
    [visited, confirmed]
      .filter((v): v is string => !!v)
      .sort()
      .at(-1) ?? null;
  if (changed)
    return { label: "Change reported", tone: "warning" as const, effective };
  if (!effective)
    return { label: "Visit month unknown", tone: "muted" as const, effective };
  const [y, m] = currentMonth(now).split("-").map(Number),
    [ey, em] = effective.split("-").map(Number);
  const age = (y - ey) * 12 + m - em;
  return {
    label:
      age <= 3
        ? confirmed && (!visited || confirmed >= visited)
          ? "Recently confirmed"
          : "Recent visit"
        : age <= 6
          ? "A few months old"
          : "May have changed",
    tone: age <= 3 ? ("success" as const) : ("muted" as const),
    effective,
  };
}
