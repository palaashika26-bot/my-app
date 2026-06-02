import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Indian number-to-words ─────────────────────────────────────────────────────
const _ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const _tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function _convert(n: number): string {
  if (n === 0) return '';
  if (n < 20) return _ones[n];
  if (n < 100) return _tens[Math.floor(n / 10)] + (n % 10 ? ' ' + _ones[n % 10] : '');
  if (n < 1000) return _ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + _convert(n % 100) : '');
  if (n < 100000) return _convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + _convert(n % 1000) : '');
  if (n < 10000000) return _convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + _convert(n % 100000) : '');
  return _convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + _convert(n % 10000000) : '');
}

function amountToWords(amount: number): string {
  const n = Math.floor(amount);
  if (n === 0) return 'Zero Rupees';
  return _convert(n).trim() + ' Rupees';
}

function fmtINR(n: number): string {
  return 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Colours ───────────────────────────────────────────────────────────────────
const DARK     = [30, 30, 30]    as [number, number, number];
const GRAY     = [120, 120, 120] as [number, number, number];
const GOLDEN   = [184, 134, 11]  as [number, number, number];
const BEIGE_BG = [245, 240, 232] as [number, number, number];
const LIGHT_CR = [250, 250, 247] as [number, number, number];
const LINE_CLR = [210, 210, 210] as [number, number, number];

export interface GSTData {
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  clientGSTIN: string;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalGST: number;
  grandTotal: number;
}

export function generateGSTInvoice(order: any, gstData: GSTData): void {
  if (!order) return;

  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M     = 14;
  const CW    = pageW - M * 2;

  function hLine(y: number) {
    doc.setDrawColor(...LINE_CLR);
    doc.setLineWidth(0.3);
    doc.line(M, y, pageW - M, y);
  }

  // ── HEADER ─────────────────────────────────────────────────────────────────
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  doc.text('ELIOS WHOLESALE', M, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...GOLDEN);
  doc.text('GST INVOICE', pageW - M, y, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('GSTIN  27HRDPB0746K1ZR', M, y);

  y += 5;
  doc.text('Ph: 8591055209   Email: elioswholesale@gmail.com', M, y);

  y += 5;
  const address = 'GROUND FLOOR, C57, Maqsood Estate, CST Road, Taqdeer Masjid, Kismat Nagar, Mumbai, Maharashtra, 400070';
  const addrLines = doc.splitTextToSize(address, CW * 0.65);
  doc.text(addrLines, M, y);
  y += addrLines.length * 4.5;

  y += 3;
  hLine(y);
  y += 5;

  // ── INVOICE META ───────────────────────────────────────────────────────────
  const metaH = 14;
  doc.setFillColor(...BEIGE_BG);
  doc.rect(M, y, CW, metaH, 'F');

  const invoiceNo   = order.orderId || order.orderNumber || order.id || '—';
  const invoiceDate = order.date || (order.createdAt ? fmtDate(order.createdAt) : '—');
  const colW        = CW / 3;
  const metaY1      = y + 4.5;
  const metaY2      = y + 9.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text('Invoice No.', M + colW * 0 + 4, metaY1);
  doc.text('Invoice Date', M + colW * 1 + 4, metaY1);
  doc.text('Due Date',     M + colW * 2 + 4, metaY1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(invoiceNo,   M + colW * 0 + 4, metaY2);
  doc.text(invoiceDate, M + colW * 1 + 4, metaY2);
  doc.text(invoiceDate, M + colW * 2 + 4, metaY2);

  doc.setDrawColor(...LINE_CLR);
  doc.setLineWidth(0.3);
  doc.line(M + colW,     y, M + colW,     y + metaH);
  doc.line(M + colW * 2, y, M + colW * 2, y + metaH);

  y += metaH + 2;
  hLine(y);
  y += 5;

  // ── BILL TO / SHIP TO ──────────────────────────────────────────────────────
  const clientName = typeof order.client === 'string'
    ? order.client
    : (order.client?.name || order.client?.companyName || order.clientName || '—');
  const halfW = CW / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text('Bill To',  M + 2,         y + 1);
  doc.text('Ship To',  M + halfW + 4, y + 1);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK);
  doc.text(clientName, M + 2,         y);
  doc.text(clientName, M + halfW + 4, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);

  if (gstData.clientGSTIN) {
    doc.text(`GSTIN: ${gstData.clientGSTIN}`, M + 2, y);
    y += 4.5;
  }

  doc.text('Place of Supply: Maharashtra', M + 2,         y);
  doc.text('Place of Supply: Maharashtra', M + halfW + 4, y);

  y += 5;
  const billTopY = gstData.clientGSTIN ? y - 20.5 : y - 16;
  doc.setDrawColor(...LINE_CLR);
  doc.setLineWidth(0.3);
  doc.line(M + halfW, billTopY, M + halfW, y);

  hLine(y);
  y += 5;

  // ── ITEMS TABLE ────────────────────────────────────────────────────────────
  const rawItems: any[] = order.lineItems || order.items || order.orderItems || [];
  let totalQty = 0;

  const tableBody = rawItems.map((item: any, i: number) => {
    const qty   = Number(item.qty   ?? item.quantity  ?? 0);
    const rate  = Number(item.unitPriceInr ?? item.unitPriceINR ?? 0);
    const total = Number(item.totalInr ?? item.totalINR ?? qty * rate);
    totalQty += qty;
    const name = item.name || item.productName || item.product?.name || item.notes || '—';
    return [i + 1, name, qty + ' PCS', rate.toLocaleString('en-IN'), total.toLocaleString('en-IN')];
  });

  const subtotalRow = [
    { content: 'SUBTOTAL', colSpan: 2, styles: { fontStyle: 'bold' as const, fillColor: BEIGE_BG, textColor: DARK } },
    { content: totalQty + ' PCS', styles: { fontStyle: 'bold' as const, fillColor: BEIGE_BG, textColor: DARK } },
    { content: '', styles: { fillColor: BEIGE_BG } },
    { content: fmtINR(gstData.taxableAmount), styles: { fontStyle: 'bold' as const, halign: 'right' as const, fillColor: BEIGE_BG, textColor: DARK } },
  ];

  autoTable(doc, {
    startY: y,
    head: [['No', 'Items', 'Qty.', 'Rate', 'Taxable Amount']],
    body: tableBody,
    foot: [subtotalRow as any],
    theme: 'grid',
    headStyles: {
      fillColor: BEIGE_BG,
      textColor: DARK,
      fontStyle: 'bold',
      fontSize: 9,
      lineColor: LINE_CLR,
      lineWidth: 0.3,
    },
    footStyles: {
      fillColor: BEIGE_BG,
      textColor: DARK,
      fontSize: 9,
      lineColor: LINE_CLR,
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: LIGHT_CR },
    bodyStyles: {
      fontSize: 9,
      textColor: DARK,
      lineColor: LINE_CLR,
      lineWidth: 0.3,
      minCellHeight: 18,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 80, cellPadding: { left: 16, top: 2, right: 2, bottom: 2 } },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
    },
    didDrawCell: (data: any) => {
      if (data.column.index === 1 && data.row.section === 'body') {
        const item = rawItems[data.row.index];
        if (item?.imageUrl?.startsWith('data:image')) {
          const imgSize = 12;
          const x = data.cell.x + 2;
          const iy = data.cell.y + (data.cell.height - imgSize) / 2;
          const format = item.imageUrl.includes('image/jpeg') ? 'JPEG' : 'PNG';
          try { doc.addImage(item.imageUrl, format, x, iy, imgSize, imgSize); } catch {}
        }
      }
    },
    margin: { left: M, right: M },
  });

  y = (doc as any).lastAutoTable?.finalY ?? y + 30;
  y += 6;

  // ── GST SUMMARY TABLE ──────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Taxable Amount', 'Rate', 'Amount']],
    body: [
      ['CGST', fmtINR(gstData.taxableAmount), `${gstData.cgstRate}%`, fmtINR(gstData.cgstAmount)],
      ['SGST', fmtINR(gstData.taxableAmount), `${gstData.sgstRate}%`, fmtINR(gstData.sgstAmount)],
    ],
    foot: [[
      { content: 'Total GST', styles: { fontStyle: 'bold' as const, fillColor: BEIGE_BG, textColor: DARK } },
      { content: '', styles: { fillColor: BEIGE_BG } },
      { content: '', styles: { fillColor: BEIGE_BG } },
      { content: fmtINR(gstData.totalGST), styles: { fontStyle: 'bold' as const, halign: 'right' as const, fillColor: BEIGE_BG, textColor: DARK } },
    ]],
    theme: 'grid',
    headStyles: { fillColor: BEIGE_BG, textColor: DARK, fontStyle: 'bold', fontSize: 9, lineColor: LINE_CLR, lineWidth: 0.3 },
    footStyles: { fillColor: BEIGE_BG, textColor: DARK, fontSize: 9, lineColor: LINE_CLR, lineWidth: 0.3 },
    bodyStyles: { fontSize: 9, textColor: DARK, lineColor: LINE_CLR, lineWidth: 0.3 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: 'right' as const },
      2: { cellWidth: 22, halign: 'center' as const },
      3: { cellWidth: 35, halign: 'right' as const },
    },
    margin: { left: M, right: M },
  });

  y = (doc as any).lastAutoTable?.finalY ?? y + 20;
  y += 8;

  // ── GRAND TOTAL SECTION ────────────────────────────────────────────────────
  const totalX = M + halfW + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text('Taxable Amount:', totalX, y);
  doc.setTextColor(...DARK);
  doc.text(fmtINR(gstData.taxableAmount), pageW - M, y, { align: 'right' });

  y += 5.5;
  doc.setTextColor(...GRAY);
  doc.text('Total GST:', totalX, y);
  doc.setTextColor(...DARK);
  doc.text(fmtINR(gstData.totalGST), pageW - M, y, { align: 'right' });

  doc.setDrawColor(...LINE_CLR);
  doc.setLineWidth(0.3);
  doc.line(totalX, y + 3, pageW - M, y + 3);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text('Grand Total (incl. GST):', totalX, y);
  doc.text(fmtINR(gstData.grandTotal), pageW - M, y, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text('Amount in words:', totalX, y);
  y += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  const wordsLines = doc.splitTextToSize(amountToWords(gstData.grandTotal), halfW - 4);
  doc.text(wordsLines, totalX, y);

  // ── TERMS & CONDITIONS ─────────────────────────────────────────────────────
  y += wordsLines.length * 4.5 + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  doc.text('Terms & Conditions', M, y);

  const termLines = [
    '1. Goods once sold will not be taken back or exchanged.',
    '2. All disputes are subject to Mumbai jurisdiction only.',
  ];
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  termLines.forEach(line => {
    const wrapped = doc.splitTextToSize(line, halfW - 4);
    doc.text(wrapped, M, y);
    y += wrapped.length * 4;
  });

  // ── FOOTER BORDER ──────────────────────────────────────────────────────────
  doc.setDrawColor(...GOLDEN);
  doc.setLineWidth(0.8);
  doc.line(M, pageH - 12, pageW - M, pageH - 12);

  doc.save(`Elios-GST-Invoice-${order.orderId || order.id || 'draft'}.pdf`);
}
