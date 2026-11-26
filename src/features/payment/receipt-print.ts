import { FeeItem, FineItem, StudentReceiptData } from "./types";

export const formatReceiptDate = (raw?: string): string => {
  if (!raw) return "Verified on Record";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString();
};

export const formatShortReceiptDate = (raw?: string): string | null => {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString();
};

export const formatPaymentMethodLabel = (
  method: string,
  uppercase = false
): string => {
  const normalized = (method || "cash").trim().toLowerCase();
  if (normalized === "gcash") return uppercase ? "GCASH" : "GCash";
  if (normalized === "bank_transfer")
    return uppercase ? "BANK TRANSFER" : "Bank Transfer";
  if (normalized === "cash") return uppercase ? "CASH" : "Cash";
  return uppercase ? method.toUpperCase() : method;
};

export function deduplicateReceipts(
  fees: FeeItem[],
  fineItems: FineItem[]
): StudentReceiptData[] {
  const map = new Map<string, StudentReceiptData>();

  for (const fee of fees) {
    if (fee.paymentState === "verified" && fee.receipt) {
      map.set(fee.receipt.receiptId, fee.receipt);
    }
  }

  for (const fine of fineItems) {
    if (!fine.isArchived && fine.isPaid && !fine.isWaived && fine.receipt) {
      map.set(fine.receipt.receiptId, fine.receipt);
    }
  }

  return Array.from(map.values());
}

const SANS_FONT =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const candidate = `${currentLine} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

function loadImageElement(src: string, useAnonymousCors = false): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (useAnonymousCors) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadCorsSafeImage(url: string): Promise<HTMLImageElement | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/") ||
    (typeof window !== "undefined" && trimmed.startsWith(window.location.origin))
  ) {
    return loadImageElement(trimmed, false);
  }

  // Proxy remote storage URLs (e.g. Firebase Storage) through same-origin so
  // browser CORS headers on the bucket are not required and the canvas is not tainted.
  const proxiedUrl = `/api/student-dues?logoUrl=${encodeURIComponent(trimmed)}`;
  const proxiedImg = await loadImageElement(proxiedUrl, false);
  if (proxiedImg) return proxiedImg;

  return loadImageElement(trimmed, true);
}

function drawFallbackBuildingIcon(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  accentColor: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(46, 107, 78, 0.10)";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(46, 107, 78, 0.25)";
  ctx.stroke();

  // Simplified Building2 vector glyph centered in the badge
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const bx = centerX - 6;
  const by = centerY - 7;
  ctx.strokeRect(bx, by, 8, 14);
  ctx.strokeRect(bx + 8, by + 4, 5, 10);

  // Windows
  ctx.beginPath();
  ctx.moveTo(bx + 2.5, by + 3.5);
  ctx.lineTo(bx + 5.5, by + 3.5);
  ctx.moveTo(bx + 2.5, by + 6.5);
  ctx.lineTo(bx + 5.5, by + 6.5);
  ctx.moveTo(bx + 2.5, by + 9.5);
  ctx.lineTo(bx + 5.5, by + 9.5);
  ctx.stroke();
  ctx.restore();
}

export async function downloadReceiptAsPng(
  data: StudentReceiptData,
  includeLogo = true
): Promise<void> {
  const formattedDate = formatReceiptDate(data.date);
  const formattedMethod = formatPaymentMethodLabel(data.paymentMethod, true);
  const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const logoImage =
    includeLogo && data.orgLogoUrl ? await loadCorsSafeImage(data.orgLogoUrl) : null;

  const SCALE = 3;
  const CARD_WIDTH = 360;
  const OUTER_PADDING = 16;
  const INNER_PADDING = 24;
  const CONTENT_WIDTH = CARD_WIDTH - INNER_PADDING * 2;
  const CANVAS_WIDTH = CARD_WIDTH + OUTER_PADDING * 2;

  // Measure dynamic text heights on a scratch context first
  const measureCanvas = document.createElement("canvas");
  const mCtx = measureCanvas.getContext("2d");
  if (!mCtx) return;

  mCtx.font = `700 16px ${SANS_FONT}`;
  const orgNameLines = wrapTextLines(mCtx, data.orgName, CONTENT_WIDTH);

  mCtx.font = `600 14px ${SANS_FONT}`;
  const studentNameLines = wrapTextLines(mCtx, data.studentName, CONTENT_WIDTH);

  mCtx.font = `400 12px ${SANS_FONT}`;
  const itemLayouts = data.items.map((item) => {
    const amountStr = formatCurrency(item.amount);
    mCtx.font = `500 12px ${SANS_FONT}`;
    const amountWidth = mCtx.measureText(amountStr).width;
    const maxItemTextWidth = Math.max(120, CONTENT_WIDTH - amountWidth - 16);
    mCtx.font = `400 12px ${SANS_FONT}`;
    const lines = wrapTextLines(mCtx, `${item.name} (${item.type})`, maxItemTextWidth);
    return {
      lines,
      amountStr,
      height: Math.max(18, lines.length * 16),
    };
  });

  const itemsTotalHeight = itemLayouts.reduce((sum, l) => sum + l.height + 6, 0);

  const CARD_HEIGHT =
    INNER_PADDING + // top padding
    44 + // logo
    10 + // gap below logo
    orgNameLines.length * 20 + // org name
    4 +
    16 + // university
    2 +
    16 + // subtitle
    24 + // divider 1
    18 * 3 + // Receipt No, Date, Term
    24 + // divider 2
    16 + // RECEIVED FROM label
    studentNameLines.length * 18 + // student name
    18 + // student id
    24 + // divider 3
    18 + // ITEMS PAID label
    itemsTotalHeight + // items
    24 + // divider 4
    22 + // Total Paid row
    28 + // divider 5
    18 + // Payment Method
    18 + // Verified by
    22 + // gap before footer note
    16 + // footer note
    INNER_PADDING; // bottom padding

  const CANVAS_HEIGHT = CARD_HEIGHT + OUTER_PADDING * 2;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH * SCALE;
  canvas.height = CANVAS_HEIGHT * SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(SCALE, SCALE);

  // Outer backdrop
  ctx.fillStyle = "#f9fafb";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const cardX = OUTER_PADDING;
  const cardY = OUTER_PADDING;
  const leftX = cardX + INNER_PADDING;
  const rightX = cardX + CARD_WIDTH - INNER_PADDING;
  const centerX = cardX + CARD_WIDTH / 2;

  // Card background & border
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, CARD_WIDTH, CARD_HEIGHT, 12);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#e5e7eb";
  ctx.stroke();
  ctx.restore();

  let cursorY = cardY + INNER_PADDING;

  // 1. Logo / Fallback Icon
  const logoRadius = 22;
  const logoCenterY = cursorY + logoRadius;
  if (logoImage) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, logoCenterY, logoRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.clip();

    const iw = logoImage.naturalWidth || logoImage.width || 1;
    const ih = logoImage.naturalHeight || logoImage.height || 1;
    const cropSize = Math.min(iw, ih);
    const sx = (iw - cropSize) / 2;
    const sy = (ih - cropSize) / 2;

    ctx.drawImage(
      logoImage,
      sx,
      sy,
      cropSize,
      cropSize,
      centerX - logoRadius,
      cursorY,
      logoRadius * 2,
      logoRadius * 2
    );
    ctx.restore();
  } else {
    drawFallbackBuildingIcon(ctx, centerX, logoCenterY, logoRadius, "#2e6b4e");
  }

  cursorY += 44 + 10;

  // 2. Organization Name & Subtitle
  ctx.textBaseline = "top";
  ctx.textAlign = "center";
  ctx.fillStyle = "#000000";
  ctx.font = `700 16px ${SANS_FONT}`;
  for (const line of orgNameLines) {
    ctx.fillText(line, centerX, cursorY);
    cursorY += 20;
  }

  cursorY += 4;
  ctx.fillStyle = "#4b5563";
  ctx.font = `400 12px ${SANS_FONT}`;
  ctx.fillText("Visayas State University - Baybay Main Campus", centerX, cursorY);
  cursorY += 18;

  ctx.fillStyle = "#6b7280";
  ctx.font = `400 12px ${SANS_FONT}`;
  ctx.fillText("Official Payment Receipt", centerX, cursorY);
  cursorY += 16;

  const drawDivider = (spacing = 12) => {
    cursorY += spacing;
    ctx.beginPath();
    ctx.moveTo(leftX, cursorY);
    ctx.lineTo(rightX, cursorY);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#e5e7eb";
    ctx.stroke();
    cursorY += spacing;
  };

  drawDivider(12);

  // 3. Receipt Meta Rows
  const drawMetaRow = (label: string, value: string, isMonoBold = false) => {
    ctx.textAlign = "left";
    ctx.fillStyle = "#6b7280";
    ctx.font = `400 12px ${SANS_FONT}`;
    ctx.fillText(label, leftX, cursorY);

    ctx.textAlign = "right";
    ctx.fillStyle = "#000000";
    ctx.font = isMonoBold ? `600 12px ${MONO_FONT}` : `400 12px ${SANS_FONT}`;
    ctx.fillText(value, rightX, cursorY);
    cursorY += 18;
  };

  drawMetaRow("Receipt No.", data.receiptId, true);
  drawMetaRow("Date", formattedDate);
  drawMetaRow("Term", `${data.semester} Semester, A.Y. ${data.AY}`);

  drawDivider(12);

  // 4. Student Info
  ctx.textAlign = "left";
  ctx.fillStyle = "#6b7280";
  ctx.font = `500 11px ${SANS_FONT}`;
  ctx.fillText("RECEIVED FROM", leftX, cursorY);
  cursorY += 16;

  ctx.fillStyle = "#000000";
  ctx.font = `600 14px ${SANS_FONT}`;
  for (const line of studentNameLines) {
    ctx.fillText(line, leftX, cursorY);
    cursorY += 18;
  }

  ctx.fillStyle = "#4b5563";
  ctx.font = `400 12px ${MONO_FONT}`;
  ctx.fillText(data.studentId, leftX, cursorY);
  cursorY += 18;

  drawDivider(12);

  // 5. Items Paid
  ctx.textAlign = "left";
  ctx.fillStyle = "#6b7280";
  ctx.font = `500 11px ${SANS_FONT}`;
  ctx.fillText("ITEMS PAID", leftX, cursorY);
  cursorY += 18;

  for (const layout of itemLayouts) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#000000";
    ctx.font = `400 12px ${SANS_FONT}`;
    layout.lines.forEach((line, lineIdx) => {
      ctx.fillText(line, leftX, cursorY + lineIdx * 16);
    });

    ctx.textAlign = "right";
    ctx.fillStyle = "#000000";
    ctx.font = `500 12px ${SANS_FONT}`;
    ctx.fillText(layout.amountStr, rightX, cursorY);

    cursorY += layout.height + 6;
  }

  drawDivider(12);

  // 6. Total Paid
  ctx.textAlign = "left";
  ctx.fillStyle = "#000000";
  ctx.font = `700 16px ${SANS_FONT}`;
  ctx.fillText("Total Paid", leftX, cursorY);

  ctx.textAlign = "right";
  ctx.fillText(formatCurrency(data.total), rightX, cursorY);
  cursorY += 22;

  drawDivider(14);

  // 7. Footer
  ctx.textAlign = "center";
  ctx.fillStyle = "#4b5563";
  ctx.font = `400 12px ${SANS_FONT}`;
  ctx.fillText(`Payment Method: ${formattedMethod}`, centerX, cursorY);
  cursorY += 18;
  ctx.fillText(`Verified by ${data.verifiedByName}`, centerX, cursorY);
  cursorY += 18 + 20;

  ctx.fillStyle = "#6b7280";
  ctx.font = `400 11px ${SANS_FONT}`;
  ctx.fillText("This serves as an official proof of payment.", centerX, cursorY);

  // Trigger browser download as PNG
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png")
  );
  if (!blob) return;

  const safeReceiptId =
    data.receiptId.replace(/[^a-zA-Z0-9_-]/g, "_") || "receipt";
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `Receipt-${safeReceiptId}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
