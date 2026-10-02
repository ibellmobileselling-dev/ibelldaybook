import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { deleteTransaction } from "../services/transactions";
import { accountName } from "../services/accounts";
import TopBar from "../components/TopBar";
import Avatar from "../components/Avatar";
import EntrySheet from "../components/EntrySheet";
import SkeletonRows from "../components/Skeleton";
import { ArrowDownLeftIcon, ArrowUpRightIcon, DownloadIcon, TrashIcon } from "../components/Icons";
import { signedAmount, reportWriteError, formatDay, rupees, compareTxns } from "../utils/ledger";
import { txnAccountId } from "../utils/cashbook";
import { exportPartyStatementPdf } from "../utils/exporters";

export default function PartyLedger() {
  const { partyId } = useParams();
  const { user } = useAuth();
  const { parties, txns: allTxns, accounts, cashId, shopName, loaded } = useData();
  const navigate = useNavigate();
  const [sheetType, setSheetType] = useState(null);

  const party = parties.find((p) => p.id === partyId);
  const accountsById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const txns = useMemo(() => allTxns.filter((t) => t.partyId === partyId).sort(compareTxns), [allTxns, partyId]);

  const { rows, netBalance } = useMemo(() => {
    const opening = Number(party?.openingBalance) || 0;
    const rows = txns.reduce((acc, t) => {
      const prev = acc.length ? acc[acc.length - 1].running : opening;
      return [...acc, { ...t, running: Math.round((prev + signedAmount(t)) * 100) / 100 }];
    }, []);
    return { rows, netBalance: rows.length ? rows[rows.length - 1].running : opening };
  }, [txns, party]);

  function handleDelete(t) {
    const label = `${t.type === "in" ? "You got" : "You gave"} ${rupees(t.amount)} on ${formatDay(t.date)}`;
    if (confirm(`Delete this entry (${label})? This cannot be undone.`)) {
      deleteTransaction(t.id).catch(reportWriteError);
    }
  }

  if (!party) {
    const missing = loaded.parties;
    return (
      <>
        <TopBar title={missing ? "Party not found" : "Loading…"} onBack={() => navigate(-1)} />
        <main className="page">
          {missing ? <div className="empty-state">This party doesn't exist or was deleted.</div> : <SkeletonRows count={4} />}
        </main>
      </>
    );
  }

  const isGive = netBalance < 0;
  const settled = Math.abs(netBalance) < 0.005;
  const newestFirst = [...rows].reverse();

  return (
    <>
      <TopBar
        title={party.name}
        subtitle={party.phone || "Party ledger"}
        onBack={() => navigate(-1)}
        right={
          <button
            className="capsule-btn icon-only press"
            aria-label="Download statement (PDF)"
            title="Download statement (PDF)"
            onClick={() => exportPartyStatementPdf({ party, txns: allTxns, shopName }).catch(reportWriteError)}
          >
            <DownloadIcon width={20} height={20} />
          </button>
        }
      />
      <main className="page with-actions">
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
                <div className={`txn-icon ${t.type}`} aria-hidden="true">
                  {t.type === "in" ? <ArrowDownLeftIcon width={18} height={18} /> : <ArrowUpRightIcon width={18} height={18} />}
                </div>
                <div className="txn-left">
                  <div className="txn-remark">{t.remark || (t.type === "in" ? "You got" : "You gave")}</div>
                  <div className="txn-date">
                    {accountName(accountsById[txnAccountId(t, cashId)])} · Bal {t.running < 0 ? "−" : ""}
                    {rupees(t.running)}
                    {t.fromOcr ? " · via scan" : ""}
                  </div>
                </div>
                <div className={`txn-amount ${t.type}`}>
                  <span className="sr-only">{t.type === "in" ? "You got " : "You gave "}</span>
                  {rupees(t.amount)}
                </div>
                <button type="button" className="txn-delete press" onClick={() => handleDelete(t)} aria-label="Delete entry" title="Delete">
                  <TrashIcon width={16} height={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <div className="action-bar">
        <button type="button" className="capsule glass glass--tinted-urgent press action-btn" onClick={() => setSheetType("out")}>
          <ArrowUpRightIcon width={18} height={18} /> You gave
        </button>
        <button type="button" className="capsule glass glass--tinted press action-btn" onClick={() => setSheetType("in")}>
          <ArrowDownLeftIcon width={18} height={18} /> You got
        </button>
      </div>

      {sheetType && (
        <EntrySheet
          userId={user.uid}
          parties={parties}
          accounts={accounts}
          fixedParty={party}
          initialType={sheetType}
          onClose={() => setSheetType(null)}
        />
      )}
    </>
  );
}
