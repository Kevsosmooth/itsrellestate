import {
  PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, RGB,
} from "pdf-lib";
import { readFileSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { getDrive } from "@/lib/google";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 43;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_HEIGHT = 36;
const PAGE_BOTTOM = MARGIN + FOOTER_HEIGHT;

const COLOR_TEXT = rgb(0.1, 0.1, 0.1);
const COLOR_MUTED = rgb(0.42, 0.4, 0.38);
const COLOR_PLACEHOLDER = rgb(0.7, 0.68, 0.65);
const COLOR_DOTTED = rgb(0.78, 0.77, 0.74);
const COLOR_LINE = rgb(0.78, 0.77, 0.74);
const COLOR_BAR = rgb(0.1, 0.1, 0.1);
const COLOR_BAR_TEXT = rgb(1, 1, 1);

export interface PdfContext {
  doc: PDFDocument;
  page: PDFPage;
  serif: PDFFont;
  serifBold: PDFFont;
  sans: PDFFont;
  sansBold: PDFFont;
  italic: PDFFont;
  cursorY: number;
  pageNumber: number;
  logoPng: Awaited<ReturnType<PDFDocument["embedPng"]>> | null;
  footerText: string;
}

export interface FieldRow {
  label: string;
  value: string;
  empty?: boolean;
}

export async function createPdfContext(footerText: string): Promise<PdfContext> {
  const doc = await PDFDocument.create();
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);

  let logoPng: PdfContext["logoPng"] = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "images", "logo.png");
    const logoBytes = readFileSync(logoPath);
    logoPng = await doc.embedPng(logoBytes);
  } catch (err) {
    console.warn("[pdf] logo not found, skipping:", err);
  }

  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  return {
    doc,
    page,
    serif,
    serifBold,
    sans,
    sansBold,
    italic,
    cursorY: PAGE_HEIGHT - MARGIN,
    pageNumber: 1,
    logoPng,
    footerText,
  };
}

function ensureSpace(ctx: PdfContext, needed: number): void {
  if (ctx.cursorY - needed < PAGE_BOTTOM) {
    drawPageFooter(ctx);
    ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    ctx.cursorY = PAGE_HEIGHT - MARGIN;
    ctx.pageNumber += 1;
  }
}

function drawPageFooter(ctx: PdfContext): void {
  const text = ctx.footerText;
  const size = 8;
  const width = ctx.sans.widthOfTextAtSize(text, size);
  ctx.page.drawText(text, {
    x: (PAGE_WIDTH - width) / 2,
    y: MARGIN - 8,
    size,
    font: ctx.sans,
    color: COLOR_MUTED,
  });
  ctx.page.drawLine({
    start: { x: MARGIN, y: MARGIN + 4 },
    end: { x: PAGE_WIDTH - MARGIN, y: MARGIN + 4 },
    thickness: 0.5,
    color: COLOR_LINE,
  });
}

export function drawHeader(ctx: PdfContext, opts: { submittedDisplay: string; agentLine: string }): void {
  ctx.cursorY = PAGE_HEIGHT - MARGIN;
  const headerTop = ctx.cursorY;

  let logoBottom = headerTop;
  if (ctx.logoPng) {
    const targetWidth = 130;
    const scale = targetWidth / ctx.logoPng.width;
    const drawHeight = ctx.logoPng.height * scale;
    logoBottom = headerTop - drawHeight;
    ctx.page.drawImage(ctx.logoPng, {
      x: MARGIN,
      y: logoBottom,
      width: targetWidth,
      height: drawHeight,
    });
  }

  const metaSize = 8.5;
  const lineHeight = 12;
  const metaLines = [
    { label: "Submitted ", value: opts.submittedDisplay },
    { label: "Agent ", value: opts.agentLine },
  ];

  let metaY = headerTop - metaSize;
  let metaBottom = metaY;
  for (const line of metaLines) {
    const labelWidth = ctx.sansBold.widthOfTextAtSize(line.label, metaSize);
    const valueWidth = ctx.sans.widthOfTextAtSize(line.value, metaSize);
    const totalWidth = labelWidth + valueWidth;
    const startX = PAGE_WIDTH - MARGIN - totalWidth;
    ctx.page.drawText(line.label, {
      x: startX,
      y: metaY,
      size: metaSize,
      font: ctx.sansBold,
      color: COLOR_MUTED,
    });
    ctx.page.drawText(line.value, {
      x: startX + labelWidth,
      y: metaY,
      size: metaSize,
      font: ctx.sans,
      color: COLOR_TEXT,
    });
    metaBottom = metaY;
    metaY -= lineHeight;
  }

  const lineY = Math.min(logoBottom, metaBottom) - 10;
  ctx.page.drawLine({
    start: { x: MARGIN, y: lineY },
    end: { x: PAGE_WIDTH - MARGIN, y: lineY },
    thickness: 1.5,
    color: COLOR_BAR,
  });
  ctx.cursorY = lineY - 18;
}

export function drawTitle(ctx: PdfContext, title: string, subtitle: string): void {
  ensureSpace(ctx, 60);

  const titleSize = 22;
  const titleWidth = ctx.serifBold.widthOfTextAtSize(title, titleSize);
  ctx.page.drawText(title, {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: ctx.cursorY - titleSize,
    size: titleSize,
    font: ctx.serifBold,
    color: COLOR_TEXT,
  });
  ctx.cursorY -= titleSize + 6;

  const subSize = 8.5;
  const subWidth = ctx.sans.widthOfTextAtSize(subtitle, subSize);
  ctx.page.drawText(subtitle.toUpperCase(), {
    x: (PAGE_WIDTH - subWidth) / 2,
    y: ctx.cursorY - subSize,
    size: subSize,
    font: ctx.sans,
    color: COLOR_MUTED,
  });
  ctx.cursorY -= subSize + 22;
}

export function drawSectionBar(ctx: PdfContext, label: string): void {
  ensureSpace(ctx, 36);

  const barHeight = 18;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.cursorY - barHeight,
    width: CONTENT_WIDTH,
    height: barHeight,
    color: COLOR_BAR,
  });

  const size = 9;
  ctx.page.drawText(label.toUpperCase(), {
    x: MARGIN + 8,
    y: ctx.cursorY - 13,
    size,
    font: ctx.sansBold,
    color: COLOR_BAR_TEXT,
  });

  ctx.cursorY -= barHeight + 8;
}

function drawDottedLine(page: PDFPage, x1: number, y: number, x2: number, color: RGB) {
  const segLen = 2;
  const gap = 2;
  let x = x1;
  while (x < x2) {
    const end = Math.min(x + segLen, x2);
    page.drawLine({
      start: { x, y },
      end: { x: end, y },
      thickness: 0.5,
      color,
    });
    x += segLen + gap;
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const w = font.widthOfTextAtSize(candidate, size);
    if (w > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function drawFieldGrid(ctx: PdfContext, rows: FieldRow[], columns = 2): void {
  const colWidth = (CONTENT_WIDTH - 24 * (columns - 1)) / columns;
  const labelSize = 7.5;
  const valueSize = 11;
  const lineHeight = 13;
  const labelGap = 2;
  const rowGap = 6;

  for (let i = 0; i < rows.length; i += columns) {
    const slice = rows.slice(i, i + columns);
    let rowHeight = 0;

    const computed = slice.map((field) => {
      const value = field.value || "";
      const isEmpty = field.empty || !value;
      const displayValue = isEmpty ? (value || "Not provided") : value;
      const lines = wrapText(displayValue, ctx.serif, valueSize, colWidth);
      const fieldHeight = labelSize + labelGap + lines.length * lineHeight + rowGap;
      if (fieldHeight > rowHeight) rowHeight = fieldHeight;
      return { ...field, displayValue, lines, isEmpty };
    });

    ensureSpace(ctx, rowHeight + 4);

    let x = MARGIN;
    for (const field of computed) {
      ctx.page.drawText(field.label.toUpperCase(), {
        x,
        y: ctx.cursorY - labelSize,
        size: labelSize,
        font: ctx.sansBold,
        color: COLOR_MUTED,
      });

      let lineY = ctx.cursorY - labelSize - labelGap - valueSize;
      for (const line of field.lines) {
        ctx.page.drawText(line, {
          x,
          y: lineY,
          size: valueSize,
          font: field.isEmpty ? ctx.italic : ctx.serif,
          color: field.isEmpty ? COLOR_PLACEHOLDER : COLOR_TEXT,
        });
        lineY -= lineHeight;
      }

      drawDottedLine(
        ctx.page,
        x,
        ctx.cursorY - rowHeight + rowGap - 1,
        x + colWidth,
        COLOR_DOTTED,
      );

      x += colWidth + 24;
    }

    ctx.cursorY -= rowHeight;
  }

  ctx.cursorY -= 8;
}

export function drawTable(ctx: PdfContext, headers: string[], rows: string[][]): void {
  const colCount = headers.length;
  const colWidth = CONTENT_WIDTH / colCount;
  const headerHeight = 22;
  const rowHeight = 22;
  const padding = 6;
  const headerSize = 8;
  const cellSize = 10.5;

  ensureSpace(ctx, headerHeight + rowHeight * rows.length + 8);

  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.cursorY - headerHeight,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: rgb(0.96, 0.94, 0.92),
    borderColor: COLOR_LINE,
    borderWidth: 0.5,
  });

  for (let i = 0; i < headers.length; i++) {
    ctx.page.drawText(headers[i].toUpperCase(), {
      x: MARGIN + i * colWidth + padding,
      y: ctx.cursorY - headerHeight + (headerHeight - headerSize) / 2,
      size: headerSize,
      font: ctx.sansBold,
      color: COLOR_MUTED,
    });
  }

  ctx.cursorY -= headerHeight;

  for (const row of rows) {
    ensureSpace(ctx, rowHeight + 4);

    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.cursorY - rowHeight,
      width: CONTENT_WIDTH,
      height: rowHeight,
      borderColor: COLOR_LINE,
      borderWidth: 0.5,
    });

    for (let i = 0; i < row.length; i++) {
      const cellWidth = colWidth - padding * 2;
      const lines = wrapText(row[i] || "", ctx.serif, cellSize, cellWidth);
      const text = lines[0];
      ctx.page.drawText(text, {
        x: MARGIN + i * colWidth + padding,
        y: ctx.cursorY - rowHeight + (rowHeight - cellSize) / 2,
        size: cellSize,
        font: ctx.serif,
        color: COLOR_TEXT,
      });
    }

    ctx.cursorY -= rowHeight;
  }

  ctx.cursorY -= 8;
}

export function drawDocList(ctx: PdfContext, docs: string[]): void {
  if (docs.length === 0) {
    ctx.page.drawText("None on file", {
      x: MARGIN,
      y: ctx.cursorY - 11,
      size: 10.5,
      font: ctx.italic,
      color: COLOR_PLACEHOLDER,
    });
    ctx.cursorY -= 22;
    return;
  }

  const colWidth = CONTENT_WIDTH / 2 - 12;
  const lineHeight = 16;
  const halfLength = Math.ceil(docs.length / 2);
  const totalHeight = halfLength * lineHeight + 8;

  ensureSpace(ctx, totalHeight);

  for (let i = 0; i < docs.length; i++) {
    const col = i < halfLength ? 0 : 1;
    const row = i % halfLength;
    const x = MARGIN + col * (colWidth + 24);
    const y = ctx.cursorY - row * lineHeight - 11;

    ctx.page.drawRectangle({
      x,
      y: y + 1,
      width: 7,
      height: 7,
      borderColor: COLOR_TEXT,
      borderWidth: 0.75,
    });
    ctx.page.drawLine({
      start: { x: x + 1.2, y: y + 4 },
      end: { x: x + 3, y: y + 2 },
      thickness: 1,
      color: COLOR_TEXT,
    });
    ctx.page.drawLine({
      start: { x: x + 3, y: y + 2 },
      end: { x: x + 6.2, y: y + 6.5 },
      thickness: 1,
      color: COLOR_TEXT,
    });
    ctx.page.drawText(docs[i], {
      x: x + 14,
      y,
      size: 10.5,
      font: ctx.serif,
      color: COLOR_TEXT,
    });
  }

  ctx.cursorY -= totalHeight;
}

export function drawDisclosure(ctx: PdfContext, text: string): void {
  const size = 9.5;
  const lineHeight = 13;
  const lines = wrapText(text, ctx.serif, size, CONTENT_WIDTH);
  const totalHeight = lines.length * lineHeight + 12;

  ensureSpace(ctx, totalHeight);

  let y = ctx.cursorY - size;
  for (const line of lines) {
    ctx.page.drawText(line, {
      x: MARGIN,
      y,
      size,
      font: ctx.serif,
      color: COLOR_MUTED,
    });
    y -= lineHeight;
  }
  ctx.cursorY -= totalHeight;
}

export function drawSignature(ctx: PdfContext, name: string, dateDisplay: string): void {
  const blockHeight = 70;
  ensureSpace(ctx, blockHeight);

  ctx.cursorY -= 4;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.cursorY },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.cursorY },
    thickness: 1,
    color: COLOR_BAR,
  });
  ctx.cursorY -= 14;

  const dateBoxWidth = 150;
  const sigBoxWidth = CONTENT_WIDTH - dateBoxWidth - 24;
  const sigBoxX = MARGIN;
  const dateBoxX = MARGIN + sigBoxWidth + 24;

  const sigSize = 22;
  ctx.page.drawText(name, {
    x: sigBoxX + 6,
    y: ctx.cursorY - sigSize,
    size: sigSize,
    font: ctx.italic,
    color: COLOR_TEXT,
  });

  const dateSize = 11;
  ctx.page.drawText(dateDisplay, {
    x: dateBoxX + 6,
    y: ctx.cursorY - sigSize + 6,
    size: dateSize,
    font: ctx.serif,
    color: COLOR_TEXT,
  });

  ctx.cursorY -= sigSize + 4;
  ctx.page.drawLine({
    start: { x: sigBoxX, y: ctx.cursorY },
    end: { x: sigBoxX + sigBoxWidth, y: ctx.cursorY },
    thickness: 0.75,
    color: COLOR_BAR,
  });
  ctx.page.drawLine({
    start: { x: dateBoxX, y: ctx.cursorY },
    end: { x: dateBoxX + dateBoxWidth, y: ctx.cursorY },
    thickness: 0.75,
    color: COLOR_BAR,
  });
  ctx.cursorY -= 4;

  const labelSize = 7.5;
  const sigLabel = "APPLICANT SIGNATURE";
  const sigLabelWidth = ctx.sansBold.widthOfTextAtSize(sigLabel, labelSize);
  ctx.page.drawText(sigLabel, {
    x: sigBoxX + (sigBoxWidth - sigLabelWidth) / 2,
    y: ctx.cursorY - labelSize,
    size: labelSize,
    font: ctx.sansBold,
    color: COLOR_MUTED,
  });

  const dateLabel = "DATE";
  const dateLabelWidth = ctx.sansBold.widthOfTextAtSize(dateLabel, labelSize);
  ctx.page.drawText(dateLabel, {
    x: dateBoxX + (dateBoxWidth - dateLabelWidth) / 2,
    y: ctx.cursorY - labelSize,
    size: labelSize,
    font: ctx.sansBold,
    color: COLOR_MUTED,
  });

  ctx.cursorY -= labelSize + 16;
}

export async function finalizeAndUpload(
  ctx: PdfContext,
  uploadsFolderId: string,
  fileName: string,
): Promise<string> {
  drawPageFooter(ctx);

  const pdfBytes = await ctx.doc.save();
  const drive = getDrive();

  const existing = await drive.files.list({
    q: [
      `'${uploadsFolderId}' in parents`,
      `name = '${fileName.replace(/'/g, "\\'")}'`,
      `trashed = false`,
    ].join(" and "),
    fields: "files(id)",
    pageSize: 1,
  });

  const stream = Readable.from(Buffer.from(pdfBytes));

  const existingId = existing.data.files?.[0]?.id;
  if (existingId) {
    const updated = await drive.files.update({
      fileId: existingId,
      media: { mimeType: "application/pdf", body: stream },
      fields: "id",
    });
    return updated.data.id!;
  }

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "application/pdf",
      parents: [uploadsFolderId],
    },
    media: { mimeType: "application/pdf", body: stream },
    fields: "id",
  });
  return created.data.id!;
}

export function formatDateLong(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function formatDateFromMMDDYYYY(value: string): string {
  if (!value) return "";
  const m = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return value;
  const [, mm, dd, yyyy] = m;
  const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function formatDateFromYYYYMMDD(value: string): string {
  if (!value) return "";
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return value;
  const [, yyyy, mm, dd] = m;
  const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function yesNoLabel(value: string): string {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return "";
}

export function lookupLabel<T extends readonly { value: string; label: string }[]>(
  options: T,
  value: string,
): string {
  const found = options.find((o) => o.value === value);
  return found ? found.label : value;
}
