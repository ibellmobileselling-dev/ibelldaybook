import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import TopBar from "../components/TopBar";

export default function Settings() {
  const { user, logout } = useAuth();
  const { profile } = useData();

  return (
    <>
      <TopBar title="Settings" />
      <main className="page">
        <div className="settings-list">
          <div className="settings-card card">
            <div className="row"><span className="k">Shop name</span><span>{profile?.shopName || "—"}</span></div>
            <div className="row"><span className="k">Owner</span><span>{profile?.ownerName || "—"}</span></div>
            <div className="row"><span className="k">Phone</span><span>{profile?.phone || "—"}</span></div>
            <div className="row"><span className="k">Email</span><span>{user?.email}</span></div>
          </div>
          <button className="btn btn-outline btn-block press" onClick={logout}>
            Logout
          </button>
        </div>
      </main>
    </>
  );
}
