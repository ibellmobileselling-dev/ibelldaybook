// PDF / Excel / CSV exports for the cash book, account ledgers and party
// statements. jsPDF and ExcelJS are loaded only when a download is requested.

import { formatDMY } from "./cashbook";
import { compareTxns, signedAmount } from "./ledger";
import { drawText, canvasTextHooks } from "./pdfText";

// Colours of the client's Excel cash-book template.
const XL_HEAD = "FFA69F4D"; // olive header/total rows
const XL_BODY = "FFC5D9F1"; // light-blue body rows
const XL_TITLE = "FFFFF200"; // yellow shop name
const PDF_HEAD = [166, 159, 77];
const PDF_BODY = [197, 217, 241];
const PDF_TEXT = [17, 17, 17];

export function fmtAmount(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 });
}

function fileSafe(s) {
  return String(s).replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "") || "report";
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function loadPdf() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable/es")]);
  return { jsPDF, autoTable };
}

async function loadExcel() {
  const mod = await import("exceljs");
  return mod.default || mod;
}

// ---------- Cash book: shared layout ----------

// Pairs the inward and outward lists side by side, opening balance first.
// Shared by the on-screen table and every export so they always match.
export function cashBookPairs(cb, scopeLabel) {
  const left = [];
  const right = [];
  const opening = {
    id: "opening",
    date: cb.from > "0000-01-01" ? cb.from : "",
    particulars: cb.opening < 0 ? "OPENING BALANCE (overdrawn)" : "OPENING BALANCE",
    account: scopeLabel,
    amount: Math.abs(cb.opening),
    isOpening: true,
  };
  (cb.opening < 0 ? right : left).push(opening);
  left.push(...cb.inward);
  right.push(...cb.outward);
  const n = Math.max(left.length, right.length, 1);
  return Array.from({ length: n }, (_, i) => [left[i], right[i]]);
}

function closingLabel(meta) {
  return meta.isCashOnly ? "Cash On Hand" : "Closing Balance";
}

function blockTitle(cb, meta) {
  const period = cb.from === cb.to ? formatDMY(cb.from) : meta.periodLabel;
  return `Cash Book — ${period} — ${meta.scopeLabel}`;
}

// ---------- Cash book: CSV ----------

function csvCell(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCashBookCsv(books, meta) {
  const lines = [[meta.shopName], [`Generated ${new Date().toLocaleString("en-IN")}`], []];
  for (const cb of books) {
    lines.push([blockTitle(cb, meta), "", "", "", "", "", closingLabel(meta), cb.closing]);
    lines.push(["Credit/Inward", "", "", "", "Debit/Outward"]);
    lines.push(["Date", "Particulars", "Bank", "Amount Rs.", "Date", "Particulars", "Bank", "Amount Rs."]);
    for (const [l, r] of cashBookPairs(cb, meta.scopeLabel)) {
      lines.push([
        l ? formatDMY(l.date, true) : "", l?.particulars ?? "", l?.account ?? "", l ? l.amount : "",
        r ? formatDMY(r.date, true) : "", r?.particulars ?? "", r?.account ?? "", r ? r.amount : "",
      ]);
    }
    lines.push(["", "Total", "", cb.totalIn, "", "Total", "", cb.totalOut]);
    if (meta.showSummary) {
      lines.push([], ["Account", "Opening", "In", "Out", "Closing"]);
      for (const s of cb.summary) lines.push([s.name, s.opening, s.in, s.out, s.closing]);
    }
    lines.push([]);
  }
  const csv = "﻿" + lines.map((row) => row.map(csvCell).join(",")).join("\r\n");
  saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${meta.fileBase}.csv`);
}

// ---------- Cash book: Excel ----------

const XL_MONEY_INT = '[>=10000000]"₹"##\\,##\\,##\\,##0;[>=100000]"₹"##\\,##\\,##0;"₹"##,##0';
const XL_MONEY_DEC = '[>=10000000]"₹"##\\,##\\,##\\,##0.00;[>=100000]"₹"##\\,##\\,##0.00;"₹"##,##0.00';

function xlMoney(cell, v) {
  cell.value = Number(v) || 0;
  cell.numFmt = Number.isInteger(cell.value) ? XL_MONEY_INT : XL_MONEY_DEC;
  cell.alignment = { horizontal: "right" };
}

function xlFill(cell, argb) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function xlBorder(cell) {
  const side = { style: "thin", color: { argb: "FFFFFFFF" } };
  cell.border = { top: side, left: side, bottom: side, right: side };
}

function styleRow(ws, rowNo, fromCol, toCol, argb, bold) {
  for (let c = fromCol; c <= toCol; c++) {
    const cell = ws.getCell(rowNo, c);
    xlFill(cell, argb);
    xlBorder(cell);
    if (bold) cell.font = { ...(cell.font || {}), bold: true };
  }
}

function writeCashBookBlock(ws, start, cb, meta) {
  let r = start;
  ws.mergeCells(r, 1, r, 7);
  const title = ws.getCell(r, 1);
  title.value = meta.shopName;
  title.font = { bold: true, italic: true, underline: true, size: 14, color: { argb: XL_TITLE } };
  title.alignment = { horizontal: "center" };
  styleRow(ws, r, 1, 7, XL_HEAD);
  const lbl = ws.getCell(r, 8);
  lbl.value = closingLabel(meta);
  lbl.font = { bold: true };
  styleRow(ws, r, 8, 8, XL_HEAD);
  r++;

  ws.mergeCells(r, 1, r, 7);
  ws.getCell(r, 1).value = blockTitle(cb, meta);
  ws.getCell(r, 1).font = { bold: true, size: 13 };
  ws.getCell(r, 1).alignment = { horizontal: "center" };
  styleRow(ws, r, 1, 7, XL_HEAD);
  xlMoney(ws.getCell(r, 8), cb.closing);
  styleRow(ws, r, 8, 8, XL_BODY, true);
  r++;

  ws.mergeCells(r, 1, r, 4);
  ws.mergeCells(r, 5, r, 8);
  ws.getCell(r, 1).value = "Credit/Inward";
  ws.getCell(r, 5).value = "Debit/Outward";
  ws.getCell(r, 1).alignment = ws.getCell(r, 5).alignment = { horizontal: "center" };
  styleRow(ws, r, 1, 8, XL_HEAD, true);
  r++;

  ["Date", "Particulars", "Bank", "Amount Rs.", "Date", "Particulars", "Bank", "Amount Rs."].forEach((h, i) => {
    ws.getCell(r, i + 1).value = h;
  });
  styleRow(ws, r, 1, 8, XL_HEAD, true);
  r++;

  for (const [l, rt] of cashBookPairs(cb, meta.scopeLabel)) {
    const sides = [
      [l, 1],
      [rt, 5],
    ];
    for (const [e, c] of sides) {
      if (!e) continue;
      ws.getCell(r, c).value = formatDMY(e.date, true);
      ws.getCell(r, c + 1).value = e.particulars;
      ws.getCell(r, c + 2).value = e.account;
      xlMoney(ws.getCell(r, c + 3), e.amount);
    }
    styleRow(ws, r, 1, 8, XL_BODY);
    r++;
  }

  ws.getCell(r, 2).value = "Total";
  ws.getCell(r, 6).value = "Total";
  ws.getCell(r, 2).alignment = ws.getCell(r, 6).alignment = { horizontal: "center" };
  xlMoney(ws.getCell(r, 4), cb.totalIn);
  xlMoney(ws.getCell(r, 8), cb.totalOut);
  styleRow(ws, r, 1, 8, XL_HEAD, true);
  r++;

  if (meta.showSummary) {
    r++;
    ["Account", "Opening", "In", "Out", "Closing"].forEach((h, i) => (ws.getCell(r, i + 2).value = h));
    styleRow(ws, r, 2, 6, XL_HEAD, true);
    r++;
    for (const s of cb.summary) {
      ws.getCell(r, 2).value = s.name;
      [s.opening, s.in, s.out, s.closing].forEach((v, i) => xlMoney(ws.getCell(r, i + 3), v));
      styleRow(ws, r, 2, 6, XL_BODY);
      r++;
    }
  }
  return r + 2;
}

export async function exportCashBookXlsx(books, meta) {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  wb.creator = meta.shopName;
  const ws = wb.addWorksheet("Cash Book", { views: [{ state: "frozen", ySplit: 0 }] });
  ws.columns = [10, 34, 18, 16, 10, 34, 18, 18].map((width) => ({ width }));
  let row = 1;
  for (const cb of books) row = writeCashBookBlock(ws, row, cb, meta);
  const buf = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${meta.fileBase}.xlsx`);
}

// ---------- Cash book: PDF ----------

const PDF_CB_WIDTHS = [18, 64, 30, 22.5, 18, 64, 30, 22.5]; // 269mm = A4 landscape − margins

function pdfHeader(doc, meta, closingText) {
  drawText(doc, meta.shopName, 14, 16, { fontSize: 16, bold: true });
  drawText(doc, meta.subtitle, 14, 23, { fontSize: 11 });
  drawText(doc, `Generated: ${new Date().toLocaleString("en-IN")}`, 14, 29, { fontSize: 8 });
  if (closingText) {
    const w = doc.internal.pageSize.getWidth();
    doc.setFillColor(...PDF_HEAD);
    doc.rect(w - 74, 9, 60, 9, "F");
    doc.setFillColor(...PDF_BODY);
    doc.rect(w - 74, 18, 60, 10, "F");
    drawText(doc, closingText.label, w - 71, 15.5, { fontSize: 9, bold: true });
    drawText(doc, closingText.value, w - 71, 25, { fontSize: 12, bold: true });
  }
}

export async function exportCashBookPdf(books, meta) {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF({ orientation: "landscape" });
  const last = books[books.length - 1];
  pdfHeader(doc, { ...meta, subtitle: `Cash Book — ${meta.periodLabel} — ${meta.scopeLabel}` }, {
    label: closingLabel(meta),
    value: `₹${fmtAmount(last?.closing ?? 0)}`,
  });

  const hooks = canvasTextHooks(PDF_CB_WIDTHS);
  for (const i of [3, 7]) hooks.columnStyles[i].halign = "right";
  const summaryHooks = canvasTextHooks([48, 28, 28, 28, 28]);
  for (const i of [1, 2, 3, 4]) summaryHooks.columnStyles[i].halign = "right";
  let y = 36;
  for (const cb of books) {
    if (books.length > 1) {
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 16;
      }
      drawText(doc, `${formatDMY(cb.from)} — closing ₹${fmtAmount(cb.closing)}`, 14, y, { fontSize: 10, bold: true });
      y += 3;
    }
    const body = cashBookPairs(cb, meta.scopeLabel).map(([l, r]) => [
      l ? formatDMY(l.date, true) : "", l?.particulars ?? "", l?.account ?? "", l ? fmtAmount(l.amount) : "",
      r ? formatDMY(r.date, true) : "", r?.particulars ?? "", r?.account ?? "", r ? fmtAmount(r.amount) : "",
    ]);
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [
        [
          { content: "Credit/Inward", colSpan: 4, styles: { halign: "center" } },
          { content: "Debit/Outward", colSpan: 4, styles: { halign: "center" } },
        ],
        ["Date", "Particulars", "Bank", "Amount (₹)", "Date", "Particulars", "Bank", "Amount (₹)"],
      ],
      body,
      foot: [["", "Total", "", fmtAmount(cb.totalIn), "", "Total", "", fmtAmount(cb.totalOut)]],
      showFoot: "lastPage",
      styles: { fontSize: 8, textColor: PDF_TEXT, lineColor: [255, 255, 255], lineWidth: 0.3 },
      headStyles: { fillColor: PDF_HEAD, textColor: PDF_TEXT, fontStyle: "bold" },
      bodyStyles: { fillColor: PDF_BODY },
      footStyles: { fillColor: PDF_HEAD, textColor: PDF_TEXT, fontStyle: "bold" },
      ...hooks,
    });
    y = doc.lastAutoTable.finalY + 8;

    if (meta.showSummary && books.length === 1) {
      autoTable(doc, {
        startY: y,
        theme: "grid",
        tableWidth: 160,
        head: [["Account", "Opening (₹)", "In (₹)", "Out (₹)", "Closing (₹)"]],
        body: cb.summary.map((s) => [s.name, fmtAmount(s.opening), fmtAmount(s.in), fmtAmount(s.out), fmtAmount(s.closing)]),
        styles: { fontSize: 8, textColor: PDF_TEXT, lineColor: [255, 255, 255], lineWidth: 0.3 },
        headStyles: { fillColor: PDF_HEAD, textColor: PDF_TEXT },
        bodyStyles: { fillColor: PDF_BODY },
        ...summaryHooks,
      });
      y = doc.lastAutoTable.finalY + 8;
    }
  }
  saveBlob(doc.output("blob"), `${meta.fileBase}.pdf`);
}

// ---------- Account ledger ----------

function ledgerRows(ledger) {
  return [
    { date: ledger.from > "0000-01-01" ? ledger.from : "", particulars: "OPENING BALANCE", in: "", out: "", balance: ledger.opening },
    ...ledger.rows,
  ];
}

export function exportLedgerCsv(ledger, meta) {
  const lines = [[meta.shopName], [`${meta.accountLabel} — Ledger — ${meta.periodLabel}`], [], ["Date", "Particulars", "In", "Out", "Balance"]];
  for (const r of ledgerRows(ledger)) lines.push([formatDMY(r.date), r.particulars, r.in || "", r.out || "", r.balance]);
  lines.push(["", "Total", ledger.totalIn, ledger.totalOut, ledger.closing]);
  const csv = "﻿" + lines.map((row) => row.map(csvCell).join(",")).join("\r\n");
  saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${meta.fileBase}.csv`);
}

export async function exportLedgerXlsx(ledger, meta) {
  const ExcelJS = await loadExcel();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ledger");
  ws.columns = [12, 40, 16, 16, 18].map((width) => ({ width }));
  ws.mergeCells(1, 1, 1, 5);
  ws.getCell(1, 1).value = meta.shopName;
  ws.getCell(1, 1).font = { bold: true, italic: true, underline: true, size: 14, color: { argb: XL_TITLE } };
  ws.getCell(1, 1).alignment = { horizontal: "center" };
  styleRow(ws, 1, 1, 5, XL_HEAD);
  ws.mergeCells(2, 1, 2, 5);
  ws.getCell(2, 1).value = `${meta.accountLabel} — Ledger — ${meta.periodLabel}`;
  ws.getCell(2, 1).alignment = { horizontal: "center" };
  styleRow(ws, 2, 1, 5, XL_HEAD, true);
  ["Date", "Particulars", "In", "Out", "Balance"].forEach((h, i) => (ws.getCell(3, i + 1).value = h));
  styleRow(ws, 3, 1, 5, XL_HEAD, true);
  let r = 4;
  for (const row of ledgerRows(ledger)) {
    ws.getCell(r, 1).value = formatDMY(row.date);
    ws.getCell(r, 2).value = row.particulars;
    if (row.in) xlMoney(ws.getCell(r, 3), row.in);
    if (row.out) xlMoney(ws.getCell(r, 4), row.out);
    xlMoney(ws.getCell(r, 5), row.balance);
    styleRow(ws, r, 1, 5, XL_BODY);
    r++;
  }
  ws.getCell(r, 2).value = "Total / Closing";
  xlMoney(ws.getCell(r, 3), ledger.totalIn);
  xlMoney(ws.getCell(r, 4), ledger.totalOut);
  xlMoney(ws.getCell(r, 5), ledger.closing);
  styleRow(ws, r, 1, 5, XL_HEAD, true);
  const buf = await wb.xlsx.writeBuffer();
  saveBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${meta.fileBase}.xlsx`);
}

export async function exportLedgerPdf(ledger, meta) {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF();
  pdfHeader(doc, { ...meta, subtitle: `${meta.accountLabel} — Ledger — ${meta.periodLabel}` }, {
    label: "Closing Balance",
    value: `₹${fmtAmount(ledger.closing)}`,
  });
  const hooks = canvasTextHooks([22, 70, 30, 30, 30]);
  for (const i of [2, 3, 4]) hooks.columnStyles[i].halign = "right";
  autoTable(doc, {
    startY: 36,
    theme: "grid",
    head: [["Date", "Particulars", "In (₹)", "Out (₹)", "Balance (₹)"]],
    body: ledgerRows(ledger).map((r) => [formatDMY(r.date), r.particulars, r.in ? fmtAmount(r.in) : "", r.out ? fmtAmount(r.out) : "", fmtAmount(r.balance)]),
    foot: [["", "Total / Closing", fmtAmount(ledger.totalIn), fmtAmount(ledger.totalOut), fmtAmount(ledger.closing)]],
    showFoot: "lastPage",
    styles: { fontSize: 8, textColor: PDF_TEXT, lineColor: [255, 255, 255], lineWidth: 0.3 },
    headStyles: { fillColor: PDF_HEAD, textColor: PDF_TEXT },
    bodyStyles: { fillColor: PDF_BODY },
    footStyles: { fillColor: PDF_HEAD, textColor: PDF_TEXT },
    ...hooks,
  });
  saveBlob(doc.output("blob"), `${meta.fileBase}.pdf`);
}

// ---------- Party statements (unchanged layout) ----------

function partyRows(party, txns) {
  const partyTxns = txns.filter((t) => t.partyId === party.id).sort(compareTxns);
  let running = Number(party.openingBalance) || 0;
  const rows = [];
  if (party.openingBalance) rows.push(["-", party.name, "Opening Balance", "", "", fmtAmount(running)]);
  for (const t of partyTxns) {
    running = Math.round((running + signedAmount(t)) * 100) / 100;
    rows.push([formatDMY(t.date), party.name, t.remark || "", t.type === "in" ? fmtAmount(t.amount) : "", t.type === "out" ? fmtAmount(t.amount) : "", fmtAmount(running)]);
  }
  return rows;
}

export async function exportPartyStatementPdf({ party, parties, txns, shopName }) {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF();
  pdfHeader(doc, { shopName, subtitle: party ? `Ledger — ${party.name}` : "Full Daybook Ledger" });
  autoTable(doc, {
    startY: 36,
    head: [["Date", "Party", "Remark", "You got (₹)", "You gave (₹)", "Balance (₹)"]],
    body: party ? partyRows(party, txns) : parties.flatMap((p) => partyRows(p, txns)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [10, 125, 66] },
    ...canvasTextHooks([20, 36, 60, 22, 22, 22]),
  });
  saveBlob(doc.output("blob"), party ? `ledger-${fileSafe(party.name)}.pdf` : "ledger-full.pdf");
}

export { fileSafe };
