// Native-app feel on phones: no page zoom (pinch or double-tap).
// iOS Safari ignores `user-scalable=no` in the viewport tag, so its pinch
// gesture is also cancelled here. Double-tap zoom is off via
// `touch-action: manipulation` in index.css.
export function installNoZoom() {
  if (typeof document === "undefined") return;
  const stop = (e) => e.preventDefault();
  // Safari's proprietary pinch events
  document.addEventListener("gesturestart", stop, { passive: false });
  document.addEventListener("gesturechange", stop, { passive: false });
  document.addEventListener("gestureend", stop, { passive: false });
  // Any multi-finger move would otherwise zoom the page
  document.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );
}
