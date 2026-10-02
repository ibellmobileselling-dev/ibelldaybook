// Motion helpers (DESIGN.md §5). Durations and springs live in tokens.css;
// this module only wires behaviour that CSS can't do on its own.

const reducedQuery = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

export function prefersReducedMotion() {
  return !!reducedQuery?.matches;
}

// Pattern A: the press glow starts at the finger/pointer. Sets --px/--py on
// the pressed `.press` element so its ::after radial gradient centres there.
export function installPressGlow() {
  if (typeof document === "undefined") return;
  document.addEventListener(
    "pointerdown",
    (e) => {
      const el = e.target instanceof Element ? e.target.closest(".press") : null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--px", `${e.clientX - r.left}px`);
      el.style.setProperty("--py", `${e.clientY - r.top}px`);
    },
    { passive: true, capture: true }
  );
}

// Pattern G: one decaying shake on an element (no-op under Reduce Motion,
// where the error colour/text carries the signal on its own).
export function shake(el) {
  if (!el || prefersReducedMotion()) return;
  el.classList.remove("shake");
  // force reflow so the animation restarts
  void el.offsetWidth;
  el.classList.add("shake");
  el.addEventListener("animationend", () => el.classList.remove("shake"), { once: true });
}
