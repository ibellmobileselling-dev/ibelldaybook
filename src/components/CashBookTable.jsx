import { formatDMY } from "../utils/cashbook";
import { cashBookPairs, fmtAmount } from "../utils/exporters";

// The cash book on screen, in the client's Excel layout: Credit/Inward on the
// left, Debit/Outward on the right, each with Date | Particulars | Bank | Amount.
export default function CashBookTable({ book, shopName, title, scopeLabel, closingLabel }) {
  const pairs = cashBookPairs(book, scopeLabel);

  const cells = (r, side) =>
    r ? (
      <>
        <td className={`cb-date ${side}`}>{formatDMY(r.date, true)}</td>
        <td className={`cb-part ${r.isOpening ? "opening" : ""} ${r.isTransfer ? "transfer" : ""}`}>{r.particulars}</td>
        <td className="cb-bank">{r.account}</td>
        <td className="cb-amt num">₹ {fmtAmount(r.amount)}</td>
      </>
    ) : (
      <>
        <td className={`cb-date ${side}`} />
        <td />
        <td />
        <td className="cb-amt num">₹ -</td>
      </>
    );

  return (
    <section className="card cb-card">
      {/* Title and closing sit outside the wide table so they stay on screen */}
      <header className="cb-header">
        <div className="cb-header-text">
          <div className="cb-shop">{shopName}</div>
          <div className="cb-sub">{title || `${formatDMY(book.from)} — ${scopeLabel}`}</div>
        </div>
        <div className="cb-closing-box">
          <span>{closingLabel}</span>
          <strong>
            {book.closing < 0 ? "−" : ""}₹ {fmtAmount(Math.abs(book.closing))}
          </strong>
        </div>
      </header>
      <div className="table-scroll">
        <table className="cb-table">
          <thead>
            <tr className="cb-side">
              <th colSpan={4}>Credit/Inward</th>
              <th colSpan={4}>Debit/Outward</th>
            </tr>
            <tr className="cb-head">
              <th>Date</th>
              <th>Particulars</th>
              <th>Bank</th>
              <th className="num">Amount Rs.</th>
              <th className="right">Date</th>
              <th>Particulars</th>
              <th>Bank</th>
              <th className="num">Amount Rs.</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map(([l, r], i) => (
              <tr key={i}>
                {cells(l, "left")}
                {cells(r, "right")}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              <td className="center">Total</td>
              <td />
              <td className="num">₹ {fmtAmount(book.totalIn)}</td>
              <td className="right" />
              <td className="center">Total</td>
              <td />
              <td className="num">₹ {fmtAmount(book.totalOut)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
