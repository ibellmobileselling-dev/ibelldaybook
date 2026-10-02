// Cash book and account ledger calculations. Pure functions: no Firestore,
// no React, so the numbers can be tested on their own.
//
// Money movement per entry ("effects"):
//   in       → +amount to its account
//   out      → −amount from its account
//   transfer → −amount from accountId, +amount to toAccountId
// Entries saved before accounts existed have no accountId: they are Cash.

import { compareTxns, todayLocal } from "./ledger.js";

export const ALL = "all";

// ---------- Periods ----------

// mode: "today" | "date" | "range" | "all". Returns inclusive ISO bounds.
export function periodBounds({ mode, date, from, to }) {
  if (mode === "today") {
    const t = todayLocal();
    return { from: t, to: t };
  }
  if (mode === "date") return { from: date, to: date };
  if (mode === "range") {
    const [a, b] = [from, to].sort();
    return { from: a, to: b };
  }
  return { from: "0000-01-01", to: "9999-12-31" };
}

export function formatDMY(iso, shortYear = false) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${shortYear ? y.slice(2) : y}`;
}

export function periodLabel({ mode, date, from, to }) {
  if (mode === "today") return formatDMY(todayLocal());
  if (mode === "date") return formatDMY(date);
  if (mode === "range") {
    const b = periodBounds({ mode, from, to });
    return b.from === b.to ? formatDMY(b.from) : `${formatDMY(b.from)} to ${formatDMY(b.to)}`;
  }
  return "All entries";
}

// ---------- Effects ----------

export function txnAccountId(t, cashId) {
  return t.accountId || cashId;
}

export function effectsOf(t, cashId) {
  const amount = Number(t.amount) || 0;
  if (t.type === "transfer") {
    return [
      { accountId: txnAccountId(t, cashId), dir: "out", amount },
      { accountId: t.toAccountId, dir: "in", amount },
    ];
  }
  return [{ accountId: txnAccountId(t, cashId), dir: t.type === "in" ? "in" : "out", amount }];
}

// Round to paise so float noise (0.1 + 0.2) never shows up in totals.
function money(n) {
  return Math.round(n * 100) / 100;
}

// ---------- Balances ----------

// Balance of each account at the end of `uptoDate` (inclusive); no date = all time.
export function accountBalances(accounts, txns, cashId, uptoDate) {
  const bal = Object.fromEntries(accounts.map((a) => [a.id, Number(a.openingBalance) || 0]));
  for (const t of txns) {
    if (uptoDate && (t.date || "") > uptoDate) continue;
    for (const e of effectsOf(t, cashId)) {
      if (!(e.accountId in bal)) continue; // entry for a deleted account
      bal[e.accountId] += e.dir === "in" ? e.amount : -e.amount;
    }
  }
  for (const k of Object.keys(bal)) bal[k] = money(bal[k]);
  return bal;
}

function dayBefore(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

// ---------- Particulars ----------

export function particularsOf(t, partiesById) {
  const party = t.partyId ? partiesById[t.partyId]?.name || "Deleted party" : "";
  const main = party || t.particulars || (t.type === "in" ? "Received" : "Paid");
  return t.remark ? `${main} (${t.remark})` : main;
}

// ---------- Cash book ----------

// Builds the two-sided cash book for a period, like the client's Excel sheet:
// Credit/Inward on the left (opening balance first), Debit/Outward on the
// right, totals, and the closing balance ("Cash on hand").
//
// accountFilter: ALL or one account id. With ALL, a transfer between two
// accounts appears on both sides (it moves money, it doesn't create it), so
// totals include it on both sides and the closing balance is unaffected.
export function buildCashBook({ txns, accounts, parties, cashId, period, accountFilter = ALL }) {
  const { from, to } = periodBounds(period);
  const inScope = accountFilter === ALL ? new Set(accounts.map((a) => a.id)) : new Set([accountFilter]);
  const scopedAccounts = accounts.filter((a) => inScope.has(a.id));
  const accountsById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const partiesById = Object.fromEntries(parties.map((p) => [p.id, p]));
  const nameOf = (id) => accountsById[id]?.name || accountsById[id]?.bankName || (id === cashId ? "Cash" : "Deleted account");

  const before = from > "0000-01-01" ? dayBefore(from) : null;
  const openBal = before ? accountBalances(accounts, txns, cashId, before) : accountBalances(accounts, [], cashId);
  const opening = money(scopedAccounts.reduce((s, a) => s + (openBal[a.id] || 0), 0));

  const inward = [];
  const outward = [];
  const perAccount = Object.fromEntries(scopedAccounts.map((a) => [a.id, { in: 0, out: 0 }]));

  const rows = txns.filter((t) => t.date >= from && t.date <= to).sort(compareTxns);
  for (const t of rows) {
    for (const e of effectsOf(t, cashId)) {
      if (!inScope.has(e.accountId)) continue;
      let particulars;
      if (t.type === "transfer") {
        const other = e.dir === "out" ? t.toAccountId : txnAccountId(t, cashId);
        particulars = `${e.dir === "out" ? "Transfer to" : "Transfer from"} ${nameOf(other)}`;
        if (t.remark) particulars += ` (${t.remark})`;
      } else {
        particulars = particularsOf(t, partiesById);
      }
      const row = {
        id: `${t.id}-${e.dir}`,
        txnId: t.id,
        date: t.date,
        particulars,
        account: nameOf(e.accountId),
        amount: e.amount,
        isTransfer: t.type === "transfer",
      };
      (e.dir === "in" ? inward : outward).push(row);
      if (perAccount[e.accountId]) perAccount[e.accountId][e.dir] += e.amount;
    }
  }

  const sumIn = money(inward.reduce((s, r) => s + r.amount, 0));
  const sumOut = money(outward.reduce((s, r) => s + r.amount, 0));
  // Opening balance sits on the inward side (or outward if overdrawn) and is
  // part of that side's total, exactly like the Excel template.
  const totalIn = money(sumIn + Math.max(opening, 0));
  const totalOut = money(sumOut + Math.max(-opening, 0));
  const closing = money(totalIn - totalOut);

  const summary = scopedAccounts.map((a) => {
    const o = openBal[a.id] || 0;
    const p = perAccount[a.id];
    return { id: a.id, name: nameOf(a.id), kind: a.kind, opening: o, in: money(p.in), out: money(p.out), closing: money(o + p.in - p.out) };
  });

  return { from, to, opening, inward, outward, sumIn, sumOut, totalIn, totalOut, closing, summary };
}

// One cash book per day that has entries, each opening with the previous
// day's closing. Used for "day-wise" reports over a date range.
export function buildCashBookByDay(args) {
  const { from, to } = periodBounds(args.period);
  const days = [...new Set(args.txns.map((t) => t.date).filter((d) => d >= from && d <= to))].sort();
  return days.map((d) => buildCashBook({ ...args, period: { mode: "date", date: d } }));
}

// ---------- Account ledger ----------

// Running-balance ledger of one account for a period.
export function buildAccountLedger({ txns, accounts, parties, cashId, accountId, period }) {
  const cb = buildCashBook({ txns, accounts, parties, cashId, period, accountFilter: accountId });
  const all = [
    ...cb.inward.map((r) => ({ ...r, in: r.amount, out: 0 })),
    ...cb.outward.map((r) => ({ ...r, in: 0, out: r.amount })),
  ];
  const order = new Map(txns.slice().sort(compareTxns).map((t, i) => [t.id, i]));
  all.sort((a, b) => order.get(a.txnId) - order.get(b.txnId));
  let running = cb.opening;
  const rows = all.map((r) => {
    running = money(running + r.in - r.out);
    return { ...r, balance: running };
  });
  return { from: cb.from, to: cb.to, opening: cb.opening, rows, totalIn: cb.sumIn, totalOut: cb.sumOut, closing: cb.closing };
}
