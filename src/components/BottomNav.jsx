import { NavLink } from "react-router-dom";
import { CameraIcon, FileTextIcon, HomeIcon, SettingsIcon } from "./Icons";

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <span className="nav-icon"><HomeIcon /></span>
        <span>Dashboard</span>
      </NavLink>
      <NavLink to="/scan" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <span className="nav-icon"><CameraIcon /></span>
        <span>Day Entry</span>
      </NavLink>
      <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <span className="nav-icon"><FileTextIcon /></span>
        <span>Reports</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <span className="nav-icon"><SettingsIcon /></span>
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}
