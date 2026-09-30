function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

// Stable soft colour per name so parties are easy to tell apart at a glance.
function hue(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 360;
  return h;
}

export default function Avatar({ name, size }) {
  return (
    <div className={`party-avatar ${size || ""}`} style={{ "--hue": hue(name) }}>
      {initials(name)}
    </div>
  );
}
