import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { accountLabel } from "../services/accounts";
import TopBar from "../components/TopBar";
import PeriodPicker, { defaultPeriod } from "../components/PeriodPicker";
import SegmentedControl from "../components/SegmentedControl";
import EntrySheet from "../components/EntrySheet";
import DownloadBar from "../components/DownloadBar";
import CashBookTable from "../components/CashBookTable";
import { PlusIcon } from "../components/Icons";
import { ALL, buildCashBook, buildCashBookByDay, periodLabel } from "../utils/cashbook";
import { rupees, reportWriteError } from "../utils/ledger";
import { exportCashBookCsv, exportCashBookPdf, exportCashBookXlsx, exportPartyStatementPdf, fileSafe } from "../utils/exporters";

export default function CashBook() {
  const { user } = useAuth();
  const { parties, txns, accounts, cashId, shopName, loaded } = useData();
  const [period, setPeriod] = useState(defaultPeriod);
  const [accountFilter, setAccountFilter] = useState(ALL);
  const [dayWise, setDayWise] = useState(false);
  const [showEntry, setShowEntry] = useState(false);

  const scope = accountFilter === ALL ? null : accounts.find((a) => a.id === accountFilter);
  const scopeLabel = scope ? accountLabel(scope) : "All accounts";
  const multiDay = period.mode === "range" || period.mode === "all";
  const book = useMemo(
    () => buildCashBook({ txns, accounts, parties, cashId, period, accountFilter }),
    [txns, accounts, parties, cashId, period, accountFilter]
  );
  const days = useMemo(
    () => (multiDay && dayWise ? buildCashBookByDay({ txns, accounts, parties, cashId, period, accountFilter }) : null),
    [txns, accounts, parties, cashId, period, accountFilter, multiDay, dayWise]
  );

  const isCashOnly = scope?.kind === "cash";
  const meta = {
    shopName,
    periodLabel: periodLabel(period),
    scopeLabel,
    isCashOnly,
    showSummary: !scope,
    fileBase: `cashbook_${fileSafe(periodLabel(period))}_${fileSafe(scopeLabel)}`,
  };
  const books = days?.length ? days : [book];

  const accountOptions = [{ value: ALL, label: "All" }, ...accounts.map((a) => ({ value: a.id, label: a.kind === "cash" ? "Cash" : accountLabel(a) }))];

  return (
    <>
      <TopBar title="Cash Book" subtitle={shopName} />
      <main className="page with-fab">
        <section className="filters">
          <PeriodPicker value={period} onChange={setPeriod} />
          <div className="scroll-x">
            <SegmentedControl ariaLabel="Account" options={accountOptions} value={accountFilter} onChange={setAccountFilter} />
          </div>
          {multiDay && (
            <label className="switch-row">
              <input type="checkbox" checked={dayWise} onChange={(e) => setDayWise(e.target.checked)} />
              <span>Show day by day (opening and closing for each date)</span>
            </label>
          )}
        </section>

        <div key={`${meta.periodLabel}|${accountFilter}|${dayWise}`} className="fade-through">
          <section className="cb-summary" aria-label="Summary">
            <div className="cb-tile">
              <span>Opening</span>
              <strong>{book.opening < 0 ? "−" : ""}{rupees(book.opening)}</strong>
            </div>
            <div className="cb-tile in">
              <span>In</span>
              <strong>{rupees(book.sumIn)}</strong>
            </div>
            <div className="cb-tile out">
              <span>Out</span>
              <strong>{rupees(book.sumOut)}</strong>
            </div>
            <div className="cb-tile closing">
              <span>{isCashOnly ? "Cash on hand" : "Closing balance"}</span>
              <strong>{book.closing < 0 ? "−" : ""}{rupees(book.closing)}</strong>
            </div>
          </section>

          <DownloadBar
            label="Download cash book"
            onPdf={() => exportCashBookPdf(books, meta)}
            onExcel={() => exportCashBookXlsx(books, meta)}
            onCsv={() => exportCashBookCsv(books, meta)}
          />

          {!loaded.txns ? (
            <div className="card skeleton cb-skeleton" aria-busy="true" />
          ) : (
            books.map((cb) => (
              <CashBookTable key={cb.from} book={cb} shopName={shopName} title={days ? null : `Cash Book — ${meta.periodLabel}`} scopeLabel={scopeLabel} closingLabel={isCashOnly ? "Cash On Hand" : "Closing Balance"} />
            ))
          )}
          {days && days.length === 0 && <div className="empty-state">No entries in this period.</div>}

          {!scope && (
            <section className="card summary-table">
              <h3>Account-wise</h3>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th className="num">Opening</th>
                      <th className="num">In</th>
                      <th className="num">Out</th>
                      <th className="num">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {book.summary.map((s) => (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td className="num">{s.opening < 0 ? "−" : ""}{rupees(s.opening)}</td>
                        <td className="num">{rupees(s.in)}</td>
                        <td className="num">{rupees(s.out)}</td>
                        <td className="num strong">{s.closing < 0 ? "−" : ""}{rupees(s.closing)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <details className="card party-statements">
          <summary>Party statements (PDF)</summary>
          <div className="report-list">
            <div className="report-row">
              <div>
                <strong>Full party ledger</strong>
                <small>All parties, all entries</small>
              </div>
              <button className="btn btn-outline btn-sm press" onClick={() => exportPartyStatementPdf({ party: null, parties, txns, shopName }).catch(reportWriteError)}>
                PDF
              </button>
            </div>
            {parties
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => (
                <div key={p.id} className="report-row">
                  <div>
                    <strong>{p.name}</strong>
                    <small>Party statement</small>
                  </div>
                  <button className="btn btn-outline btn-sm press" onClick={() => exportPartyStatementPdf({ party: p, txns, shopName }).catch(reportWriteError)}>
                    PDF
                  </button>
                </div>
              ))}
          </div>
        </details>
      </main>

      <button className="fab capsule glass glass--tinted press" onClick={() => setShowEntry(true)}>
        <PlusIcon width={20} height={20} /> New entry
      </button>

      {showEntry && (
        <EntrySheet
          userId={user.uid}
          parties={parties}
          accounts={accounts}
          fixedAccountId={scope?.id}
          onClose={() => setShowEntry(false)}
        />
      )}
    </>
  );
}
