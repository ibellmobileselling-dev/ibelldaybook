import { test } from "node:test";
import { buildCashBook, buildCashBookByDay, buildAccountLedger, accountBalances, ALL } from "./cashbook.js";
import assert from "node:assert/strict";
const ts = (n) => ({ toMillis: () => n });
const cashId = "u_cash";
const accounts = [{ id: cashId, kind: "cash", name: "Cash", openingBalance: 3201720 }, { id: "hdfc", kind: "bank", name: "HDFC", openingBalance: 50000 }];
const parties = [{ id: "kapil", name: "KAPIL BHAI CST" }, { id: "pranav", name: "PRANAV BHAI" }];
let n = 0;
const T = (o) => ({ id: "t" + ++n, createdAt: ts(n), remark: "", particulars: "", partyId: null, ...o });
// Client's Excel day: 23/09/26 (legacy entry without accountId = Cash)
const txns = [
  T({ date: "2026-09-23", type: "in", amount: 700, partyId: "kapil" }),
  T({ date: "2026-09-23", type: "out", amount: 700, partyId: "kapil", remark: "PRUTHVI", accountId: cashId }),
  T({ date: "2026-09-23", type: "out", amount: 200, partyId: "pranav", remark: "UPD", accountId: cashId }),
  T({ date: "2026-09-23", type: "out", amount: 3000000, particulars: "SAFE", accountId: cashId }),
  // next day: bank receipt, a cash deposit into HDFC, a payment from HDFC
  T({ date: "2026-09-24", type: "in", amount: 25000, partyId: "kapil", accountId: "hdfc" }),
  T({ date: "2026-09-24", type: "transfer", amount: 100000, accountId: cashId, toAccountId: "hdfc" }),
  T({ date: "2026-09-24", type: "out", amount: 0.1, particulars: "fee", accountId: "hdfc" }),
  T({ date: "2026-09-24", type: "out", amount: 0.2, particulars: "fee", accountId: "hdfc" }),
];
const per = (d) => ({ mode: "date", date: d });

test("1. Exact Excel numbers (Cash only)", () => {
  const cb = buildCashBook({ txns, accounts, parties, cashId, period: per("2026-09-23"), accountFilter: cashId });
  assert.equal(cb.opening, 3201720); assert.equal(cb.totalIn, 3202420); assert.equal(cb.totalOut, 3000900); assert.equal(cb.closing, 201520);
  assert.deepEqual(cb.outward.map((r) => r.particulars), ["KAPIL BHAI CST (PRUTHVI)", "PRANAV BHAI (UPD)", "SAFE"]);
  assert.equal(cb.inward[0].account, "Cash");
});

test("2. Next day, Cash: opening carries over; transfer to HDFC is an outward line", () => {
  const cb = buildCashBook({ txns, accounts, parties, cashId, period: per("2026-09-24"), accountFilter: cashId });
  assert.equal(cb.opening, 201520); assert.equal(cb.closing, 101520);
  assert.deepEqual(cb.outward.map((r) => r.particulars), ["Transfer to HDFC"]);
});

test("3. HDFC that day: 50000 + 25000 + 100000 − 0.3, no float noise", () => {
  const cb = buildCashBook({ txns, accounts, parties, cashId, period: per("2026-09-24"), accountFilter: "hdfc" });
  assert.equal(cb.opening, 50000); assert.equal(cb.closing, 174999.7); assert.equal(cb.sumOut, 0.3);
});

test("4. All accounts: transfer appears on both sides, closing = sum of accounts", () => {
  const cb = buildCashBook({ txns, accounts, parties, cashId, period: per("2026-09-24"), accountFilter: ALL });
  assert.equal(cb.opening, 251520); assert.equal(cb.closing, 101520 + 174999.7);
  assert.ok(cb.inward.some((r) => r.particulars === "Transfer from Cash" && r.account === "HDFC"));
  assert.ok(cb.outward.some((r) => r.particulars === "Transfer to HDFC" && r.account === "Cash"));
  const s = Object.fromEntries(cb.summary.map((x) => [x.name, x]));
  assert.equal(s.Cash.closing, 101520); assert.equal(s.HDFC.closing, 174999.7);
});

test("5. Range = continuous; by-day sheets chain opening→closing", () => {
  const cb = buildCashBook({ txns, accounts, parties, cashId, period: { mode: "range", from: "2026-09-24", to: "2026-09-23" }, accountFilter: cashId });
  assert.equal(cb.from, "2026-09-23"); assert.equal(cb.opening, 3201720); assert.equal(cb.closing, 101520);
  const days = buildCashBookByDay({ txns, accounts, parties, cashId, period: { mode: "range", from: "2026-09-20", to: "2026-09-30" }, accountFilter: cashId });
  assert.equal(days.length, 2); assert.equal(days[0].closing, days[1].opening);
});

test("6. Ledger running balance ends at closing; balances helper agrees", () => {
  const lg = buildAccountLedger({ txns, accounts, parties, cashId, accountId: "hdfc", period: { mode: "all" } });
  assert.equal(lg.rows.at(-1).balance, lg.closing); assert.equal(lg.closing, 174999.7);
  assert.equal(accountBalances(accounts, txns, cashId).hdfc, 174999.7);
  assert.equal(accountBalances(accounts, txns, cashId, "2026-09-23")[cashId], 201520);
});

test("7. Overdrawn opening goes on the outward side", () => {
  const od = buildCashBook({ txns: [], accounts: [{ id: cashId, kind: "cash", name: "Cash", openingBalance: -500 }], parties, cashId, period: per("2026-09-23"), accountFilter: cashId });
  assert.equal(od.totalIn, 0); assert.equal(od.totalOut, 500); assert.equal(od.closing, -500);
});
