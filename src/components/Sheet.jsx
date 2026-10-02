import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Bottom sheet (large glass over a scrim). Rendered into <body> so page
// transitions can't offset it. While open, floating glass buttons are hidden
// (no glass on glass). Tap outside or press Esc to close.
export default function Sheet({ title, onClose, children }) {
  const [closing, setClosing] = useState(false);
  const panelRef = useRef(null);

  const close = useCallback(() => setClosing(true), []);

  useEffect(() => {
    document.body.classList.add("sheet-open");
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("sheet-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [close]);

  useEffect(() => {
    if (!closing) return;
    const el = panelRef.current;
    const done = () => onClose();
    // Fall back to a timer in case animations are disabled.
    const t = setTimeout(done, 400);
    el?.addEventListener("animationend", done, { once: true });
    return () => {
      clearTimeout(t);
      el?.removeEventListener("animationend", done);
    };
  }, [closing, onClose]);

  return createPortal(
    <div className={`sheet-backdrop ${closing ? "scrim-out" : "scrim-in"}`} onClick={close}>
      <div
        ref={panelRef}
        className={`sheet glass--large ${closing ? "sheet-out" : "sheet-in"}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        {title && <h2 className="sheet-title">{title}</h2>}
        {typeof children === "function" ? children(close) : children}
      </div>
    </div>,
    document.body
  );
}
