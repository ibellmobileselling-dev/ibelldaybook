import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import TopBar from "../components/TopBar";
import BottomNav from "../components/BottomNav";

export default function Settings() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
  }, [user]);

  return (
    <>
      <TopBar title="Settings" />
      <div className="page">
        <div className="settings-list">
          <div className="settings-card">
            <div className="row"><span className="k">Shop Name</span><span>{profile?.shopName || "—"}</span></div>
            <div className="row"><span className="k">Owner</span><span>{profile?.ownerName || "—"}</span></div>
            <div className="row"><span className="k">Phone</span><span>{profile?.phone || "—"}</span></div>
            <div className="row"><span className="k">Email</span><span>{user?.email}</span></div>
          </div>
          <button className="btn btn-outline btn-block" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
      <BottomNav />
    </>
  );
}
