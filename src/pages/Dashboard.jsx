import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { addParty } from "../services/parties";
import { accountLabel } from "../services/accounts";
import TopBar from "../components/TopBar";
import Sheet from "../components/Sheet";
import Avatar from "../components/Avatar";
import SkeletonRows from "../components/Skeleton";
import PaiseCheckSheet, { findPaiseItems } from "../components/PaiseCheckSheet";
import { ArrowDownLeftIcon, ArrowUpRightIcon, BankIcon, LogoutIcon, PlusIcon, SearchIcon, WalletIcon } from "../components/Icons";
import { signedAmount, reportWriteError, formatDay, rupees, todayLocal } from "../utils/ledger";
import { ALL, buildCashBook, formatDMY } from "../utils/cashbook";

const EMPTY_PARTY = { name: "", phone: "", openingBalance: "0" };

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { parties, txns, accounts, cashId, shopName, loaded } = useData();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newParty, setNewParty] = useState(EMPTY_PARTY);
  const [showPaise, setShowPaise] = useState(false);

  // One pass over the entries for every party's balance and last date.
  const balances = useMemo(() => {
    const byParty = new Map(parties.map((p) => [p.id, []]));
    for (const t of txns) byParty.get(t.partyId)?.push(t);
    return Object.fromEntries(
      parties.map((p) => {
        const list = byParty.get(p.id);
        const balance = list.reduce((s, t) => s + signedAmount(t), Number(p.openingBalance) || 0);
        const lastDate = list.reduce((d, t) => ((t.date || "") > d ? t.date : d), "");
        return [p.id, { balance: Math.round(balance * 100) / 100, lastDate }];
      })
    );
  }, [parties, txns]);

  const totals = useMemo(() => {
    let give = 0;
    let get = 0;
    let giveCount = 0;
    let getCount = 0;
    for (const p of parties) {
      const bal = balances[p.id]?.balance || 0;
      if (bal <= -0.005) {
        give += -bal;
        giveCount++;
      } else if (bal >= 0.005) {
        get += bal;
        getCount++;
      }
    }
    return { give, get, giveCount, getCount };
  }, [parties, balances]);

  // Today's cash book across all accounts: what the shop has right now.
  // Transfers between own accounts move money but are not income or spending,
  // so they are left out of today's In / Out (the closing is unaffected).
  const today = useMemo(() => {
    const book = buildCashBook({ txns, accounts, parties, cashId, period: { mode: "today" }, accountFilter: ALL });
    const sum = (rows) => Math.round(rows.filter((r) => !r.isTransfer).reduce((s, r) => s + r.amount, 0) * 100) / 100;
    const byAccount = Object.fromEntries(book.summary.map((s) => [s.id, s.closing]));
    const cash = byAccount[cashId] || 0;
    return { opening: book.opening, in: sum(book.inward), out: sum(book.outward), closing: book.closing, cash, bank: Math.round((book.closing - cash) * 100) / 100, byAccount };
  }, [txns, accounts, parties, cashId]);
  const accountBal = today.byAccount;
  const paiseItems = useMemo(() => findPaiseItems({ txns, accounts, parties }), [txns, accounts, parties]);

  const filtered = parties
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  function handleAddParty(e, close) {
    e.preventDefault();
    if (!newParty.name.trim()) return;
    addParty(user.uid, newParty).catch(reportWriteError);
    setNewParty(EMPTY_PARTY);
    close();
  }


  return (
    <>
      <TopBar
        subtitle="Daybook"
        title={shopName}
        right={
          <button className="capsule-btn icon-only press" onClick={logout} title="Logout" aria-label="Logout">
            <LogoutIcon width={20} height={20} />
          </button>
        }
      />
      <main className="page with-fab">
        <Link to="/reports" className="hero hero-link press-content" aria-label="Today's cash book. Open Cash Book">
          <div className="hero-top">
            <span className="hero-label">Today · {formatDMY(todayLocal())}</span>
            <span className="hero-open">Cash Book ›</span>
          </div>
          <div className="hero-caption">Closing balance</div>
          <div className={`hero-value ${today.closing < 0 ? "give" : ""}`}>
            {today.closing < 0 ? "−" : ""}
            {rupees(today.closing)}
          </div>
          <div className="hero-sub">
            Cash {today.cash < 0 ? "−" : ""}{rupees(today.cash)} · Bank {today.bank < 0 ? "−" : ""}{rupees(today.bank)}
          </div>
          <div className="hero-tiles three">
            <div className="hero-tile">
              <span>Opening</span>
              <strong>{today.opening < 0 ? "−" : ""}{rupees(today.opening)}</strong>
            </div>
            <div className="hero-tile get">
              <span>
                <ArrowDownLeftIcon width={13} height={13} aria-hidden="true" /> In
              </span>
              <strong>{rupees(today.in)}</strong>
            </div>
            <div className="hero-tile give">
              <span>
                <ArrowUpRightIcon width={13} height={13} aria-hidden="true" /> Out
              </span>
              <strong>{rupees(today.out)}</strong>
            </div>
          </div>
        </Link>

        {paiseItems.length > 0 && (
          <button type="button" className="notice press-content" onClick={() => setShowPaise(true)}>
            <strong>{paiseItems.length} amount{paiseItems.length === 1 ? "" : "s"} with paise</strong>
            <span>e.g. {rupees(paiseItems[0].amount)}. Tap to check for typing mistakes.</span>
          </button>
        )}

        <div className="section-head">
          <h2>Party dues</h2>
        </div>
        <div className="dues">
          <div className="due-tile get">
            <span>You'll get</span>
            <strong>{rupees(totals.get)}</strong>
            <small>from {totals.getCount} {totals.getCount === 1 ? "party" : "parties"}</small>
          </div>
          <div className="due-tile give">
            <span>You'll give</span>
            <strong>{rupees(totals.give)}</strong>
            <small>to {totals.giveCount} {totals.giveCount === 1 ? "party" : "parties"}</small>
          </div>
        </div>

        <div className="section-head">
          <h2>Money in accounts</h2>
          <Link to="/accounts" className="section-link">Manage</Link>
        </div>
        <div className="account-strip">
          {accounts.map((a) => {
            const bal = accountBal[a.id] ?? 0;
            return (
              <Link key={a.id} to={`/account/${a.id}`} className="account-tile press-content">
                <span className={`account-icon ${a.kind}`}>{a.kind === "cash" ? <WalletIcon width={18} height={18} /> : <BankIcon width={18} height={18} />}</span>
                <span className="account-tile-name">{a.kind === "cash" ? "Cash in hand" : accountLabel(a)}</span>
                <strong className={bal < 0 ? "neg" : ""}>
                  {bal < 0 ? "−" : ""}
                  {rupees(bal)}
                </strong>
              </Link>
            );
          })}
          <Link to="/accounts?add=1" className="account-tile add press-content">
            <span className="account-icon"><PlusIcon width={18} height={18} /></span>
            <span className="account-tile-name">Add bank</span>
          </Link>
        </div>

        <div className="section-head">
          <h2>Parties</h2>
          <span className="count-pill">{filtered.length}</span>
        </div>

        <label className="search-box">
          <SearchIcon width={18} height={18} aria-hidden="true" />
          <input placeholder="Search party" aria-label="Search party" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>

        {!loaded.parties ? (
          <SkeletonRows count={6} />
        ) : (
          <div className="party-list">
            {filtered.length === 0 && (
              <div className="empty-state">
                {parties.length === 0 ? "No parties yet. Tap “Add party” to add your first one." : "No party matches your search."}
              </div>
            )}
            {filtered.map((p, i) => {
              const info = balances[p.id] || { balance: 0 };
              const isGive = info.balance < 0;
              const settled = Math.abs(info.balance) < 0.005;
              return (
                <Link key={p.id} to={`/party/${p.id}`} className="party-card press-content cascade" style={{ "--i": i }}>
                  <Avatar name={p.name} />
                  <div className="party-info">
                    <div className="party-name">{p.name}</div>
                    <div className="party-date">{info.lastDate ? formatDay(info.lastDate) : "No entries yet"}</div>
                  </div>
                  <div className={`party-balance ${settled ? "zero" : isGive ? "give" : "get"}`}>
                    {rupees(info.balance)}
                    <span className="bal-label">{settled ? "Settled" : isGive ? "You'll give" : "You'll get"}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <button className="fab capsule glass glass--tinted press" onClick={() => setShowAdd(true)}>
        <PlusIcon width={20} height={20} /> Add party
      </button>

      {showPaise && <PaiseCheckSheet items={paiseItems} userId={user.uid} onClose={() => setShowPaise(false)} />}

      {showAdd && (
        <Sheet title="New party" onClose={() => setShowAdd(false)}>
          {(close) => (
            <form className="form" onSubmit={(e) => handleAddParty(e, close)}>
              <label className="field">
                <span>Party name</span>
                <input autoFocus required value={newParty.name} onChange={(e) => setNewParty((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="field">
                <span>Phone (optional)</span>
                <input type="tel" value={newParty.phone} onChange={(e) => setNewParty((f) => ({ ...f, phone: e.target.value }))} />
              </label>
              <label className="field">
                <span>Opening balance</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={newParty.openingBalance}
                  onChange={(e) => setNewParty((f) => ({ ...f, openingBalance: e.target.value }))}
                />
                <small className="field-hint">Positive if they owe you, negative if you owe them.</small>
              </label>
              <div className="btn-row">
                <button type="button" className="btn btn-outline press" onClick={close}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary press">
                  Add party
                </button>
              </div>
            </form>
          )}
        </Sheet>
      )}
    </>
  );
}
