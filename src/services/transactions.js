import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

const txnCol = collection(db, "transactions");

export function listenTransactionsForParty(userId, partyId, callback) {
  const q = query(
    txnCol,
    where("userId", "==", userId),
    where("partyId", "==", partyId)
  );
  return onSnapshot(q, (snap) => {
    const txns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    txns.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    callback(txns);
  });
}

export function listenAllTransactions(userId, callback) {
  const q = query(txnCol, where("userId", "==", userId));
  return onSnapshot(q, (snap) => {
    const txns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(txns);
  });
}

export function addTransaction(userId, { partyId, type, amount, remark, date, fromOcr }) {
  return addDoc(txnCol, {
    userId,
    partyId,
    type,
    amount: Number(amount),
    remark: remark || "",
    date: date || new Date().toISOString().slice(0, 10),
    fromOcr: !!fromOcr,
    createdAt: serverTimestamp(),
  });
}

export function updateTransaction(txnId, data) {
  return updateDoc(doc(db, "transactions", txnId), data);
}

export function deleteTransaction(txnId) {
  return deleteDoc(doc(db, "transactions", txnId));
}
