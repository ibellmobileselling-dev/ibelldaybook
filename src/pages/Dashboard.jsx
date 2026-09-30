import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listenParties, addParty } from "../services/parties";
import { listenAllTransactions } from "../services/transactions";
import BottomNav from "../components/BottomNav";
import TopBar from "../components/TopBar";
import Sheet from "../components/Sheet";
import Avatar from "../components/Avatar";
import { LogoutIcon, PlusIcon, SearchIcon } from "../components/Icons";
import { signedAmount, reportWriteError, formatDay, rupees } from "../utils/ledger";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [parties, setParties] = useState([]);
  const [txns, setTxns] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newParty, setNewParty] = useState({ name: "", phone: "", openingBalance: "0" });

  useEffect(() => {
    if (!user) return;
    const unsub1 = listenParties(user.uid, setParties);
    const unsub2 = listenAllTransactions(user.uid, setTxns);
    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  const balances = useMemo(() => {
    const map = {};
    for (const p of parties) {
      let bal = Number(p.openingBalance) || 0;
      for (const t of txns) {
        if (t.partyId !== p.id) continue;
        bal += signedAmount(t);
      }
      const lastTxn = txns
        .filter((t) => t.partyId === p.id)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
      map[p.id] = { balance: bal, lastDate: lastTxn?.date };
    }
    return map;
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

  const filtered = parties
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  function handleAddParty(e) {
    e.preventDefault();
    if (!newParty.name.trim()) return;
    addParty(user.uid, newParty).catch(reportWriteError);
    setNewParty({ name: "", phone: "", openingBalance: "0" });
    setShowAdd(false);
  }

  const net = totals.get - totals.give;
  const closeAdd = () => setShowAdd(false);

  return (
    <>
      <TopBar
        subtitle="Daybook"
        title="IBELL MOBILE"
        right={
          <button className="icon-btn" onClick={logout} title="Logout" aria-label="Logout">
            <LogoutIcon width={20} height={20} />
          </button>
        }
      />
      <div className="page">
        <section className="hero">
          <div className="hero-label">Net balance</div>
          <div className={`hero-value ${net < 0 ? "give" : ""}`}>
            {net < 0 ? "−" : ""}
            {rupees(net)}
          </div>
          <div className="hero-sub">
            {net < 0 ? "You'll give overall" : "You'll get overall"} · {parties.length}{" "}
            {parties.length === 1 ? "party" : "parties"}
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
          <h2>Parties</h2>
          <span className="count-pill">{filtered.length}</span>
        </div>

        <label className="search-box">
          <SearchIcon width={18} height={18} />
          <input placeholder="Search party" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>

        <div className="party-list">
          {filtered.length === 0 && (
            <div className="empty-state">
              {parties.length === 0 ? "No parties yet. Tap “Add party” to add your first one." : "No party matches your search."}
            </div>
          )}
          {filtered.map((p) => {
            const info = balances[p.id] || { balance: 0 };
            const isGive = info.balance < 0;
            const settled = Math.abs(info.balance) < 0.005;
            return (
              <Link key={p.id} to={`/party/${p.id}`} className="party-card">
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
      </div>

      <button className="fab" onClick={() => setShowAdd(true)}>
        <PlusIcon width={20} height={20} /> Add party
      </button>

      {showAdd && (
        <Sheet title="New party" onClose={closeAdd}>
          <form className="form" onSubmit={handleAddParty}>
            <div className="field">
              <label>Party name</label>
              <input
                autoFocus
                required
                value={newParty.name}
                onChange={(e) => setNewParty((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Phone (optional)</label>
              <input
                type="tel"
                value={newParty.phone}
                onChange={(e) => setNewParty((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Opening balance</label>
              <input
                type="number"
                inputMode="decimal"
                value={newParty.openingBalance}
                onChange={(e) => setNewParty((f) => ({ ...f, openingBalance: e.target.value }))}
              />
              <div className="field-hint">Positive if they owe you, negative if you owe them.</div>
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-outline" onClick={closeAdd}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Add party
              </button>
            </div>
          </form>
        </Sheet>
      )}
      <BottomNav />
    </>
  );
}
