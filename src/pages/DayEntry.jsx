import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { addDayEntries } from "../services/transactions";
import TopBar from "../components/TopBar";
import PartyPicker from "../components/PartyPicker";
import SegmentedControl from "../components/SegmentedControl";
import AccountSelect from "../components/AccountSelect";
import { CameraIcon, MinusIcon, PlusIcon, RotateIcon, TrashIcon } from "../components/Icons";
import { todayLocal, reportWriteError } from "../utils/ledger";
import { shake } from "../design/motion";

// Long side of the reference photo; large enough to zoom into handwriting.
const PHOTO_MAX_SIDE = 2400;

const TYPE_OPTIONS = [
  { value: "in", label: "In", pillBg: "var(--color-status-success)", pillFg: "var(--color-on-primary)" },
  { value: "out", label: "Out", pillBg: "var(--color-status-urgent)", pillFg: "var(--color-on-status-urgent)" },
];

let rowSeq = 0;
// accountId "" means Cash (the default account).
function newRow(type = "in", accountId = "") {
  return { key: `r${Date.now()}-${++rowSeq}`, type, amount: "", partyId: null, name: "", noParty: false, remark: "", accountId };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not open this photo"));
    };
    img.src = url;
  });
}

function renderPhoto(img, rotation) {
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const sideways = rotation % 180 !== 0;
  const canvas = document.createElement("canvas");
  canvas.width = sideways ? h : w;
  canvas.height = sideways ? w : h;
  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function rupees(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

// Draft survives the app being closed mid-entry. Browser storage can be
// unavailable (private mode etc.), so every access is guarded.
function loadDraft(key) {
  try {
    const draft = JSON.parse(localStorage.getItem(key));
    if (draft?.rows?.length) return draft;
  } catch {
    // ignore
  }
  return null;
}
function saveDraft(key, draft) {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // ignore
  }
}
function clearDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export default function DayEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { parties, accounts, cashId } = useData();
  const draftKey = `dayEntryDraft:${user.uid}`;
  const [date, setDate] = useState(() => loadDraft(draftKey)?.date || todayLocal());
  const [rows, setRows] = useState(() => loadDraft(draftKey)?.rows || [newRow()]);
  const [showErrors, setShowErrors] = useState(false);

  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [photoOpen, setPhotoOpen] = useState(true);
  const [photoError, setPhotoError] = useState("");

  const amountRefs = useRef({});
  const partyRefs = useRef({});
  const pendingFocus = useRef(null);

  useEffect(() => {
    saveDraft(draftKey, { date, rows });
  }, [draftKey, date, rows]);

  useEffect(() => {
    if (!pendingFocus.current) return;
    const { key, field } = pendingFocus.current;
    pendingFocus.current = null;
    (field === "party" ? partyRefs : amountRefs).current[key]?.focus();
  });

  const sortedParties = useMemo(
    () => parties.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [parties]
  );

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same photo again
    if (!file) return;
    setPhotoError("");
    try {
      imageRef.current = await loadImage(file);
      setRotation(0);
      setZoom(1);
      setPhotoOpen(true);
      setPhoto(renderPhoto(imageRef.current, 0));
    } catch (err) {
      setPhotoError(err.message);
    }
  }

  function rotate() {
    const next = (rotation + 90) % 360;
    setRotation(next);
    setPhoto(renderPhoto(imageRef.current, next));
  }

  function updateRow(key, patch) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key) {
    setRows((rs) => {
      const next = rs.filter((r) => r.key !== key);
      return next.length ? next : [newRow()];
    });
  }

  // New lines keep the previous line's account, since a page is usually
  // written for one till / bank at a time.
  function addRow(type, accountId = rows[rows.length - 1]?.accountId || "") {
    const row = newRow(type, accountId);
    setRows((rs) => [...rs, row]);
    pendingFocus.current = { key: row.key, field: "amount" };
  }

  // After a party is chosen, jump to the next line's amount, adding a line
  // (same In/Out side and account) when this was the last one.
  function handlePartyPicked(index) {
    const next = rows[index + 1];
    if (next) pendingFocus.current = { key: next.key, field: "amount" };
    else addRow(rows[index].type, rows[index].accountId);
  }

  const filled = rows.filter((r) => r.amount !== "" || r.name.trim());
  const isValid = (r) => Number(r.amount) > 0 && r.name.trim() !== "";
  const invalidCount = filled.filter((r) => !isValid(r)).length;
  const totals = filled.filter(isValid).reduce(
    (t, r) => {
      t[r.type] += Number(r.amount);
      return t;
    },
    { in: 0, out: 0 }
  );
  const newPartyNames = [
    ...new Set(filled.filter((r) => isValid(r) && !r.partyId && !r.noParty).map((r) => r.name.trim().toLowerCase())),
  ];

  function handleSave() {
    if (filled.length === 0) return;
    if (invalidCount > 0) {
      setShowErrors(true);
      requestAnimationFrame(() => document.querySelectorAll(".entry-row.invalid").forEach(shake));
      alert(`${invalidCount} line(s) need an amount and a party or particulars. They are marked in red.`);
      return;
    }
    const lines = [
      `Save ${filled.length} entries for ${formatDate(date)}?`,
      `In: ${rupees(totals.in)}   Out: ${rupees(totals.out)}`,
    ];
    if (newPartyNames.length) lines.push(`${newPartyNames.length} new party(s) will be created.`);
    if (!confirm(lines.join("\n"))) return;

    const entries = filled.map((r) => ({
      type: r.type,
      amount: r.amount,
      remark: r.remark.trim(),
      accountId: r.accountId || cashId,
      partyId: r.partyId,
      newPartyName: r.partyId || r.noParty ? null : r.name.trim(),
      particulars: r.noParty && !r.partyId ? r.name.trim() : "",
    }));
    addDayEntries(user.uid, date, entries).catch(reportWriteError);
    clearDraft(draftKey);
    navigate("/");
  }

  function handleClear() {
    if (!confirm("Clear all lines on this screen?")) return;
    setRows([newRow()]);
    setShowErrors(false);
  }

  return (
    <>
      <TopBar
        title="Day Entry"
        onBack={() => navigate(-1)}
        right={
          <button className="capsule-btn icon-only press" onClick={() => fileInputRef.current?.click()} title="Photo of page" aria-label="Photo of page">
            <CameraIcon width={20} height={20} />
          </button>
        }
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handlePhoto}
      />

      {photo && (
        <div className="day-photo">
          <div className="day-photo-bar">
            <button type="button" onClick={() => setPhotoOpen((o) => !o)}>
              {photoOpen ? "Hide photo" : "Show photo"}
            </button>
            {photoOpen && (
              <>
                <button type="button" className="press" onClick={rotate} aria-label="Rotate photo">
                  <RotateIcon width={16} height={16} aria-hidden="true" /> Rotate
                </button>
                <button type="button" className="press" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1} aria-label="Zoom out">
                  <MinusIcon width={16} height={16} aria-hidden="true" />
                </button>
                <button type="button" className="press" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} disabled={zoom >= 4} aria-label="Zoom in">
                  <PlusIcon width={16} height={16} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
          {photoOpen && (
            <div className="day-photo-view">
              <img src={photo} alt="Daybook page" style={{ width: `${zoom * 100}%` }} />
            </div>
          )}
        </div>
      )}

      <main className="page day-entry">
        <label className="day-date field">
          <span>Page date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value || todayLocal())} />
        </label>

        {!photo && (
          <button type="button" className="btn btn-outline btn-block press" onClick={() => fileInputRef.current?.click()}>
            <CameraIcon width={18} height={18} /> Add photo of the page (optional)
          </button>
        )}
        {photoError && <div className="error-text">{photoError}</div>}

        <div className="entry-list">
          {rows.map((r, i) => {
            const bad = showErrors && (r.amount !== "" || r.name.trim()) && !isValid(r);
            return (
              <div key={r.key} className={`entry-row ${r.type} ${bad ? "invalid" : ""}`}>
                <div className="entry-top">
                  <span className="entry-no">{i + 1}</span>
                  <SegmentedControl
                    className="entry-type"
                    ariaLabel={`Line ${i + 1} in or out`}
                    options={TYPE_OPTIONS}
                    value={r.type}
                    onChange={(type) => updateRow(r.key, { type })}
                  />
                  <input
                    ref={(el) => (amountRefs.current[r.key] = el)}
                    className="entry-amount"
                    type="number"
                    inputMode="decimal"
                    enterKeyHint="next"
                    placeholder="Amount"
                    value={r.amount}
                    onChange={(e) => updateRow(r.key, { amount: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        partyRefs.current[r.key]?.focus();
                      }
                    }}
                  />
                  <button type="button" className="txn-delete press" onClick={() => removeRow(r.key)} aria-label={`Remove line ${i + 1}`} title="Remove line">
                    <TrashIcon width={16} height={16} />
                  </button>
                </div>
                <PartyPicker
                  parties={sortedParties}
                  value={{ partyId: r.partyId, name: r.name, noParty: r.noParty }}
                  onChange={(v) => updateRow(r.key, v)}
                  onPicked={() => handlePartyPicked(i)}
                  inputRef={(el) => (partyRefs.current[r.key] = el)}
                  allowNoParty
                  placeholder="Party or particulars"
                />
                <div className="entry-bottom">
                  <AccountSelect
                    className="entry-account"
                    accounts={accounts}
                    value={r.accountId || cashId}
                    onChange={(accountId) => updateRow(r.key, { accountId })}
                  />
                  {r.name.trim() && !r.partyId && (
                    <button
                      type="button"
                      className={`entry-badge press ${r.noParty ? "none" : ""}`}
                      onClick={() => updateRow(r.key, { noParty: !r.noParty })}
                      aria-label={r.noParty ? "Saved without a party. Tap to create a party instead." : "Will create a new party. Tap to save without a party."}
                    >
                      {r.noParty ? "No party" : "New party"}
                    </button>
                  )}
                </div>
                <input
                  className="entry-remark"
                  placeholder="Remark (optional)"
                  aria-label={`Line ${i + 1} remark`}
                  value={r.remark}
                  onChange={(e) => updateRow(r.key, { remark: e.target.value })}
                />
              </div>
            );
          })}
        </div>

        <div className="entry-add">
          <button type="button" className="btn btn-outline press" onClick={() => addRow("in")}>+ In line</button>
          <button type="button" className="btn btn-outline press" onClick={() => addRow("out")}>+ Out line</button>
        </div>
        {filled.length > 0 && (
          <button type="button" className="entry-clear" onClick={handleClear}>Clear all lines</button>
        )}
      </main>

      <div className="day-footer glass">
        <div className="day-totals">
          <span className="in">In {rupees(totals.in)}</span>
          <span className="out">Out {rupees(totals.out)}</span>
        </div>
        <button type="button" className="btn btn-primary btn-block press" disabled={filled.length === 0} onClick={handleSave}>
          Save {filled.length || ""} {filled.length === 1 ? "entry" : "entries"}
        </button>
      </div>
    </>
  );
}
