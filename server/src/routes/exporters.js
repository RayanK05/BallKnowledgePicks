// CSV and PDF builders shared by every export endpoint.
const PDFDocument = require('pdfkit');

// ---------- formatting ----------
function formatCell(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    // pg turns a DATE into local midnight; use local getters so the day never shifts
    const pad2 = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  return String(value);
}

function prettyHeader(col) {
  return col
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function safeFilename(name) {
  return name.replace(/[^a-z0-9_-]+/gi, '_');
}

// ---------- CSV (built by hand, RFC 4180 quoting) ----------
function csvEscape(value) {
  let s = formatCell(value);
  // Stop spreadsheet formula injection: a username like "=HYPERLINK(...)"
  // would otherwise run as a formula when the CSV is opened in Excel.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(columns, rows) {
  const lines = [columns.map(prettyHeader).map(csvEscape).join(',')];
  for (const row of rows) lines.push(columns.map((c) => csvEscape(row[c])).join(','));
  return lines.join('\r\n') + '\r\n';
}

function sendCsv(res, filename, columns, rows) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(filename)}.csv"`);
  // BOM so Excel opens UTF-8 names (accents etc.) correctly
  res.send('﻿' + toCsv(columns, rows));
}

// ---------- PDF (pdfkit) ----------
function sendPdf(res, filename, { title, description, columns, rows }) {
  const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(filename)}.pdf"`);
  doc.pipe(res);

  const left = doc.page.margins.left;
  const usable = doc.page.width - left - doc.page.margins.right;
  const bottom = doc.page.height - doc.page.margins.bottom;
  const colW = usable / Math.max(columns.length, 1);
  const pad = 4;
  const fontSize = 9;

  // Header block
  doc.font('Helvetica-Bold').fontSize(16).text(title, left, doc.y);
  if (description) doc.font('Helvetica').fontSize(10).fillColor('#555').text(description);
  doc
    .fontSize(8)
    .fillColor('#888')
    .text(`NBA Pick'em - exported ${new Date().toLocaleString('en-CA')} - ${rows.length} row(s)`);
  doc.moveDown(0.8).fillColor('#000');

  const rowHeight = (cells, font) => {
    doc.font(font).fontSize(fontSize);
    return (
      Math.max(...cells.map((c) => doc.heightOfString(c, { width: colW - pad * 2 })), fontSize) +
      pad * 2
    );
  };

  const drawRow = (cells, { header = false, shade = false } = {}) => {
    const font = header ? 'Helvetica-Bold' : 'Helvetica';
    const h = rowHeight(cells, font);
    if (doc.y + h > bottom) {
      doc.addPage();
      if (!header) drawRow(columns.map(prettyHeader), { header: true }); // repeat header
    }
    const y = doc.y;
    if (header) doc.rect(left, y, usable, h).fill('#1d428a');
    else if (shade) doc.rect(left, y, usable, h).fill('#f1f4f9');
    doc.font(font).fontSize(fontSize).fillColor(header ? '#fff' : '#000');
    cells.forEach((c, i) => {
      doc.text(c, left + i * colW + pad, y + pad, { width: colW - pad * 2 });
    });
    doc.moveTo(left, y + h).lineTo(left + usable, y + h).strokeColor('#d0d6e0').lineWidth(0.5).stroke();
    doc.x = left;
    doc.y = y + h;
  };

  drawRow(columns.map(prettyHeader), { header: true });
  if (rows.length === 0) {
    doc.moveDown().font('Helvetica-Oblique').fontSize(10).fillColor('#555').text('No rows.', left);
  }
  rows.forEach((r, i) => drawRow(columns.map((c) => formatCell(r[c])), { shade: i % 2 === 1 }));

  doc.end();
}

module.exports = { toCsv, sendCsv, sendPdf, formatCell };
