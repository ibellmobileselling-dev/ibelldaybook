import { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "./AuthContext";
import { listenParties } from "../services/parties";
import { listenAllTransactions } from "../services/transactions";
import { listenAccounts, cashAccountId } from "../services/accounts";

const DataContext = createContext(null);

const EMPTY = { parties: [], txns: [], accounts: [], profile: null, loaded: { parties: false, txns: false, accounts: false } };

// One live subscription per collection for the whole app, shared by every
// screen (switching screens doesn't re-read everything from Firestore).
export function DataProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [data, setData] = useState(EMPTY);

  useEffect(() => {
    if (!uid) return;
    const put = (key) => (value) =>
      setData((d) => ({ ...d, [key]: value, loaded: { ...d.loaded, [key]: true } }));
    const unsubs = [
      listenParties(uid, put("parties")),
      listenAllTransactions(uid, put("txns")),
      listenAccounts(uid, put("accounts")),
      onSnapshot(doc(db, "users", uid), (snap) => setData((d) => ({ ...d, profile: snap.exists() ? snap.data() : {} }))),
    ];
    return () => {
      unsubs.forEach((u) => u());
      setData(EMPTY);
    };
  }, [uid]);

  const value = { ...data, cashId: uid ? cashAccountId(uid) : null, shopName: data.profile?.shopName || "IBELL MOBILE" };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
