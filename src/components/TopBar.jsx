import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "./Icons";

// Floating top chrome: glass capsule groups for actions; the title is plain
// text beside them (non-interactive items stay off glass).
// `right` should be capsule buttons (className "capsule-btn press").
export default function TopBar({ title, subtitle, onBack, right }) {
  const navigate = useNavigate();
  return (
    <header className="top-bar">
      {onBack !== undefined && (
        <div className="capsule glass">
          <button className="capsule-btn icon-only press" onClick={() => (onBack ? onBack() : navigate(-1))} aria-label="Back">
            <ArrowLeftIcon />
          </button>
        </div>
      )}
      <div className="top-bar-text">
        {subtitle && <div className="top-bar-subtitle">{subtitle}</div>}
        <h1 className="top-bar-title">{title}</h1>
      </div>
      {right && <div className="capsule glass">{right}</div>}
    </header>
  );
}
