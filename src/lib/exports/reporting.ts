import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join("; ") : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const csvRows = rows.map((row) =>
    headers.map((header) => escapeCsv(row[header])).join(",")
  );
  return [headers.join(","), ...csvRows].join("\n");
}

export function attachmentHeaders(contentType: string, filename: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}

export async function buildAnalyticsPdf(params: {
  title: string;
  subtitle: string;
  generatedAt: Date;
  rows: Record<string, unknown>[];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText(params.title, {
    x: 40,
    y: 760,
    size: 18,
    font: bold,
    color: rgb(0.07, 0.1, 0.18),
  });
  page.drawText(params.subtitle, {
    x: 40,
    y: 740,
    size: 10,
    font,
    color: rgb(0.33, 0.37, 0.44),
  });
  page.drawText(`Generated: ${params.generatedAt.toISOString()}`, {
    x: 40,
    y: 724,
    size: 9,
    font,
    color: rgb(0.45, 0.5, 0.58),
  });

  let y = 700;
  const maxRows = Math.min(params.rows.length, 28);
  const previewRows = params.rows.slice(0, maxRows);
  for (const row of previewRows) {
    const platform = String(row.platform ?? "unknown");
    const rate = Number(row.engagementRate ?? 0) * 100;
    const line = `${String(row.collectedAt ?? "")} | ${platform} | Impr ${Number(
      row.impressions ?? 0
    )} | Reach ${Number(row.reach ?? 0)} | ER ${rate.toFixed(2)}%`;
    page.drawText(line, {
      x: 40,
      y,
      size: 9,
      font,
      color: rgb(0.1, 0.14, 0.22),
    });
    y -= 18;
    if (y < 60) break;
  }

  if (params.rows.length > maxRows) {
    page.drawText(
      `Showing ${maxRows} of ${params.rows.length} rows in this PDF preview. Use CSV/JSON export for full data.`,
      {
        x: 40,
        y: 42,
        size: 9,
        font,
        color: rgb(0.5, 0.18, 0.18),
      }
    );
  }

  return await pdf.save();
}
