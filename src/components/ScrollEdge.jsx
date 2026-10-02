import { useEffect, useState } from "react";

// Soft scroll edges under floating chrome (DESIGN.md §5 H): shown only while
// content actually scrolls under the top bar / above the bottom chrome.
export default function ScrollEdge({ top = true, bottom = true }) {
  const [state, setState] = useState({ top: false, bottom: false });

  useEffect(() => {
    function update() {
      const scrolled = window.scrollY > 4;
      const more = window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 4;
      setState((s) => (s.top === scrolled && s.bottom === more ? s : { top: scrolled, bottom: more }));
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      {top && <div className={`scroll-edge top ${state.top ? "on" : ""}`} aria-hidden="true" />}
      {bottom && <div className={`scroll-edge bottom ${state.bottom ? "on" : ""}`} aria-hidden="true" />}
    </>
  );
}
