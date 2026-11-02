const TZ = "Europe/Amsterdam";

/** Datum (YYYY-MM-DD) in de app-tijdzone, optioneel n dagen terug. */
export function dateStr(daysAgo = 0, timeZone = TZ): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toLocaleDateString("en-CA", { timeZone });
}
