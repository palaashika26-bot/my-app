import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DARK     = [30, 30, 30]    as [number, number, number];
const GRAY     = [120, 120, 120] as [number, number, number];
const GOLDEN   = [184, 134, 11]  as [number, number, number];
const BEIGE_BG = [245, 240, 232] as [number, number, number];
const LIGHT_CR = [250, 250, 247] as [number, number, number];
const LINE_CLR = [210, 210, 210] as [number, number, number];

function todayDDMMYYYY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function generatePackingList(order: any): void {
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
  doc.text('PACKING LIST', pageW - M, y, { align: 'right' });

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

  const packingNo = order.orderId || order.orderNumber || order.id || '—';
  const colW      = CW / 3;
  const metaY1    = y + 4.5;
  const metaY2    = y + 9.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text('Packing List No.', M + colW * 0 + 4, metaY1);
  doc.text('Date',             M + colW * 1 + 4, metaY1);
  doc.text('Order Status',     M + colW * 2 + 4, metaY1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(packingNo,                       M + colW * 0 + 4, metaY2);
  doc.text(todayDDMMYYYY(),                 M + colW * 1 + 4, metaY2);
  doc.text(String(order.status ?? '—'),     M + colW * 2 + 4, metaY2);

  doc.setDrawColor(...LINE_CLR);
  doc.setLineWidth(0.3);
  doc.line(M + colW,     y, M + colW,     y + metaH);
  doc.line(M + colW * 2, y, M + colW * 2, y + metaH);

  y += metaH + 2;
  hLine(y);
  y += 5;

  // ── SHIP TO ───────────────────────────────────────────────────────────────────
  const clientName  = typeof order.client === 'string'
    ? order.client
    : (order.client?.name || order.client?.companyName || order.clientName || '—');
  const clientEmail = order.client?.user?.email ?? order.client?.email ?? order.clientEmail ?? '';
  const clientPhone = order.client?.user?.phone ?? order.client?.phone ?? order.clientPhone ?? '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text('Ship To', M + 2, y + 1);

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

  y += 3;
  hLine(y);
  y += 5;

  // ── PACKING TABLE ─────────────────────────────────────────────────────────────
  const rawItems: any[] = order.lineItems || order.items || order.orderItems || [];

  const tableBody = rawItems.map((item: any, i: number) => {
    const qty  = Number(item.qty ?? item.quantity ?? 0);
    const name = item.name || item.productName || item.product?.name || item.notes || '—';
    const sku  = item.sku ?? item.styleCode ?? item.product?.sku ?? '';
    return [i + 1, name, sku, qty, 'PCS', ''];
  });

  autoTable(doc, {
    startY: y,
    head: [['Sr. No.', 'Product Name', 'SKU / Style Code', 'Quantity', 'Unit', 'Remarks']],
    body: tableBody,
    theme: 'grid',
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
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 62 },
      2: { cellWidth: 36 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 32 },
    },
    margin: { left: M, right: M },
  });

  y = (doc as any).lastAutoTable?.finalY ?? y + 30;
  y += 12;

  // ── SIGN-OFF ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text('Packed by: ___________________________', M, y);
  doc.text('Checked by: ___________________________', M + 100, y);

  y += 10;
  doc.text('Date: ___________________________', M, y);

  // ── FOOTER ────────────────────────────────────────────────────────────────────
  const footerY = pageH - 16;
  doc.setDrawColor(...GOLDEN);
  doc.setLineWidth(0.5);
  doc.line(M, footerY, pageW - M, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Page 1', pageW - M, footerY + 5, { align: 'right' });

  doc.save(`Packing-List-${packingNo}.pdf`);
}
