import SegmentedControl from "./SegmentedControl";
import { todayLocal } from "../utils/ledger";

export function defaultPeriod() {
  const t = todayLocal();
  return { mode: "today", date: t, from: `${t.slice(0, 8)}01`, to: t };
}

const MODES = [
  { value: "today", label: "Today" },
  { value: "date", label: "Date" },
  { value: "range", label: "From – To" },
  { value: "all", label: "All" },
];

// Today / one date / date range / everything. value: { mode, date, from, to }.
export default function PeriodPicker({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="period-picker">
      <SegmentedControl ariaLabel="Period" options={MODES} value={value.mode} onChange={(mode) => set({ mode })} />
      {value.mode === "date" && (
        <div className="period-dates fade-through">
          <label className="field">
            <span>Date</span>
            <input type="date" value={value.date} onChange={(e) => set({ date: e.target.value || todayLocal() })} />
          </label>
        </div>
      )}
      {value.mode === "range" && (
        <div className="period-dates fade-through">
          <label className="field">
            <span>From</span>
            <input type="date" value={value.from} onChange={(e) => set({ from: e.target.value || value.from })} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={value.to} onChange={(e) => set({ to: e.target.value || value.to })} />
          </label>
        </div>
      )}
    </div>
  );
}
