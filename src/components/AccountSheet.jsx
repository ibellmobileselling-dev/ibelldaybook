import { useState } from "react";
import Sheet from "./Sheet";
import { INDIAN_BANKS, addBankAccount, saveAccount, deleteAccount } from "../services/accounts";
import { reportWriteError } from "../utils/ledger";
import { shake } from "../design/motion";

const OTHER = "__other";

// Add a bank account, or edit one (banks: details + opening balance; Cash:
// opening balance only). hasEntries blocks deleting a bank that is in use.
export default function AccountSheet({ userId, account, hasEntries, onClose, onDeleted }) {
  const isCash = account?.kind === "cash";
  const knownBank = !account || INDIAN_BANKS.includes(account.bankName);
  const [bank, setBank] = useState(account ? (knownBank ? account.bankName : OTHER) : INDIAN_BANKS[0]);
  const [otherBank, setOtherBank] = useState(account && !knownBank ? account.bankName : "");
  const [name, setName] = useState(account?.name && account.name !== account.bankName ? account.name : "");
  const [accountNo, setAccountNo] = useState(account?.accountNo || "");
  const [opening, setOpening] = useState(account ? String(account.openingBalance ?? 0) : "0");
  const [error, setError] = useState("");

  function handleSubmit(e, close) {
    e.preventDefault();
    const bankName = bank === OTHER ? otherBank.trim() : bank;
    if (!isCash && !bankName) {
      setError("Enter the bank name.");
      shake(e.currentTarget);
      return;
    }
    const data = { bankName, name: name.trim() || bankName, accountNo, openingBalance: opening };
    const write = account ? saveAccount(userId, account, isCash ? { openingBalance: opening } : data) : addBankAccount(userId, data);
    write.catch(reportWriteError);
    close();
  }

  function handleDelete(close) {
    if (hasEntries) {
      alert("This account has entries, so it can't be deleted. Move or delete its entries first.");
      return;
    }
    if (!confirm(`Delete ${account.name}? This cannot be undone.`)) return;
    deleteAccount(account.id).catch(reportWriteError);
    close();
    onDeleted?.();
  }

  return (
    <Sheet title={account ? (isCash ? "Cash in hand" : `Edit ${account.name}`) : "Add bank account"} onClose={onClose}>
      {(close) => (
        <form className="form" onSubmit={(e) => handleSubmit(e, close)} noValidate>
          {!isCash && (
            <>
              <label className="field">
                <span>Bank</span>
                <select value={bank} onChange={(e) => setBank(e.target.value)}>
                  {INDIAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value={OTHER}>Other bank…</option>
                </select>
              </label>
              {bank === OTHER && (
                <label className="field">
                  <span>Bank name</span>
                  <input autoFocus value={otherBank} onChange={(e) => setOtherBank(e.target.value)} placeholder="e.g. Varachha Co-op Bank" />
                </label>
              )}
              <div className="field-row">
                <label className="field">
                  <span>Short name (optional)</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Current" />
                </label>
                <label className="field narrow">
                  <span>A/c last 4</span>
                  <input inputMode="numeric" maxLength={4} value={accountNo} onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, ""))} placeholder="1234" />
                </label>
              </div>
            </>
          )}
          <label className="field">
            <span>Opening balance</span>
            <div className="amount-field">
              <span aria-hidden="true">₹</span>
              <input type="number" inputMode="decimal" aria-label="Opening balance" value={opening} onChange={(e) => setOpening(e.target.value)} />
            </div>
            <small className="field-hint">
              {isCash ? "Cash in hand before your first entry." : "Balance in this account before your first entry here."}
            </small>
          </label>

          {error && <div className="error-text" role="alert">{error}</div>}

          <div className="btn-row">
            <button type="button" className="btn btn-outline press" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary press">
              {account ? "Save" : "Add bank"}
            </button>
          </div>
          {account && !isCash && (
            <button type="button" className="btn btn-text danger press" onClick={() => handleDelete(close)}>
              Delete this account
            </button>
          )}
        </form>
      )}
    </Sheet>
  );
}
