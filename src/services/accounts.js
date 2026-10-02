import {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

const accountsCol = collection(db, "accounts");

// Every user has one Cash account with a fixed id. Entries saved before
// accounts existed have no accountId and belong to it.
export function cashAccountId(userId) {
  return `${userId}_cash`;
}

function virtualCash(userId) {
  return { id: cashAccountId(userId), userId, kind: "cash", name: "Cash", bankName: "", accountNo: "", openingBalance: 0, virtual: true };
}

// Calls back with the Cash account first, then banks by name. Cash is
// synthesized until its opening balance is first saved, so a cached/offline
// snapshot can never overwrite it.
export function listenAccounts(userId, callback) {
  const q = query(accountsCol, where("userId", "==", userId));
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const cash = docs.find((a) => a.id === cashAccountId(userId)) || virtualCash(userId);
    const banks = docs
      .filter((a) => a.id !== cash.id)
      .sort((a, b) => accountName(a).localeCompare(accountName(b)));
    callback([cash, ...banks]);
  });
}

export function accountName(a) {
  if (!a) return "Cash";
  return (a.name || a.bankName || "Account").trim();
}

export function accountLabel(a) {
  if (!a) return "Cash";
  const name = accountName(a);
  return a.accountNo ? `${name} ••${a.accountNo}` : name;
}

function accountData({ kind, name, bankName, accountNo, openingBalance }) {
  return {
    kind,
    name: (name || "").trim(),
    bankName: (bankName || "").trim(),
    accountNo: (accountNo || "").replace(/\D/g, "").slice(-4),
    openingBalance: Number(openingBalance) || 0,
  };
}

export function addBankAccount(userId, account) {
  return addDoc(accountsCol, { userId, ...accountData({ ...account, kind: "bank" }), createdAt: serverTimestamp() });
}

export function saveAccount(userId, account, changes) {
  if (account.kind === "cash") {
    // Full write with a fixed id: creates the Cash doc the first time.
    return setDoc(doc(db, "accounts", cashAccountId(userId)), {
      userId,
      ...accountData({ ...changes, kind: "cash", name: "Cash" }),
      updatedAt: serverTimestamp(),
    });
  }
  return updateDoc(doc(db, "accounts", account.id), { ...accountData({ ...changes, kind: "bank" }), updatedAt: serverTimestamp() });
}

export function deleteAccount(accountId) {
  return deleteDoc(doc(db, "accounts", accountId));
}

// Common Indian banks for the "Add bank" picker; "Other" allows any name.
export const INDIAN_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "Canara Bank",
  "Union Bank of India",
  "Bank of India",
  "Indian Bank",
  "Central Bank of India",
  "Indian Overseas Bank",
  "UCO Bank",
  "Bank of Maharashtra",
  "Punjab & Sind Bank",
  "IDBI Bank",
  "IndusInd Bank",
  "Yes Bank",
  "IDFC FIRST Bank",
  "Federal Bank",
  "RBL Bank",
  "Bandhan Bank",
  "AU Small Finance Bank",
  "Equitas Small Finance Bank",
  "Ujjivan Small Finance Bank",
  "South Indian Bank",
  "Karnataka Bank",
  "Karur Vysya Bank",
  "City Union Bank",
  "DCB Bank",
  "CSB Bank",
  "Tamilnad Mercantile Bank",
  "Dhanlaxmi Bank",
  "Jammu & Kashmir Bank",
  "Saraswat Co-operative Bank",
  "Cosmos Co-operative Bank",
  "The Kalupur Commercial Co-operative Bank",
  "Ahmedabad Mercantile Co-operative Bank",
  "Rajkot Nagarik Sahakari Bank",
  "Surat People's Co-operative Bank",
  "Gujarat State Co-operative Bank",
  "Nutan Nagarik Sahakari Bank",
  "Mehsana Urban Co-operative Bank",
  "India Post Payments Bank",
  "Airtel Payments Bank",
  "Paytm Payments Bank",
  "Fino Payments Bank",
];
