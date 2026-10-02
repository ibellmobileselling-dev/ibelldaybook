import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { accountLabel } from "../services/accounts";
import { deleteTransaction } from "../services/transactions";
import TopBar from "../components/TopBar";
import PeriodPicker from "../components/PeriodPicker";
import DownloadBar from "../components/DownloadBar";
import EntrySheet from "../components/EntrySheet";
import AccountSheet from "../components/AccountSheet";
import SkeletonRows from "../components/Skeleton";
import { ArrowDownLeftIcon, ArrowUpRightIcon, BankIcon, EditIcon, PlusIcon, TransferIcon, TrashIcon, WalletIcon } from "../components/Icons";
import { accountBalances, buildAccountLedger, effectsOf, periodLabel } from "../utils/cashbook";
import { formatDay, rupees, reportWriteError, todayLocal } from "../utils/ledger";
import { exportLedgerCsv, exportLedgerPdf, exportLedgerXlsx, fileSafe } from "../utils/exporters";

export default function AccountLedger() {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { parties, txns, accounts, cashId, shopName, loaded } = useData();
  const [period, setPeriod] = useState(() => {
    const t = todayLocal();
    return { mode: "all", date: t, from: `${t.slice(0, 8)}01`, to: t };
  });
  const [showEntry, setShowEntry] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const account = accounts.find((a) => a.id === accountId);
  const ledger = useMemo(
    () => (account ? buildAccountLedger({ txns, accounts, parties, cashId, accountId, period }) : null),
    [account, txns, accounts, parties, cashId, accountId, period]
  );
  const balanceNow = useMemo(() => accountBalances(accounts, txns, cashId)[accountId] ?? 0, [accounts, txns, cashId, accountId]);
  const hasEntries = useMemo(
    () => txns.some((t) => effectsOf(t, cashId).some((e) => e.accountId === accountId)),
    [txns, cashId, accountId]
  );
  const txnById = useMemo(() => Object.fromEntries(txns.map((t) => [t.id, t])), [txns]);

  if (!account) {
    return (
      <>
        <TopBar title={loaded.accounts ? "Account not found" : "Loading…"} onBack={() => navigate(-1)} />
        <main className="page">
          {loaded.accounts ? <div className="empty-state">This account doesn't exist or was deleted.</div> : <SkeletonRows count={4} />}
        </main>
      </>
    );
  }

  const label = account.kind === "cash" ? "Cash in hand" : accountLabel(account);
  const meta = {
    shopName,
    accountLabel: label,
    periodLabel: periodLabel(period),
    fileBase: `ledger_${fileSafe(label)}_${fileSafe(periodLabel(period))}`,
  };
  const newestFirst = [...ledger.rows].reverse();

  function handleDelete(row) {
    const t = txnById[row.txnId];
    if (!t) return;
    const what = t.type === "transfer" ? "transfer" : "entry";
    if (confirm(`Delete this ${what} (${row.particulars}, ${rupees(row.amount)} on ${formatDay(row.date)})? This cannot be undone.`)) {
      deleteTransaction(t.id).catch(reportWriteError);
    }
  }

  return (
    <>
      <TopBar
        title={label}
        subtitle={account.kind === "cash" ? "Cash ledger" : account.bankName}
        onBack={() => navigate(-1)}
        right={
          <button className="capsule-btn icon-only press" onClick={() => setShowEdit(true)} aria-label="Edit account" title="Edit account">
            <EditIcon width={20} height={20} />
          </button>
        }
      />
      <main className="page with-fab">
        <section className={`ledger-hero ${balanceNow < 0 ? "give" : "get"}`}>
          <span className={`account-icon xl ${account.kind}`} aria-hidden="true">
            {account.kind === "cash" ? <WalletIcon width={24} height={24} /> : <BankIcon width={24} height={24} />}
          </span>
          <div>
            <div className="hero-label">{balanceNow < 0 ? "Overdrawn" : "Current balance"}</div>
            <div className="ledger-hero-value">
              {balanceNow < 0 ? "−" : ""}
              {rupees(balanceNow)}
            </div>
          </div>
        </section>

        <section className="filters">
          <PeriodPicker value={period} onChange={setPeriod} />
        </section>

        <div key={meta.periodLabel} className="fade-through">
          <section className="cb-summary" aria-label="Summary">
            <div className="cb-tile">
              <span>Opening</span>
              <strong>{ledger.opening < 0 ? "−" : ""}{rupees(ledger.opening)}</strong>
            </div>
            <div className="cb-tile in">
              <span>In</span>
              <strong>{rupees(ledger.totalIn)}</strong>
            </div>
            <div className="cb-tile out">
              <span>Out</span>
              <strong>{rupees(ledger.totalOut)}</strong>
            </div>
            <div className="cb-tile closing">
              <span>Closing</span>
              <strong>{ledger.closing < 0 ? "−" : ""}{rupees(ledger.closing)}</strong>
            </div>
          </section>

          <DownloadBar
            label="Download ledger"
            onPdf={() => exportLedgerPdf(ledger, meta)}
            onExcel={() => exportLedgerXlsx(ledger, meta)}
            onCsv={() => exportLedgerCsv(ledger, meta)}
          />

          <div className="section-head">
            <h2>History</h2>
            <span className="count-pill">{ledger.rows.length}</span>
          </div>

          <div className="txn-list">
            {ledger.rows.length === 0 && <div className="empty-state">No entries in this period.</div>}
            {newestFirst.map((r, i) => {
              const dir = r.in ? "in" : "out";
              return (
                <div key={r.id} className="txn-group">
                  {r.date !== newestFirst[i - 1]?.date && <div className="txn-day">{formatDay(r.date)}</div>}
                  <div className="txn-row">
                    <div className={`txn-icon ${r.isTransfer ? "transfer" : dir}`} aria-hidden="true">
                      {r.isTransfer ? (
                        <TransferIcon width={18} height={18} />
                      ) : dir === "in" ? (
                        <ArrowDownLeftIcon width={18} height={18} />
                      ) : (
                        <ArrowUpRightIcon width={18} height={18} />
                      )}
                    </div>
                    <div className="txn-left">
                      <div className="txn-remark">{r.particulars}</div>
                      <div className="txn-date">
                        Bal {r.balance < 0 ? "−" : ""}
                        {rupees(r.balance)}
                      </div>
                    </div>
                    <div className={`txn-amount ${dir}`}>
                      <span className="sr-only">{dir === "in" ? "In " : "Out "}</span>
                      {dir === "in" ? "+" : "−"}
                      {rupees(r.amount)}
                    </div>
                    <button type="button" className="txn-delete press" onClick={() => handleDelete(r)} aria-label="Delete entry" title="Delete">
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                </div>
              );
            })}
            {ledger.rows.length > 0 && (
              <div className="txn-opening">
                Opening balance {ledger.from > "0000-01-01" ? `on ${formatDay(ledger.from)}` : ""}: {ledger.opening < 0 ? "−" : ""}
                {rupees(ledger.opening)}
              </div>
            )}
          </div>
        </div>
      </main>

      <button className="fab capsule glass glass--tinted press" onClick={() => setShowEntry(true)}>
        <PlusIcon width={20} height={20} /> New entry
      </button>

      {showEntry && (
        <EntrySheet userId={user.uid} parties={parties} accounts={accounts} fixedAccountId={accountId} onClose={() => setShowEntry(false)} />
      )}
      {showEdit && (
        <AccountSheet
          userId={user.uid}
          account={account}
          hasEntries={hasEntries}
          onClose={() => setShowEdit(false)}
          onDeleted={() => navigate("/accounts", { replace: true })}
        />
      )}
    </>
  );
}
