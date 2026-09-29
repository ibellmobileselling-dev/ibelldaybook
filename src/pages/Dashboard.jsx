import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listenParties, addParty } from "../services/parties";
import { listenAllTransactions } from "../services/transactions";
import BottomNav from "../components/BottomNav";
import TopBar from "../components/TopBar";

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
        bal += t.type === "in" ? t.amount : -t.amount;
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

  async function handleAddParty(e) {
    e.preventDefault();
    if (!newParty.name.trim()) return;
    await addParty(user.uid, newParty);
    setNewParty({ name: "", phone: "", openingBalance: "0" });
    setShowAdd(false);
  }

  return (
    <>
      <TopBar
        title="IBELL MOBILE"
        right={
          <button className="icon-btn" onClick={logout} title="Logout">
            ⏻
          </button>
        }
      />
      <div className="page">
        <div className="summary-row">
          <div className="summary-card give">
            <div className="label">You'll Give</div>
            <div className="value">₹{totals.give.toLocaleString("en-IN")}</div>
          </div>
          <div className="summary-card get">
            <div className="label">You'll Get</div>
            <div className="value">₹{totals.get.toLocaleString("en-IN")}</div>
          </div>
        </div>

        <div className="search-box">
          <input
            placeholder="Search party..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {showAdd && (
          <form className="form" onSubmit={handleAddParty} style={{ paddingTop: 0 }}>
            <div className="field">
              <label>Party Name</label>
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
                value={newParty.phone}
                onChange={(e) => setNewParty((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Opening Balance</label>
              <input
                type="number"
                value={newParty.openingBalance}
                onChange={(e) => setNewParty((f) => ({ ...f, openingBalance: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Add Party
              </button>
            </div>
          </form>
        )}

        <div className="party-list">
          {filtered.length === 0 && !showAdd && (
            <div className="empty-state">No parties yet. Tap + to add your first party.</div>
          )}
          {filtered.map((p) => {
            const info = balances[p.id] || { balance: 0 };
            const isGive = info.balance < 0;
            return (
              <Link key={p.id} to={`/party/${p.id}`} className="party-card">
                <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div className="party-avatar">{initials(p.name)}</div>
                  <div className="party-info">
                    <div className="party-name">{p.name}</div>
                    {info.lastDate && <div className="party-date">Last: {info.lastDate}</div>}
                  </div>
                </div>
                <div className={`party-balance ${isGive ? "give" : "get"}`}>
                  ₹{Math.abs(info.balance).toLocaleString("en-IN")}
                  <span className="bal-label">{isGive ? "You'll Give" : "You'll Get"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <button className="fab" onClick={() => setShowAdd((s) => !s)}>
        +
      </button>
      <BottomNav />
    </>
  );
}
