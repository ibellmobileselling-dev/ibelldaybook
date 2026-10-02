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
import { BankIcon, LogoutIcon, PlusIcon, SearchIcon, WalletIcon } from "../components/Icons";
import { signedAmount, reportWriteError, formatDay, rupees } from "../utils/ledger";
import { accountBalances } from "../utils/cashbook";

const EMPTY_PARTY = { name: "", phone: "", openingBalance: "0" };

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { parties, txns, accounts, cashId, shopName, loaded } = useData();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newParty, setNewParty] = useState(EMPTY_PARTY);

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
    for (const p of parties) {
      const bal = balances[p.id]?.balance || 0;
      if (bal < 0) give += -bal;
      else get += bal;
    }
    return { give, get };
  }, [parties, balances]);

  const accountBal = useMemo(() => accountBalances(accounts, txns, cashId), [accounts, txns, cashId]);

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

  const net = totals.get - totals.give;

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
        <section className="hero" aria-label="Party balances">
          <div className="hero-label">Net balance with parties</div>
          <div className={`hero-value ${net < 0 ? "give" : ""}`}>
            {net < 0 ? "−" : ""}
            {rupees(net)}
          </div>
          <div className="hero-sub">
            {net < 0 ? "You'll give overall" : "You'll get overall"} · {parties.length} {parties.length === 1 ? "party" : "parties"}
          </div>
          <div className="hero-tiles">
            <div className="hero-tile get">
              <span>You'll get</span>
              <strong>{rupees(totals.get)}</strong>
            </div>
            <div className="hero-tile give">
              <span>You'll give</span>
              <strong>{rupees(totals.give)}</strong>
            </div>
          </div>
        </section>

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
