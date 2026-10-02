// Contrast helpers (DESIGN.md §4.3). Used for any colour computed at runtime.

function channel(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance([r, g, b]) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// Darkens (on light backgrounds) or lightens (on dark ones) an HSL foreground
// until it reaches `min` contrast against `bg`. Returns the adjusted lightness.
export function readableLightness(h, s, l, bg, min = 4.5) {
  const bgDark = luminance(bg) < 0.2;
  let light = l;
  for (let i = 0; i < 100 && contrastRatio(hslToRgb(h, s, light), bg) < min; i++) {
    light += bgDark ? 1 : -1;
    if (light <= 0 || light >= 100) break;
  }
  return light;
}
