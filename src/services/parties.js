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

export const partiesCol = collection(db, "parties");

export function listenParties(userId, callback) {
  const q = query(partiesCol, where("userId", "==", userId));
  return onSnapshot(q, (snap) => {
    const parties = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(parties);
  });
}

export function partyData(userId, { name, phone, openingBalance }) {
  return {
    userId,
    name: name.trim(),
    phone: phone || "",
    openingBalance: Number(openingBalance) || 0,
    createdAt: serverTimestamp(),
  };
}

export function addParty(userId, party) {
  return addDoc(partiesCol, partyData(userId, party));
}

export function updateParty(partyId, data) {
  return updateDoc(doc(db, "parties", partyId), data);
}

export function deleteParty(partyId) {
  return deleteDoc(doc(db, "parties", partyId));
}
