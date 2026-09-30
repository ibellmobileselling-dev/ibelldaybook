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
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { partiesCol, partyData } from "./parties";
import { todayLocal, compareTxns } from "../utils/ledger";

const txnCol = collection(db, "transactions");

export function listenTransactionsForParty(userId, partyId, callback) {
  const q = query(
    txnCol,
    where("userId", "==", userId),
    where("partyId", "==", partyId)
  );
  return onSnapshot(q, (snap) => {
    const txns = snap.docs.map(toTxn);
    txns.sort(compareTxns);
    callback(txns);
  });
}

export function listenAllTransactions(userId, callback) {
  const q = query(txnCol, where("userId", "==", userId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(toTxn));
  });
}

// "estimate" gives unsynced writes a local createdAt instead of null.
function toTxn(d) {
  return { id: d.id, ...d.data({ serverTimestamps: "estimate" }) };
}

function txnData(userId, { partyId, type, amount, remark, date, fromOcr }) {
  return {
    userId,
    partyId,
    type,
    amount: Number(amount),
    remark: remark || "",
    date: date || todayLocal(),
    fromOcr: !!fromOcr,
    createdAt: serverTimestamp(),
  };
}

export function addTransaction(userId, txn) {
  return addDoc(txnCol, txnData(userId, txn));
}

// Creates a party and its first transaction atomically. The party id is
// generated client-side so callers can navigate without waiting for the server.
export function addTransactionWithNewParty(userId, party, txn) {
  const partyRef = doc(partiesCol);
  const batch = writeBatch(db);
  batch.set(partyRef, partyData(userId, party));
  batch.set(doc(txnCol), txnData(userId, { ...txn, partyId: partyRef.id }));
  return { partyId: partyRef.id, committed: batch.commit() };
}

// Saves a whole day's entries at once. Each row has either a partyId or a
// newPartyName; rows sharing a new name get one new party. Firestore caps a
// batch at 500 writes, so large days are split into several batches.
export function addDayEntries(userId, date, rows) {
  const newPartyIds = new Map();
  const writes = [];
  for (const row of rows) {
    let partyId = row.partyId;
    if (!partyId) {
      const key = row.newPartyName.trim().toLowerCase();
      partyId = newPartyIds.get(key);
      if (!partyId) {
        const ref = doc(partiesCol);
        partyId = ref.id;
        newPartyIds.set(key, partyId);
        writes.push([ref, partyData(userId, { name: row.newPartyName, phone: "", openingBalance: 0 })]);
      }
    }
    writes.push([doc(txnCol), txnData(userId, { ...row, partyId, date })]);
  }

  const commits = [];
  for (let i = 0; i < writes.length; i += 450) {
    const batch = writeBatch(db);
    for (const [ref, data] of writes.slice(i, i + 450)) batch.set(ref, data);
    commits.push(batch.commit());
  }
  return Promise.all(commits);
}

export function updateTransaction(txnId, data) {
  return updateDoc(doc(db, "transactions", txnId), data);
}

export function deleteTransaction(txnId) {
  return deleteDoc(doc(db, "transactions", txnId));
}
