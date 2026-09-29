import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listenParties } from "../services/parties";
import { listenTransactionsForParty, addTransaction, deleteTransaction } from "../services/transactions";
import TopBar from "../components/TopBar";

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
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

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
      running += t.type === "in" ? t.amount : -t.amount;
      return { ...t, running };
    });
    return { rows, netBalance: running };
  }, [txns, party]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    await addTransaction(user.uid, { partyId, type, amount, remark, date });
    setAmount("");
    setRemark("");
    setShowAdd(false);
  }

  async function handleDelete(txnId) {
    if (confirm("Delete this transaction?")) {
      await deleteTransaction(txnId);
    }
  }

  if (!party) {
    return (
      <>
        <TopBar title="Loading..." onBack={() => navigate(-1)} />
        <div className="screen-center">Loading party...</div>
      </>
    );
  }

  const isGive = netBalance < 0;

  return (
    <>
      <TopBar title={party.name} onBack={() => navigate(-1)} />
      <div className="page" style={{ paddingBottom: showAdd ? 20 : 90 }}>
        <div className="ledger-summary">
          <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {isGive ? "You'll Give" : "You'll Get"}
          </div>
          <div className="value" style={{ color: isGive ? "var(--red)" : "var(--primary)" }}>
            ₹{Math.abs(netBalance).toLocaleString("en-IN")}
          </div>
        </div>

        {showAdd && (
          <form className="form" onSubmit={handleAdd}>
            <div className="type-toggle">
              <button type="button" className={`type-btn in ${type === "in" ? "selected" : ""}`} onClick={() => setType("in")}>
                You Got (In)
              </button>
              <button type="button" className={`type-btn out ${type === "out" ? "selected" : ""}`} onClick={() => setType("out")}>
                You Gave (Out)
              </button>
            </div>
            <div className="field">
              <label>Amount</label>
              <input type="number" autoFocus required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field">
              <label>Remark (optional)</label>
              <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="e.g. mobile repair" />
            </div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Save
              </button>
            </div>
          </form>
        )}

        <div className="txn-list">
          {rows.length === 0 && <div className="empty-state">No transactions yet.</div>}
          {[...rows].reverse().map((t) => (
            <div key={t.id} className="txn-row" onClick={() => handleDelete(t.id)}>
              <div className="txn-left">
                <div className="txn-remark">{t.remark || (t.type === "in" ? "Payment received" : "Payment given")}</div>
                <div className="txn-date">{t.date}{t.fromOcr ? " · via scan" : ""}</div>
              </div>
              <div>
                <div className={`txn-amount ${t.type}`}>
                  {t.type === "in" ? "+" : "-"}₹{t.amount.toLocaleString("en-IN")}
                </div>
                <span className="txn-running">Bal ₹{t.running.toLocaleString("en-IN")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!showAdd && (
        <button className="fab" onClick={() => setShowAdd(true)}>
          +
        </button>
      )}
    </>
  );
}
