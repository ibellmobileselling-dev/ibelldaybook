import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Tesseract from "tesseract.js";
import { useAuth } from "../context/AuthContext";
import { listenParties, addParty } from "../services/parties";
import { addTransaction } from "../services/transactions";
import TopBar from "../components/TopBar";
import { CameraIcon } from "../components/Icons";

function preprocess(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < data.data.length; i += 4) {
        const gray = data.data[i] * 0.299 + data.data[i + 1] * 0.587 + data.data[i + 2] * 0.114;
        const contrasted = Math.min(255, Math.max(0, (gray - 128) * 1.4 + 128));
        data.data[i] = data.data[i + 1] = data.data[i + 2] = contrasted;
      }
      ctx.putImageData(data, 0, 0);
      resolve(canvas);
    };
    img.src = URL.createObjectURL(file);
  });
}

function guessAmount(text) {
  const matches = text.match(/\d{1,3}(?:,\d{2,3})*(?:\.\d+)?/g) || [];
  const nums = matches
    .map((m) => Number(m.replace(/,/g, "")))
    .filter((n) => n >= 10 && n <= 10000000);
  if (nums.length === 0) return "";
  return String(Math.max(...nums));
}

export default function ScanAdd() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [parties, setParties] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);

  const [partyMode, setPartyMode] = useState("existing");
  const [partyId, setPartyId] = useState("");
  const [newPartyName, setNewPartyName] = useState("");
  const [type, setType] = useState("in");
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    return listenParties(user.uid, setParties);
  }, [user]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setOcrRunning(true);
    setOcrText("");
    setOcrProgress(0);
    try {
      const canvas = await preprocess(file);
      const { data } = await Tesseract.recognize(canvas, "guj+eng", {
        logger: (m) => {
          if (m.status === "recognizing text") setOcrProgress(Math.round(m.progress * 100));
        },
      });
      setOcrText(data.text);
      const guessed = guessAmount(data.text);
      if (guessed) setAmount(guessed);
    } catch (err) {
      setOcrText("Could not read text automatically. Please fill the details manually below.");
    } finally {
      setOcrRunning(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setSaving(true);
    try {
      let finalPartyId = partyId;
      if (partyMode === "new") {
        if (!newPartyName.trim()) {
          setSaving(false);
          return;
        }
        const ref = await addParty(user.uid, { name: newPartyName, phone: "", openingBalance: 0 });
        finalPartyId = ref.id;
      }
      if (!finalPartyId) {
        setSaving(false);
        return;
      }
      await addTransaction(user.uid, { partyId: finalPartyId, type, amount, remark, date, fromOcr: true });
      navigate(`/party/${finalPartyId}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TopBar title="Scan & Add" onBack={() => navigate(-1)} />
      <div className="page">
        <div className="scan-area">
          {!previewUrl && (
            <button className="btn btn-primary btn-block" onClick={() => fileInputRef.current?.click()}>
              <CameraIcon width={18} height={18} /> Capture Slip / Bill
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleFile}
          />

          {previewUrl && (
            <div className="camera-box">
              <img src={previewUrl} alt="captured slip" />
            </div>
          )}

          {previewUrl && (
            <button className="btn btn-outline btn-block" onClick={() => fileInputRef.current?.click()}>
              Retake / Choose Another
            </button>
          )}

          {ocrRunning && <div className="ocr-status">Reading image... {ocrProgress}%</div>}

          {ocrText && !ocrRunning && (
            <div className="ocr-text-preview">{ocrText.trim() || "No text detected."}</div>
          )}

          {previewUrl && !ocrRunning && (
            <form className="form" style={{ padding: 0 }} onSubmit={handleSave}>
              <div className="field">
                <label>Party</label>
                <div className="type-toggle" style={{ marginBottom: 8 }}>
                  <button type="button" className={`type-btn ${partyMode === "existing" ? "selected in" : ""}`} onClick={() => setPartyMode("existing")}>
                    Existing
                  </button>
                  <button type="button" className={`type-btn ${partyMode === "new" ? "selected in" : ""}`} onClick={() => setPartyMode("new")}>
                    New Party
                  </button>
                </div>
                {partyMode === "existing" ? (
                  <select value={partyId} onChange={(e) => setPartyId(e.target.value)} required>
                    <option value="">Select party</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <input required value={newPartyName} onChange={(e) => setNewPartyName(e.target.value)} placeholder="Party name" />
                )}
              </div>

              <div className="type-toggle">
                <button type="button" className={`type-btn in ${type === "in" ? "selected" : ""}`} onClick={() => setType("in")}>
                  You Got (In)
                </button>
                <button type="button" className={`type-btn out ${type === "out" ? "selected" : ""}`} onClick={() => setType("out")}>
                  You Gave (Out)
                </button>
              </div>

              <div className="field">
                <label>Amount (verify — auto-detected from scan)</label>
                <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="field">
                <label>Remark (optional)</label>
                <input value={remark} onChange={(e) => setRemark(e.target.value)} />
              </div>
              <div className="field">
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-block" disabled={saving} type="submit">
                {saving ? "Saving..." : "Save Transaction"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
