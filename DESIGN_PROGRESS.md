# Design & feature progress

## DONE
- DESIGN.md written; decisions answered 2026-10-02; palette contrast-checked (all text pairs ≥ 4.5:1, UI ≥ 3:1; high contrast ≥ 7:1).
- Building blocks: tokens (`src/styles/tokens.css`), glass (`src/styles/glass.css`), motion (`src/design/motion.js`, springs as sampled `linear()` curves), concentric radii, readable contrast helper (used for avatar colours), segmented control with selection pill, scroll edge, skeletons.
- Accessibility modes wired: dark, Increase Contrast, Reduce Transparency (opaque identity glass), Reduce Motion (fade-only, no press scale/shake).
- Surfaces migrated: floating top-bar capsules (title off glass), floating bottom-nav capsule with travelling pill, tinted primary-action capsules, large-glass sheets over scrim (floating glass hidden while open), party type-ahead popover (solid inside sheets: no glass on glass). Content stays tonal.
- Accounts: Cash + banks (Indian bank list), opening balances, edit/delete (delete blocked when an account has entries), account ledger with Today / Date / From–To / All and PDF / Excel / CSV downloads.
- Entries: account per entry, optional party (particulars only), transfers between accounts; Day Entry rows carry account + party/no-party.
- Cash Book in the client's Excel layout + Bank column; opening balance on the inward side, totals, Cash on Hand / Closing; all-accounts view with account-wise summary; day-by-day sheets; PDF (landscape), Excel (ExcelJS, client colours, ₹ Indian format), CSV.
- Shared data provider: one Firestore listener per collection for the whole app.
- Tests: `npm test` (cash-book maths incl. the client's 23/09/26 sheet).

## Approximated / not done
- Container transform (item → detail) is approximated by the shared-axis screen transition.
- Selection pill does not follow a finger drag across the control (tap and arrow keys only).
- Changing numbers don't cross-fade on live updates (they change in place).
- No toasts; write errors still use `alert()`.

## Verified (2026-10-02)
- Headless Chrome at 390 px with sample data: light, dark, high contrast, reduced transparency, reduced motion; Tier A blur active where supported.
- Downloads generated and read back: PDF (cash book, all-accounts, bank ledger), XLSX (values, formats, fills, merges), CSV.

## Not verified
- On a real phone; with a real Firebase login and data; Firestore rules not deployed or tested against the emulator.

## Log
- 2026-10-02: Phase 1–2 complete; DESIGN.md created.
- 2026-10-02: Phase 3–4: building blocks, accounts, cash book, exports, surface migration, verification.
