import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listenParties } from "../services/parties";
import { listenTransactionsForParty, addTransaction, deleteTransaction } from "../services/transactions";
import TopBar from "../components/TopBar";
import Sheet from "../components/Sheet";
import Avatar from "../components/Avatar";
import { ArrowDownLeftIcon, ArrowUpRightIcon, TrashIcon } from "../components/Icons";
import { todayLocal, signedAmount, reportWriteError, formatDay, rupees } from "../utils/ledger";

export default function PartyLedger() {
  const { partyId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [txns, setTxns] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState("in");
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [date, setDate] = useState(todayLocal);

  useEffect(() => {
    if (!user) return;
    const unsub1 = listenParties(user.uid, setParties);
    const unsub2 = listenTransactionsForParty(user.uid, partyId, setTxns);
    return () => {
      unsub1();
      unsub2();
    };
  }, [user, partyId]);

  const party = parties.find((p) => p.id === partyId);

  const { rows, netBalance } = useMemo(() => {
    let running = Number(party?.openingBalance) || 0;
    const rows = txns.map((t) => {
      running += signedAmount(t);
      return { ...t, running };
    });
    return { rows, netBalance: running };
  }, [txns, party]);

  function handleAdd(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    addTransaction(user.uid, { partyId, type, amount, remark, date }).catch(reportWriteError);
    setAmount("");
    setRemark("");
    setShowAdd(false);
  }

  function handleDelete(t) {
    const label = `${t.type === "in" ? "+" : "-"}₹${t.amount.toLocaleString("en-IN")} on ${t.date}`;
    if (confirm(`Delete this transaction (${label})? This cannot be undone.`)) {
      deleteTransaction(t.id).catch(reportWriteError);
    }
  }

  if (!party) {
    return (
      <>
        <TopBar title="Loading…" onBack={() => navigate(-1)} />
        <div className="screen-center">Loading party…</div>
      </>
    );
  }

  const isGive = netBalance < 0;
  const settled = Math.abs(netBalance) < 0.005;
  const closeAdd = () => setShowAdd(false);
  function openAdd(t) {
    setType(t);
    setShowAdd(true);
  }

  // Newest first, with a header whenever the date changes.
  const newestFirst = [...rows].reverse();

  return (
    <>
      <TopBar
        title={party.name}
        subtitle={party.phone || "Party ledger"}
        onBack={() => navigate(-1)}
      />
      <div className="page ledger-page">
        <section className={`ledger-hero ${settled ? "zero" : isGive ? "give" : "get"}`}>
          <Avatar name={party.name} size="lg" />
          <div>
            <div className="hero-label">{settled ? "All settled" : isGive ? "You'll give" : "You'll get"}</div>
            <div className="ledger-hero-value">{rupees(netBalance)}</div>
          </div>
        </section>

        <div className="section-head">
          <h2>Entries</h2>
          <span className="count-pill">{rows.length}</span>
        </div>

        <div className="txn-list">
          {rows.length === 0 && <div className="empty-state">No entries yet. Use the buttons below to add one.</div>}
          {newestFirst.map((t, i) => (
            <div key={t.id} className="txn-group">
              {t.date !== newestFirst[i - 1]?.date && <div className="txn-day">{formatDay(t.date)}</div>}
              <div className="txn-row">
                <div className={`txn-icon ${t.type}`}>
                  {t.type === "in" ? <ArrowDownLeftIcon width={18} height={18} /> : <ArrowUpRightIcon width={18} height={18} />}
                </div>
                <div className="txn-left">
                  <div className="txn-remark">{t.remark || (t.type === "in" ? "You got" : "You gave")}</div>
                  <div className="txn-date">
                    Bal {t.running < 0 ? "−" : ""}
                    {rupees(t.running)}
                    {t.fromOcr ? " · via scan" : ""}
                  </div>
                </div>
                <div className={`txn-amount ${t.type}`}>{rupees(t.amount)}</div>
                <button type="button" className="txn-delete" onClick={() => handleDelete(t)} aria-label="Delete entry" title="Delete">
                  <TrashIcon width={16} height={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="action-bar">
        <button type="button" className="btn btn-give" onClick={() => openAdd("out")}>
          <ArrowUpRightIcon width={18} height={18} /> You gave
        </button>
        <button type="button" className="btn btn-got" onClick={() => openAdd("in")}>
          <ArrowDownLeftIcon width={18} height={18} /> You got
        </button>
      </div>

      {showAdd && (
        <Sheet title={type === "in" ? `You got from ${party.name}` : `You gave to ${party.name}`} onClose={closeAdd}>
          <form className="form" onSubmit={handleAdd}>
            <div className="type-toggle">
              <button type="button" className={`type-btn in ${type === "in" ? "selected" : ""}`} onClick={() => setType("in")}>
                You got
              </button>
              <button type="button" className={`type-btn out ${type === "out" ? "selected" : ""}`} onClick={() => setType("out")}>
                You gave
              </button>
            </div>
            <div className="amount-field">
              <span>₹</span>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                required
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Remark (optional)</label>
              <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="e.g. mobile repair" />
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn-outline" onClick={closeAdd}>
                Cancel
              </button>
              <button type="submit" className={`btn ${type === "in" ? "btn-got" : "btn-give"}`}>
                Save
              </button>
            </div>
          </form>
        </Sheet>
      )}
    </>
  );
}
