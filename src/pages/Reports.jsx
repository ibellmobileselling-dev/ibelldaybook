import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable/es";
import { useAuth } from "../context/AuthContext";
import { listenParties } from "../services/parties";
import { listenAllTransactions } from "../services/transactions";
import TopBar from "../components/TopBar";
import BottomNav from "../components/BottomNav";
import { signedAmount, compareTxns } from "../utils/ledger";
import { drawText, canvasTextHooks } from "../utils/pdfText";

export default function Reports() {
  const { user } = useAuth();
  const [parties, setParties] = useState([]);
  const [txns, setTxns] = useState([]);

  useEffect(() => {
    if (!user) return;
    const unsub1 = listenParties(user.uid, setParties);
    const unsub2 = listenAllTransactions(user.uid, setTxns);
    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  function buildRowsForParty(party) {
    const partyTxns = txns
      .filter((t) => t.partyId === party.id)
      .sort(compareTxns);
    let running = Number(party.openingBalance) || 0;
    const rows = [];
    if (party.openingBalance) {
      rows.push(["-", party.name, "Opening Balance", "", "", running.toFixed(2)]);
    }
    for (const t of partyTxns) {
      running += signedAmount(t);
      rows.push([
        t.date,
        party.name,
        t.remark || "",
        t.type === "in" ? t.amount.toFixed(2) : "",
        t.type === "out" ? t.amount.toFixed(2) : "",
        running.toFixed(2),
      ]);
    }
    return rows;
  }

  function downloadPdf(party) {
    const doc = new jsPDF();
    const title = party ? `Ledger — ${party.name}` : "Full Daybook Ledger";
    drawText(doc, "IBELL MOBILE", 14, 16, { fontSize: 16 });
    drawText(doc, title, 14, 24, { fontSize: 11 });
    drawText(doc, `Generated: ${new Date().toLocaleString("en-IN")}`, 14, 30, { fontSize: 9 });

    const rows = party
      ? buildRowsForParty(party)
      : parties.flatMap((p) => buildRowsForParty(p));

    autoTable(doc, {
      startY: 36,
      head: [["Date", "Party", "Remark", "In (₹)", "Out (₹)", "Balance (₹)"]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [14, 161, 87] },
      // 182mm = A4 width minus the default 14mm margins
      ...canvasTextHooks([20, 36, 60, 22, 22, 22]),
    });

    const filename = party ? `ledger-${party.name.replace(/\s+/g, "_")}.pdf` : "ledger-full.pdf";
    doc.save(filename);
  }

  return (
    <>
      <TopBar title="Reports & Export" />
      <div className="page">
        <div className="report-list">
          <div className="report-card">
            <div>
              <strong>Full Ledger</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>All parties, all transactions</div>
            </div>
            <button className="btn btn-primary" onClick={() => downloadPdf(null)}>
              Download
            </button>
          </div>

          {parties
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => (
              <div key={p.id} className="report-card">
                <div>
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Party statement</div>
                </div>
                <button className="btn btn-outline" onClick={() => downloadPdf(p)}>
                  Download
                </button>
              </div>
            ))}

          {parties.length === 0 && <div className="empty-state">Add parties to generate reports.</div>}
        </div>
      </div>
      <BottomNav />
    </>
  );
}
