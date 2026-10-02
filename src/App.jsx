import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import PartyLedger from "./pages/PartyLedger";
import DayEntry from "./pages/DayEntry";
import CashBook from "./pages/CashBook";
import Accounts from "./pages/Accounts";
import AccountLedger from "./pages/AccountLedger";
import Settings from "./pages/Settings";
import BottomNav, { tabIndex } from "./components/BottomNav";
import ScrollEdge from "./components/ScrollEdge";
import { installPressGlow } from "./design/motion";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-center">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Tabs keep their nav order; detail screens (party, account) sit "deeper".
function rank(pathname) {
  const i = tabIndex(pathname);
  return i >= 0 ? i : 99;
}

// Screens without the floating nav: focused entry and detail screens.
const NO_NAV = ["/scan", "/party/", "/account/", "/login", "/signup"];

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Shared-axis direction: derived from the previous path (state, not a ref).
  const [nav, setNav] = useState({ path: location.pathname, dir: "fwd" });
  if (nav.path !== location.pathname) {
    setNav({ path: location.pathname, dir: rank(location.pathname) < rank(nav.path) ? "back" : "fwd" });
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (loading) return <div className="screen-center">Loading…</div>;
  const showNav = user && !NO_NAV.some((p) => location.pathname.startsWith(p));

  return (
    <>
      <div key={location.pathname} className="route-enter route" data-dir={nav.dir}>
        <Routes location={location}>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/party/:partyId" element={<PrivateRoute><PartyLedger /></PrivateRoute>} />
          <Route path="/scan" element={<PrivateRoute><DayEntry /></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute><CashBook /></PrivateRoute>} />
          <Route path="/accounts" element={<PrivateRoute><Accounts /></PrivateRoute>} />
          <Route path="/account/:accountId" element={<PrivateRoute><AccountLedger /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {user && <ScrollEdge bottom={showNav} />}
      {showNav && <BottomNav />}
    </>
  );
}

installPressGlow();

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
