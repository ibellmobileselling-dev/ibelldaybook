// Today's date as YYYY-MM-DD in the device's local timezone.
export function todayLocal() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// "2026-09-28" → "28 Sep 2026" (or "Today" / "Yesterday").
export function formatDay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = todayLocal();
  if (iso === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function rupees(n) {
  return `₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// Balance > 0 means the party owes you ("You'll Get").
// "You Got" (in) reduces what they owe; "You Gave" (out) increases it.
export function signedAmount(t) {
  return t.type === "in" ? -t.amount : t.amount;
}

// Oldest first: by entry date, then by when it was recorded (so same-day
// entries keep a stable order). Missing createdAt sorts last.
export function compareTxns(a, b) {
  const byDate = (a.date || "").localeCompare(b.date || "");
  if (byDate) return byDate;
  const at = a.createdAt?.toMillis?.() ?? Infinity;
  const bt = b.createdAt?.toMillis?.() ?? Infinity;
  return at === bt ? 0 : at < bt ? -1 : 1;
}

// Firestore write promises only settle once the server confirms, so callers
// don't await them (offline writes stay queued) and just surface failures.
export function reportWriteError(err) {
  alert(`Could not save: ${err.message}`);
}
