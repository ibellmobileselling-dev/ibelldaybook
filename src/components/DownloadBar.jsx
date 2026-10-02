import { useState } from "react";
import { DownloadIcon } from "./Icons";
import { reportWriteError } from "../utils/ledger";

// PDF / Excel / CSV buttons for the current filtered report.
export default function DownloadBar({ label, onPdf, onExcel, onCsv }) {
  const [busy, setBusy] = useState("");

  async function run(kind, fn) {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      reportWriteError(err);
    } finally {
      setBusy("");
    }
  }

  const btn = (kind, text, fn) => (
    <button type="button" className="btn btn-outline btn-sm press" disabled={!!busy} onClick={() => run(kind, fn)}>
      {busy === kind ? "Preparing…" : text}
    </button>
  );

  return (
    <div className="download-bar card">
      <span className="download-label">
        <DownloadIcon width={18} height={18} aria-hidden="true" /> {label}
      </span>
      <div className="download-btns">
        {btn("pdf", "PDF", onPdf)}
        {btn("xlsx", "Excel", onExcel)}
        {btn("csv", "CSV", onCsv)}
      </div>
    </div>
  );
}
