import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DARK     = [30, 30, 30]    as [number, number, number];
const GRAY     = [120, 120, 120] as [number, number, number];
const GOLDEN   = [184, 134, 11]  as [number, number, number];
const BEIGE_BG = [245, 240, 232] as [number, number, number];
const LIGHT_CR = [250, 250, 247] as [number, number, number];
const LINE_CLR = [210, 210, 210] as [number, number, number];

function fmtINR(n: number): string {
  return 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function todayDDMMYYYY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function generateCommercialInvoice(order: any): void {
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

  let y = 18;

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  doc.text('ELIOS WHOLESALE', M, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...GOLDEN);
  doc.text('COMMERCIAL INVOICE', pageW - M, y, { align: 'right' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('GSTIN: 27HRDPB0746K1ZR', M, y);

  y += 5;
  doc.text('Ph: 8591055209   |   Email: elioswholesale@gmail.com', M, y);

  y += 5;
  const address = 'GROUND FLOOR, C57, Maqsood Estate, CST Road, Taqdeer Masjid, Kismat Nagar, Mumbai, Maharashtra, 400070';
  const addrLines = doc.splitTextToSize(address, CW * 0.65);
  doc.text(addrLines, M, y);
  y += addrLines.length * 4.5;

  y += 3;
  hLine(y);
  y += 5;

  // ── META ROW (beige) ─────────────────────────────────────────────────────────
  const metaH = 14;
  doc.setFillColor(...BEIGE_BG);
  doc.rect(M, y, CW, metaH, 'F');

  const invoiceNo = order.orderId || order.orderNumber || order.id || '—';
  const colW      = CW / 3;
  const metaY1    = y + 4.5;
  const metaY2    = y + 9.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text('Invoice No.',   M + colW * 0 + 4, metaY1);
  doc.text('Date',          M + colW * 1 + 4, metaY1);
  doc.text('Order Status',  M + colW * 2 + 4, metaY1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(invoiceNo,         M + colW * 0 + 4, metaY2);
  doc.text(todayDDMMYYYY(),   M + colW * 1 + 4, metaY2);
  doc.text(String(order.status ?? '—'), M + colW * 2 + 4, metaY2);

  doc.setDrawColor(...LINE_CLR);
  doc.setLineWidth(0.3);
  doc.line(M + colW,     y, M + colW,     y + metaH);
  doc.line(M + colW * 2, y, M + colW * 2, y + metaH);

  y += metaH + 2;
  hLine(y);
  y += 5;

  // ── BILL TO ──────────────────────────────────────────────────────────────────
  const clientName = typeof order.client === 'string'
    ? order.client
    : (order.client?.name || order.client?.companyName || order.clientName || '—');
  const clientEmail   = order.client?.user?.email ?? order.client?.email ?? order.clientEmail ?? '';
  const clientPhone   = order.client?.user?.phone ?? order.client?.phone ?? order.clientPhone ?? '';
  const clientCompany = order.client?.companyName ?? order.clientCompany ?? '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text('Bill To', M + 2, y + 1);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK);
  doc.text(clientName, M + 2, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  if (clientEmail) { doc.text(`Email: ${clientEmail}`, M + 2, y); y += 4.5; }
  if (clientPhone) { doc.text(`Phone: ${clientPhone}`, M + 2, y); y += 4.5; }
  if (clientCompany) { doc.text(`Company: ${clientCompany}`, M + 2, y); y += 4.5; }

  y += 3;
  hLine(y);
  y += 5;

  // ── ITEMS TABLE ───────────────────────────────────────────────────────────────
  const rawItems: any[] = order.lineItems || order.items || order.orderItems || [];
  let totalAmount = 0;

  const tableBody = rawItems.map((item: any, i: number) => {
    const qty   = Number(item.qty ?? item.quantity ?? 0);
    const rate  = Number(item.unitPriceInr ?? item.unitPriceINR ?? 0);
    const total = Number(item.totalInr ?? item.totalINR ?? (qty * rate));
    totalAmount += total;
    const name = item.name || item.productName || item.product?.name || item.notes || '—';
    return [i + 1, name, qty, 'PCS', fmtINR(rate), fmtINR(total)];
  });

  autoTable(doc, {
    startY: y,
    head: [['Sr. No.', 'Product Name', 'Quantity', 'Unit', 'Unit Price (Rs.)', 'Total (Rs.)']],
    body: tableBody,
    theme: 'grid',
    tableWidth: 'auto',
    headStyles: {
      fillColor: BEIGE_BG,
      textColor: DARK,
      fontStyle: 'bold',
      fontSize: 8.5,
      lineColor: LINE_CLR,
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: LIGHT_CR },
    bodyStyles: {
      fontSize: 9,
      textColor: DARK,
      lineColor: LINE_CLR,
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 13, halign: 'center' },
      1: { cellWidth: 64 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 34, halign: 'right' },
      5: { cellWidth: 34, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable?.finalY ?? y + 30;
  y += 6;

  // ── SUMMARY ───────────────────────────────────────────────────────────────────
  const sumX = pageW - M - 80;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text('Subtotal:', sumX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  doc.text(fmtINR(totalAmount), pageW - M, y, { align: 'right' });

  y += 5;
  doc.setDrawColor(...LINE_CLR);
  doc.setLineWidth(0.3);
  doc.line(sumX, y, pageW - M, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text('Grand Total:', sumX, y);
  doc.text(fmtINR(totalAmount), pageW - M, y, { align: 'right' });

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  const footerY = pageH - 22;
  doc.setDrawColor(...GOLDEN);
  doc.setLineWidth(0.5);
  doc.line(M, footerY, pageW - M, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text('This is a Commercial Invoice generated by Elios Wholesale.', M, footerY + 5);
  doc.text('For GST Invoice, please refer to the separate GST Invoice document.', M, footerY + 9.5);

  doc.setFontSize(8);
  doc.text('Page 1', pageW - M, footerY + 5, { align: 'right' });

  doc.save(`Commercial-Invoice-${invoiceNo}.pdf`);
}
