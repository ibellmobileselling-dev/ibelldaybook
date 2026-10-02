import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { accountLabel } from "../services/accounts";
import TopBar from "../components/TopBar";
import AccountSheet from "../components/AccountSheet";
import EntrySheet from "../components/EntrySheet";
import SkeletonRows from "../components/Skeleton";
import { BankIcon, PlusIcon, TransferIcon, WalletIcon } from "../components/Icons";
import { accountBalances } from "../utils/cashbook";
import { rupees } from "../utils/ledger";

export default function Accounts() {
  const { user } = useAuth();
  const { parties, txns, accounts, cashId, loaded } = useData();
  const [params, setParams] = useSearchParams();
  const [showTransfer, setShowTransfer] = useState(false);
  const showAdd = params.get("add") === "1";

  const balances = useMemo(() => accountBalances(accounts, txns, cashId), [accounts, txns, cashId]);
  const total = accounts.reduce((s, a) => s + (balances[a.id] || 0), 0);
  const bankTotal = accounts.filter((a) => a.kind === "bank").reduce((s, a) => s + (balances[a.id] || 0), 0);

  const openAdd = () => setParams({ add: "1" }, { replace: true });
  const closeAdd = () => setParams({}, { replace: true });

  return (
    <>
      <TopBar
        title="Accounts"
        subtitle="Cash and banks"
        right={
          accounts.length > 1 && (
            <button className="capsule-btn press" onClick={() => setShowTransfer(true)} aria-label="Transfer between accounts">
              <TransferIcon width={18} height={18} /> Transfer
            </button>
          )
        }
      />
      <main className="page with-fab">
        <section className="hero" aria-label="Total balance">
          <div className="hero-label">Total in all accounts</div>
          <div className={`hero-value ${total < 0 ? "give" : ""}`}>
            {total < 0 ? "−" : ""}
            {rupees(total)}
          </div>
          <div className="hero-tiles">
            <div className="hero-tile">
              <span>Cash in hand</span>
              <strong>{rupees(balances[cashId] || 0)}</strong>
            </div>
            <div className="hero-tile">
              <span>In banks</span>
              <strong>{bankTotal < 0 ? "−" : ""}{rupees(bankTotal)}</strong>
            </div>
          </div>
        </section>

        <div className="section-head">
          <h2>Accounts</h2>
          <span className="count-pill">{accounts.length}</span>
        </div>

        {!loaded.accounts ? (
          <SkeletonRows count={3} />
        ) : (
          <div className="party-list">
            {accounts.map((a, i) => {
              const bal = balances[a.id] || 0;
              return (
                <Link key={a.id} to={`/account/${a.id}`} className="party-card press-content cascade" style={{ "--i": i }}>
                  <span className={`account-icon lg ${a.kind}`} aria-hidden="true">
                    {a.kind === "cash" ? <WalletIcon width={20} height={20} /> : <BankIcon width={20} height={20} />}
                  </span>
                  <div className="party-info">
                    <div className="party-name">{a.kind === "cash" ? "Cash in hand" : accountLabel(a)}</div>
                    <div className="party-date">{a.kind === "cash" ? "Cash" : a.bankName}</div>
                  </div>
                  <div className={`party-balance ${bal < 0 ? "give" : "zero"}`}>
                    {bal < 0 ? "−" : ""}
                    {rupees(bal)}
                    <span className="bal-label">{bal < 0 ? "Overdrawn" : "Balance"}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {loaded.accounts && accounts.length === 1 && (
          <p className="hint-text">Add your bank accounts to record which bank money comes into and goes out of.</p>
        )}
      </main>

      <button className="fab capsule glass glass--tinted press" onClick={openAdd}>
        <PlusIcon width={20} height={20} /> Add bank
      </button>

      {showAdd && <AccountSheet userId={user.uid} onClose={closeAdd} />}
      {showTransfer && (
        <EntrySheet userId={user.uid} parties={parties} accounts={accounts} initialType="transfer" onClose={() => setShowTransfer(false)} />
      )}
    </>
  );
}
