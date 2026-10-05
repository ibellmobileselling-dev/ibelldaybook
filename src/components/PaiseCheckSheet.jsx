import { useState } from "react";
import Sheet from "./Sheet";
import { updateTransaction } from "../services/transactions";
import { updateParty } from "../services/parties";
import { accountName, saveAccount } from "../services/accounts";
import { hasPaise, rupees, formatDay, reportWriteError } from "../utils/ledger";
import { particularsOf } from "../utils/cashbook";

// Every amount with paise (usually a typing slip like 4999.9 for 5000):
// entries, account opening balances and party opening balances.
export function findPaiseItems({ txns, accounts, parties }) {
  const partiesById = Object.fromEntries(parties.map((p) => [p.id, p]));
  return [
    ...accounts
      .filter((a) => !a.virtual && hasPaise(a.openingBalance))
      .map((a) => ({ key: `a-${a.id}`, kind: "account", ref: a, title: `${accountName(a)} — opening balance`, sub: "Account", amount: a.openingBalance })),
    ...parties
      .filter((p) => hasPaise(p.openingBalance))
      .map((p) => ({ key: `p-${p.id}`, kind: "party", ref: p, title: `${p.name} — opening balance`, sub: "Party", amount: p.openingBalance })),
    ...txns
      .filter((t) => hasPaise(t.amount))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map((t) => ({
        key: `t-${t.id}`,
        kind: "txn",
        ref: t,
        title: t.type === "transfer" ? "Transfer" : particularsOf(t, partiesById),
        sub: `${formatDay(t.date)} · ${t.type === "in" ? "In" : t.type === "out" ? "Out" : "Transfer"}`,
        amount: t.amount,
      })),
  ];
}

function Row({ item, userId }) {
  const [value, setValue] = useState(String(Math.round(item.amount)));
  const [saved, setSaved] = useState(false);
  const n = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(n) && (item.kind !== "txn" || n > 0);

  function save() {
    if (!valid) return;
    let write;
    if (item.kind === "txn") write = updateTransaction(item.ref.id, { amount: n });
    else if (item.kind === "party") write = updateParty(item.ref.id, { openingBalance: n });
    else {
      const a = item.ref;
      write = saveAccount(userId, a, a.kind === "cash" ? { openingBalance: n } : { bankName: a.bankName, name: a.name, accountNo: a.accountNo, openingBalance: n });
    }
    write.catch(reportWriteError);
    setSaved(true);
  }

  return (
    <div className={`paise-row ${saved ? "saved" : ""}`}>
      <div className="paise-info">
        <strong>{item.title}</strong>
        <small>
          {item.sub} · now {item.amount < 0 ? "−" : ""}
          {rupees(item.amount)}
        </small>
      </div>
      {saved ? (
        <span className="paise-done">Fixed</span>
      ) : (
        <div className="paise-fix">
          <input
            type="number"
            inputMode="decimal"
            aria-label={`Correct amount for ${item.title}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="button" className="btn btn-primary btn-sm press" disabled={!valid} onClick={save}>
            Save
          </button>
        </div>
      )}
    </div>
  );
}

export default function PaiseCheckSheet({ items, userId, onClose }) {
  return (
    <Sheet title="Amounts with paise" onClose={onClose}>
      {(close) => (
        <div className="form">
          <p className="field-hint">
            These amounts have paise, which is usually a typing slip (e.g. 4999.9 instead of 5000). Check each one, correct it if needed, and tap
            Save. Leave it as it is if the paise are real.
          </p>
          <div className="paise-list">
            {items.map((it) => (
              <Row key={it.key} item={it} userId={userId} />
            ))}
          </div>
          <button type="button" className="btn btn-outline press" onClick={close}>
            Done
          </button>
        </div>
      )}
    </Sheet>
  );
}
