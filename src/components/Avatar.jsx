import { hslToRgb, readableLightness } from "../design/contrast";

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

// Stable soft colour per name so parties are easy to tell apart at a glance.
function hue(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 360;
  return h;
}

const cache = new Map();

// Light and dark colour pairs, with the initials pushed to ≥ 4.5:1 contrast.
function colours(name) {
  const h = hue(name);
  if (!cache.has(h)) {
    const lightBg = [h, 70, 93];
    const darkBg = [h, 30, 20];
    const lightFg = readableLightness(h, 45, 32, hslToRgb(...lightBg));
    const darkFg = readableLightness(h, 70, 75, hslToRgb(...darkBg));
    cache.set(h, {
      "--avatar-bg-l": `hsl(${h} 70% 93%)`,
      "--avatar-fg-l": `hsl(${h} 45% ${lightFg}%)`,
      "--avatar-bg-d": `hsl(${h} 30% 20%)`,
      "--avatar-fg-d": `hsl(${h} 70% ${darkFg}%)`,
    });
  }
  return cache.get(h);
}

export default function Avatar({ name, size }) {
  return (
    <div className={`party-avatar ${size || ""}`} style={colours(name)} aria-hidden="true">
      {initials(name)}
    </div>
  );
}
