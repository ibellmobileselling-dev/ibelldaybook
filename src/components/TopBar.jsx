import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "./Icons";

export default function TopBar({ title, subtitle, onBack, right }) {
  const navigate = useNavigate();
  return (
    <header className="top-bar">
      {onBack !== undefined && (
        <button className="icon-btn" onClick={() => (onBack ? onBack() : navigate(-1))} aria-label="Back">
          <ArrowLeftIcon />
        </button>
      )}
      <div className="top-bar-text">
        {subtitle && <div className="top-bar-subtitle">{subtitle}</div>}
        <h1 className="top-bar-title">{title}</h1>
      </div>
      <div className="top-bar-right">{right}</div>
    </header>
  );
}
