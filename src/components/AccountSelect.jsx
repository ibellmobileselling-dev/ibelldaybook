import { accountLabel } from "../services/accounts";
import { BankIcon, WalletIcon } from "./Icons";

// Native select over the user's accounts (Cash first, then banks). Options
// are plain text; the field shows a Wallet / Bank icon for the selected one.
export default function AccountSelect({ accounts, value, onChange, label, exclude, className = "" }) {
  const options = accounts.filter((a) => a.id !== exclude);
  const selected = options.find((a) => a.id === value) || options[0];
  const Icon = selected?.kind === "bank" ? BankIcon : WalletIcon;

  return (
    <label className={`field account-select ${className}`}>
      {label && <span>{label}</span>}
      <div className="account-select-control">
        <Icon className="account-select-icon" width={18} height={18} aria-hidden="true" />
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label || "Account"}>
          {options.map((a) => (
            <option key={a.id} value={a.id}>
              {a.kind === "cash" ? "Cash" : accountLabel(a)}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
