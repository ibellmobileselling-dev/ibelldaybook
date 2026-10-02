import { useLayoutEffect, useRef, useState } from "react";

// Single-select control with the sliding selection pill (DESIGN.md §6.2).
// options: [{ value, label, icon?, pillBg?, pillFg? }]. pillBg/pillFg let an
// option carry meaning (e.g. In = success, Out = urgent); default is primary.
export default function SegmentedControl({ options, value, onChange, ariaLabel, className = "" }) {
  const rootRef = useRef(null);
  const optionRefs = useRef({});
  const [pill, setPill] = useState(null);

  useLayoutEffect(() => {
    function measure() {
      const el = optionRefs.current[value];
      if (!el) return setPill(null);
      setPill({ x: el.offsetLeft, w: el.offsetWidth });
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (rootRef.current) ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, [value, options.length]);

  const active = options.find((o) => o.value === value);

  function handleKeyDown(e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length];
    onChange(next.value);
    optionRefs.current[next.value]?.focus();
  }

  return (
    <div
      ref={rootRef}
      className={`segmented ${className}`}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      style={{
        "--pill-bg": active?.pillBg,
        "--pill-fg": active?.pillFg,
      }}
    >
      {pill && (
        <span className="segmented-pill" style={{ width: pill.w, transform: `translateX(${pill.x}px)` }} aria-hidden="true" />
      )}
      {options.map((o) => (
        <button
          key={o.value}
          ref={(el) => (optionRefs.current[o.value] = el)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className="segmented-option press"
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
