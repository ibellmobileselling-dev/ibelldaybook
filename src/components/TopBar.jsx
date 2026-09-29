import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "./Icons";

export default function TopBar({ title, onBack, right }) {
  const navigate = useNavigate();
  return (
    <header className="top-bar">
      {onBack !== undefined && (
        <button className="icon-btn" onClick={() => (onBack ? onBack() : navigate(-1))}>
          <ArrowLeftIcon />
        </button>
      )}
      <h1 className="top-bar-title">{title}</h1>
      <div className="top-bar-right">{right}</div>
    </header>
  );
}
