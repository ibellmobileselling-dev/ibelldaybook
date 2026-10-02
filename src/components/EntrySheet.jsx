import { useState } from "react";
import Sheet from "./Sheet";
import SegmentedControl from "./SegmentedControl";
import PartyPicker from "./PartyPicker";
import AccountSelect from "./AccountSelect";
import { ArrowDownLeftIcon, ArrowUpRightIcon, TransferIcon } from "./Icons";
import { addDayEntries, addTransfer } from "../services/transactions";
import { todayLocal, reportWriteError } from "../utils/ledger";
import { shake } from "../design/motion";

const TYPE_OPTIONS = [
  { value: "in", label: "In", icon: <ArrowDownLeftIcon width={16} height={16} />, pillBg: "var(--color-status-success)", pillFg: "var(--color-on-primary)" },
  { value: "out", label: "Out", icon: <ArrowUpRightIcon width={16} height={16} />, pillBg: "var(--color-status-urgent)", pillFg: "var(--color-on-status-urgent)" },
  { value: "transfer", label: "Transfer", icon: <TransferIcon width={16} height={16} /> },
];

// One sheet for every kind of entry:
//   In / Out  — with a party, a new party, or just particulars; and an account
//   Transfer  — between two of the user's own accounts
// fixedParty locks the party (party ledger); fixedAccountId preselects an account.
export default function EntrySheet({ userId, parties, accounts, fixedParty, fixedAccountId, initialType = "in", onClose }) {
  const cashId = accounts[0]?.id;
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [date, setDate] = useState(todayLocal);
  const [accountId, setAccountId] = useState(fixedAccountId || cashId);
  const [toAccountId, setToAccountId] = useState(() => accounts.find((a) => a.id !== (fixedAccountId || cashId))?.id || "");
  const [party, setParty] = useState({ partyId: null, name: "", noParty: true });
  const [error, setError] = useState("");

  // Transfers need two accounts and never belong to a party.
  const options = fixedParty || accounts.length < 2 ? TYPE_OPTIONS.slice(0, 2) : TYPE_OPTIONS;
  const isTransfer = type === "transfer";
  const title = fixedParty
    ? type === "in"
      ? `You got from ${fixedParty.name}`
      : `You gave to ${fixedParty.name}`
    : isTransfer
      ? "Transfer between accounts"
      : type === "in"
        ? "Money in"
        : "Money out";

  function fail(msg, form) {
    setError(msg);
    shake(form);
  }

  function handleSubmit(e, close) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!(Number(amount) > 0)) return fail("Enter an amount greater than 0.", form);

    if (isTransfer) {
      if (!toAccountId || toAccountId === accountId) return fail("Choose two different accounts.", form);
      addTransfer(userId, { fromAccountId: accountId, toAccountId, amount, remark, date }).catch(reportWriteError);
      return close();
    }

    const row = { type, amount, remark, accountId };
    if (fixedParty) row.partyId = fixedParty.id;
    else if (party.partyId) row.partyId = party.partyId;
    else if (!party.name.trim()) return fail("Enter a party or particulars (e.g. SAFE, Tea).", form);
    else if (party.noParty) row.particulars = party.name.trim();
    else row.newPartyName = party.name.trim();

    addDayEntries(userId, date, [row]).catch(reportWriteError);
    close();
  }

  return (
    <Sheet title={title} onClose={onClose}>
      {(close) => (
        <form className="form" onSubmit={(e) => handleSubmit(e, close)} noValidate>
          <SegmentedControl ariaLabel="Entry type" options={options} value={type} onChange={(t) => { setType(t); setError(""); }} />

          <div className="amount-field">
            <span aria-hidden="true">₹</span>
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              placeholder="0"
              aria-label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {isTransfer ? (
            <div className="field-row">
              <AccountSelect label="From" accounts={accounts} value={accountId} onChange={setAccountId} />
              <AccountSelect label="To" accounts={accounts} value={toAccountId} onChange={setToAccountId} exclude={accountId} />
            </div>
          ) : (
            <>
              {!fixedParty && (
                <div className="field">
                  <span>Party or particulars</span>
                  <PartyPicker
                    parties={parties}
                    value={party}
                    onChange={setParty}
                    allowNoParty
                    placeholder="e.g. Kapil Bhai, SAFE, Tea"
                  />
                  {party.name.trim() && !party.partyId && (
                    <SegmentedControl
                      className="segmented-sm"
                      ariaLabel="Save as"
                      value={party.noParty ? "none" : "new"}
                      onChange={(v) => setParty((p) => ({ ...p, noParty: v === "none" }))}
                      options={[
                        { value: "none", label: "No party" },
                        { value: "new", label: "Create party" },
                      ]}
                    />
                  )}
                </div>
              )}
              <AccountSelect label={type === "in" ? "Received in" : "Paid from"} accounts={accounts} value={accountId} onChange={setAccountId} />
            </>
          )}

          <label className="field">
            <span>Remark (optional)</span>
            <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="e.g. mobile repair" />
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value || todayLocal())} />
          </label>

          {error && <div className="error-text" role="alert">{error}</div>}

          <div className="btn-row">
            <button type="button" className="btn btn-outline press" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary press">
              Save
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
