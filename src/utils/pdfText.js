// jsPDF's built-in fonts only cover Latin-1 and it has no Indic text shaping,
// so ₹, Gujarati, etc. come out garbled. For such text we let the browser
// render (and shape) it on a canvas and place the result as an image.

const NEEDS_CANVAS = /[Ā-\u{10FFFF}]/u; // anything outside Latin-1
const PT_TO_MM = 25.4 / 72;
const PX_PER_PT = 3; // render resolution (~216 dpi)
const LINE_HEIGHT = 1.3;
const FONT_FAMILY = '"Noto Sans Gujarati", "Nirmala UI", "Shruti", "Gujarati Sangam MN", sans-serif';

export function needsCanvas(text) {
  return NEEDS_CANVAS.test(text);
}

function cssColor(color) {
  if (Array.isArray(color)) return `rgb(${color.join(",")})`;
  if (typeof color === "number") return `rgb(${color},${color},${color})`;
  return color || "#000";
}

function wrapLines(ctx, text, maxWidthPx) {
  if (!maxWidthPx) return [text];
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidthPx) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  lines.push(line);
  return lines;
}

// Party names repeat on every row, so reuse renders; the alias lets jsPDF
// embed each distinct image only once per document.
const cache = new Map();
const MAX_CACHE = 500;
let aliasSeq = 0;

// Renders text to a PNG. maxWidthMm (optional) wraps onto multiple lines; an
// unbreakable word longer than that is scaled down to fit.
function renderTextImage(text, opts) {
  const key = JSON.stringify([text, opts]);
  let img = cache.get(key);
  if (!img) {
    if (cache.size >= MAX_CACHE) cache.clear();
    img = { ...renderUncached(text, opts), alias: `pdftext-${++aliasSeq}` };
    cache.set(key, img);
  }
  return img;
}

function placeImage(doc, img, x, y) {
  doc.addImage(img.dataUrl, "PNG", x, y, img.width, img.height, img.alias, "FAST");
}

function renderUncached(text, { fontSize, color, bold, maxWidthMm }) {
  const px = fontSize * PX_PER_PT;
  const font = `${bold ? "bold " : ""}${px}px ${FONT_FAMILY}`;
  const maxWidthPx = maxWidthMm ? (maxWidthMm / PT_TO_MM) * PX_PER_PT : 0;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = font;
  const lines = wrapLines(ctx, text, maxWidthPx);
  const lineHeightPx = Math.ceil(px * LINE_HEIGHT);
  canvas.width = Math.max(1, Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width))));
  canvas.height = lineHeightPx * lines.length;

  // Resizing the canvas resets its context state.
  ctx.font = font;
  ctx.fillStyle = cssColor(color);
  ctx.textBaseline = "middle";
  lines.forEach((l, i) => ctx.fillText(l, 0, lineHeightPx * (i + 0.5)));

  let width = (canvas.width / PX_PER_PT) * PT_TO_MM;
  let height = (canvas.height / PX_PER_PT) * PT_TO_MM;
  if (maxWidthMm && width > maxWidthMm) {
    height *= maxWidthMm / width;
    width = maxWidthMm;
  }
  return { dataUrl: canvas.toDataURL("image/png"), width, height };
}

// doc.text() replacement that falls back to an image for non-Latin-1 text.
// (x, y) is the text baseline, as with doc.text().
export function drawText(doc, text, x, y, { fontSize, color = 0, bold = false } = {}) {
  if (!needsCanvas(text)) {
    doc.setFontSize(fontSize);
    doc.setFont(undefined, bold ? "bold" : "normal");
    doc.text(text, x, y);
    doc.setFont(undefined, "normal");
    return;
  }
  const img = renderTextImage(text, { fontSize, color, bold });
  const ascent = fontSize * PT_TO_MM * 0.8;
  placeImage(doc, img, x, y - ascent - (img.height - fontSize * PT_TO_MM) / 2);
}

// autoTable hooks that swap non-Latin-1 cells for canvas images. Column widths
// (mm) must be fixed so wrapping can be computed before row heights are.
export function canvasTextHooks(columnWidths) {
  return {
    columnStyles: Object.fromEntries(columnWidths.map((w, i) => [i, { cellWidth: w }])),
    didParseCell({ cell, column }) {
      const text = cell.text.join(" ");
      if (!needsCanvas(text)) return;
      const { styles } = cell;
      const img = renderTextImage(text, {
        fontSize: styles.fontSize,
        color: styles.textColor,
        bold: styles.fontStyle === "bold",
        maxWidthMm: columnWidths[column.index] - cell.padding("horizontal"),
      });
      cell.canvasImage = img;
      cell.text = [""];
      styles.minCellHeight = Math.max(styles.minCellHeight, img.height + cell.padding("vertical"));
    },
    didDrawCell({ cell, doc }) {
      const img = cell.canvasImage;
      if (!img) return;
      const inner = cell.width - cell.padding("horizontal");
      let x = cell.x + cell.padding("left");
      if (cell.styles.halign === "right") x += inner - img.width;
      else if (cell.styles.halign === "center") x += (inner - img.width) / 2;
      const y = cell.y + (cell.height - img.height) / 2;
      placeImage(doc, img, x, y);
    },
  };
}
