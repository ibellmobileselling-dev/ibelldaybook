import { useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BankIcon, BookIcon, CameraIcon, HomeIcon, SettingsIcon } from "./Icons";

// Tab order also decides the direction of the screen-switch animation.
export const TABS = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/scan", label: "Day Entry", icon: CameraIcon },
  { to: "/reports", label: "Cash Book", icon: BookIcon },
  { to: "/accounts", label: "Accounts", icon: BankIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function tabIndex(pathname) {
  return TABS.findIndex((t) => (t.to === "/" ? pathname === "/" : pathname.startsWith(t.to)));
}

// Floating glass capsule with the shared sliding selection pill. Rendered once
// by the app shell so the pill can travel between tabs.
export default function BottomNav() {
  const { pathname } = useLocation();
  const active = tabIndex(pathname);
  const navRef = useRef(null);
  const itemRefs = useRef([]);
  const [pill, setPill] = useState(null);

  useLayoutEffect(() => {
    function measure() {
      const el = itemRefs.current[active];
      setPill(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [active]);

  return (
    <nav ref={navRef} className="bottom-nav capsule glass" aria-label="Main">
      {pill && <span className="segmented-pill nav-pill" style={{ width: pill.w, transform: `translateX(${pill.x}px)` }} aria-hidden="true" />}
      {TABS.map((t, i) => {
        const Icon = t.icon;
        return (
          <NavLink
            key={t.to}
            ref={(el) => (itemRefs.current[i] = el)}
            to={t.to}
            end={t.to === "/"}
            className={({ isActive }) => `nav-item press ${isActive ? "active" : ""}`}
          >
            <span className="nav-icon">
              <Icon width={20} height={20} />
            </span>
            <span>{t.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
