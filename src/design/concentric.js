// Concentric corners (DESIGN.md §4.2): inner = outer − padding, never below 8.
export function inner(outer, padding, min = 8) {
  return Math.max(min, outer - padding);
}
