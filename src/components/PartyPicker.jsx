import { useState } from "react";

const MAX_SUGGESTIONS = 6;

function norm(s) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

// Text input with type-ahead over existing parties.
// value: { partyId, name, noParty }. partyId is set when the text matches a
// party; otherwise the text becomes a new party, or (noParty) just the
// entry's particulars, e.g. "SAFE" or "Tea".
export default function PartyPicker({ parties, value, onChange, onPicked, inputRef, allowNoParty = false, placeholder = "Party name" }) {
  const [open, setOpen] = useState(false);
  const query = norm(value.name);

  const matches = query
    ? parties
        .filter((p) => norm(p.name).includes(query))
        .sort((a, b) => {
          const aStarts = norm(a.name).startsWith(query);
          const bStarts = norm(b.name).startsWith(query);
          return aStarts === bStarts ? a.name.localeCompare(b.name) : aStarts ? -1 : 1;
        })
        .slice(0, MAX_SUGGESTIONS)
    : [];
  const exact = parties.find((p) => norm(p.name) === query);

  function handleType(text) {
    const match = parties.find((p) => norm(p.name) === norm(text));
    onChange({ partyId: match?.id ?? null, name: text, noParty: !!value.noParty });
    setOpen(true);
  }

  function pick(next) {
    onChange(next);
    setOpen(false);
    onPicked?.();
  }

  function handleKeyDown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!query) return;
    // Enter takes the exact match, else the top suggestion, else keeps the
    // current new-party / no-party choice.
    const p = exact || matches[0];
    pick(p ? { partyId: p.id, name: p.name, noParty: false } : { partyId: null, name: value.name.trim(), noParty: !!value.noParty });
  }

  const showList = open && query && !(exact && value.partyId === exact.id && matches.length === 1);
  const typed = value.name.trim();

  return (
    <div className="picker">
      <input
        ref={inputRef}
        value={value.name}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="next"
        onChange={(e) => handleType(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        aria-label={placeholder}
      />
      {showList && (
        // onMouseDown + preventDefault keeps the input focused so blur doesn't close the list first
        <div className="picker-list glass--large popover-in" role="listbox" onMouseDown={(e) => e.preventDefault()}>
          {matches.map((p) => (
            <button type="button" key={p.id} role="option" className="picker-item" onClick={() => pick({ partyId: p.id, name: p.name, noParty: false })}>
              {p.name}
            </button>
          ))}
          {!exact && (
            <button type="button" role="option" className="picker-item picker-new" onClick={() => pick({ partyId: null, name: typed, noParty: false })}>
              + New party “{typed}”
            </button>
          )}
          {!exact && allowNoParty && (
            <button type="button" role="option" className="picker-item picker-none" onClick={() => pick({ partyId: null, name: typed, noParty: true })}>
              Use “{typed}” without a party
            </button>
          )}
        </div>
      )}
    </div>
  );
}
