import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: string;
  sections: ReportSection[];
}

export interface ReportSection {
  title: string;
  type: 'kpis' | 'table' | 'summary';
  kpis?: { label: string; value: string | number; change?: string }[];
  headers?: string[];
  rows?: (string | number)[][];
  text?: string;
}

// ---------------------------------------------------------------------------
// PDF Generator
// ---------------------------------------------------------------------------

export async function generatePDFReport(data: ReportData): Promise<Buffer> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(59, 130, 246); // blue-500
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('Versix Norma', 14, 16);
  doc.setFontSize(12);
  doc.text(data.title, 14, 26);

  // Subtitle / date
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text(`Gerado em: ${data.generatedAt}`, 14, 44);
  if (data.subtitle) {
    doc.text(data.subtitle, 14, 50);
  }

  let yPos = data.subtitle ? 58 : 52;

  for (const section of data.sections) {
    // Section title
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.text(section.title, 14, yPos);
    yPos += 8;

    if (section.type === 'kpis' && section.kpis) {
      doc.setFontSize(10);
      const colWidth = (pageWidth - 28) / Math.min(section.kpis.length, 4);
      section.kpis.forEach((kpi, i) => {
        const col = i % 4;
        if (i > 0 && col === 0) yPos += 20;
        const x = 14 + col * colWidth;
        doc.setTextColor(100, 100, 100);
        doc.text(kpi.label, x, yPos);
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(13);
        doc.text(String(kpi.value), x, yPos + 6);
        doc.setFontSize(10);
        if (kpi.change) {
          doc.setTextColor(
            kpi.change.startsWith('+') ? 34 : 239,
            kpi.change.startsWith('+') ? 197 : 68,
            kpi.change.startsWith('+') ? 94 : 68
          );
          doc.text(kpi.change, x, yPos + 12);
        }
      });
      yPos += 28;
    }

    if (section.type === 'table' && section.headers && section.rows) {
      autoTable(doc, {
        startY: yPos,
        head: [section.headers],
        body: section.rows.map((row) => row.map(String)),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 30;
    }

    if (section.type === 'summary' && section.text) {
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(section.text, pageWidth - 28);
      doc.text(lines, 14, yPos);
      yPos += lines.length * 5 + 8;
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Pagina ${i} de ${totalPages} | Versix Norma`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  return Buffer.from(doc.output('arraybuffer'));
}

// ---------------------------------------------------------------------------
// Excel Generator
// ---------------------------------------------------------------------------

export async function generateExcelReport(data: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Versix Norma';
  workbook.created = new Date();

  for (const section of data.sections) {
    const sheet = workbook.addWorksheet(section.title.substring(0, 31));

    // Title row
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = data.title;
    titleCell.font = { size: 14, bold: true, color: { argb: 'FF3B82F6' } };

    sheet.mergeCells('A2:F2');
    const dateCell = sheet.getCell('A2');
    dateCell.value = `Gerado em: ${data.generatedAt}`;
    dateCell.font = { size: 9, color: { argb: 'FF888888' } };

    let rowNum = 4;

    if (section.type === 'kpis' && section.kpis) {
      const labelRow = sheet.getRow(rowNum);
      const valueRow = sheet.getRow(rowNum + 1);
      section.kpis.forEach((kpi, i) => {
        const col = i + 1;
        labelRow.getCell(col).value = kpi.label;
        labelRow.getCell(col).font = { bold: true, color: { argb: 'FF666666' } };
        valueRow.getCell(col).value = kpi.value;
        valueRow.getCell(col).font = { size: 13, bold: true };
      });
      rowNum += 3;
    }

    if (section.type === 'table' && section.headers && section.rows) {
      // Header row
      const headerRow = sheet.getRow(rowNum);
      section.headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
      });
      rowNum++;

      // Data rows
      section.rows.forEach((row) => {
        const dataRow = sheet.getRow(rowNum);
        row.forEach((val, i) => {
          dataRow.getCell(i + 1).value = val;
        });
        rowNum++;
      });

      // Auto-width columns
      section.headers.forEach((_, i) => {
        const col = sheet.getColumn(i + 1);
        col.width = 18;
      });
    }

    if (section.type === 'summary' && section.text) {
      sheet.mergeCells(`A${rowNum}:F${rowNum + 2}`);
      const cell = sheet.getCell(`A${rowNum}`);
      cell.value = section.text;
      cell.alignment = { wrapText: true };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------
// CSV Generator
// ---------------------------------------------------------------------------

export async function generateCSVReport(data: ReportData): Promise<Buffer> {
  const lines: string[] = [];

  // BOM for Excel UTF-8 compatibility
  lines.push(`# ${data.title}`);
  lines.push(`# Gerado em: ${data.generatedAt}`);
  lines.push('');

  for (const section of data.sections) {
    lines.push(`## ${section.title}`);

    if (section.type === 'kpis' && section.kpis) {
      lines.push(section.kpis.map((k) => k.label).join(','));
      lines.push(section.kpis.map((k) => String(k.value)).join(','));
    }

    if (section.type === 'table' && section.headers && section.rows) {
      lines.push(section.headers.map(escapeCsvField).join(','));
      section.rows.forEach((row) => {
        lines.push(row.map((v) => escapeCsvField(String(v))).join(','));
      });
    }

    if (section.type === 'summary' && section.text) {
      lines.push(escapeCsvField(section.text));
    }

    lines.push('');
  }

  return Buffer.from('\uFEFF' + lines.join('\n'), 'utf-8');
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
