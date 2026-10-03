import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

// pdf-lib's built-in fonts only encode Latin (WinAnsi) — an Arabic student
// name or teacher note throws "WinAnsi cannot encode ..." and 500s the
// whole download. So PDFs embed Noto Sans Arabic (OFL, vendored in
// assets/fonts) and route Arabic runs through it; fontkit does the letter
// shaping. Labels in these PDFs stay English; Arabic *content* (names,
// notes) renders correctly.
const AR = "\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF";
const HAS_ARABIC = new RegExp(`[${AR}]`);
const ARABIC_RUN = new RegExp(`([${AR}]+(?:[\\s\\u060C\\u061F\\d]+[${AR}]+)*)`);

export const hasArabic = (text: string) => HAS_ARABIC.test(text);

export type PdfFonts = { latin: PDFFont; latinBold: PDFFont; arabic: PDFFont };

export async function createPdf(): Promise<{ doc: PDFDocument; fonts: PdfFonts }> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const latin = await doc.embedFont(StandardFonts.Helvetica);
  const latinBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontBytes = await readFile(path.join(process.cwd(), "assets", "fonts", "NotoSansArabic-Regular.ttf"));
  const arabic = await doc.embedFont(fontBytes, { subset: true });
  return { doc, fonts: { latin, latinBold, arabic } };
}

// Replace anything Helvetica can't encode with "?" so a stray character
// (emoji, CJK, ...) can never crash a download.
function latinSafe(text: string, font: PDFFont): string {
  const supported = new Set(font.getCharacterSet());
  return Array.from(text)
    .map((ch) => (supported.has(ch.codePointAt(0)!) || ch === "\n" ? ch : "?"))
    .join("")
    .replace(/\n/g, " ");
}

type Segment = { text: string; font: PDFFont };

function segments(text: string, fonts: PdfFonts, bold: boolean): Segment[] {
  const latinFont = bold ? fonts.latinBold : fonts.latin;
  return text
    .split(ARABIC_RUN)
    .filter((part) => part.length > 0)
    .map((part) =>
      hasArabic(part) ? { text: part, font: fonts.arabic } : { text: latinSafe(part, latinFont), font: latinFont }
    );
}

export function textWidth(text: string, fonts: PdfFonts, size: number, bold = false): number {
  return segments(text, fonts, bold).reduce((sum, s) => sum + s.font.widthOfTextAtSize(s.text, size), 0);
}

// Draws one line, left-to-right by segment. For a name like "Youssef يوسف"
// each script run is shaped correctly; a *sentence* mixing both scripts
// would need full bidi reordering (not done — Arabic paragraphs go through
// drawParagraph below, which handles pure-Arabic text).
export function drawLine(
  page: PDFPage,
  fonts: PdfFonts,
  text: string,
  opts: { x: number; y: number; size: number; bold?: boolean; color?: RGB; rightAlignTo?: number }
) {
  const width = textWidth(text, fonts, opts.size, opts.bold);
  let x = opts.rightAlignTo != null ? opts.rightAlignTo - width : opts.x;
  for (const seg of segments(text, fonts, !!opts.bold)) {
    page.drawText(seg.text, { x, y: opts.y, size: opts.size, font: seg.font, color: opts.color ?? rgb(0, 0, 0) });
    x += seg.font.widthOfTextAtSize(seg.text, opts.size);
  }
}

// Word-wrapped paragraph. Pure-Arabic text is wrapped right-to-left and
// right-aligned; anything else is wrapped left-to-right. Returns the y
// position below the last line.
export function drawParagraph(
  page: PDFPage,
  fonts: PdfFonts,
  text: string,
  opts: { x: number; y: number; size: number; maxWidth: number; lineHeight?: number; color?: RGB }
): number {
  const lineHeight = opts.lineHeight ?? opts.size * 1.5;
  const rtl = hasArabic(text) && !/[A-Za-z]{3,}/.test(text);
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && textWidth(candidate, fonts, opts.size) > opts.maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  let y = opts.y;
  for (const line of lines) {
    drawLine(page, fonts, line, {
      x: opts.x,
      y,
      size: opts.size,
      color: opts.color,
      rightAlignTo: rtl ? opts.x + opts.maxWidth : undefined,
    });
    y -= lineHeight;
  }
  return y;
}
