export function safeReturnUrl(value: unknown, fallback = "/"): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, "https://fieldnotes.invalid");
    return url.origin === "https://fieldnotes.invalid"
      ? url.pathname + url.search + url.hash
      : fallback;
  } catch {
    return fallback;
  }
}
export function validMapsUrl(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      [
        "maps.google.com",
        "www.google.com",
        "google.com",
        "maps.app.goo.gl",
        "goo.gl",
      ].includes(u.hostname) &&
      (u.hostname !== "goo.gl" || u.pathname.startsWith("/maps")) &&
      (!["www.google.com", "google.com"].includes(u.hostname) ||
        u.pathname.startsWith("/maps"))
    );
  } catch {
    return false;
  }
}
