interface InquiryItemData {
  productName: string;
  type: string;
  quantity: number;
  unit: string;
  targetPricePerUnit?: string | null;
}

interface NewInquiryEmailOptions {
  inquiryNumber: string;
  clientName: string;
  companyName: string;
  clientEmail: string;
  itemCount: number;
  items: InquiryItemData[];
  notes?: string | null;
  dashboardUrl: string;
}

export function newInquiryEmailTemplate(opts: NewInquiryEmailOptions): string {
  const itemRows = opts.items
    .map(
      (item, i) => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 12px;color:#374151;font-size:14px;">${i + 1}.</td>
      <td style="padding:10px 12px;">
        <span style="font-weight:600;color:#111827;font-size:14px;">${item.productName}</span>
        <span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:600;background:${item.type === "CATALOG" ? "#dbeafe" : "#fef3c7"};color:${item.type === "CATALOG" ? "#1d4ed8" : "#92400e"};">${item.type}</span>
      </td>
      <td style="padding:10px 12px;color:#374151;font-size:14px;">${item.quantity} ${item.unit}</td>
      <td style="padding:10px 12px;color:#374151;font-size:14px;">${item.targetPricePerUnit ? `₹${item.targetPricePerUnit}/unit` : "—"}</td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Inquiry: ${opts.inquiryNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1D9E75;padding:28px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">New Sourcing Inquiry</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${opts.inquiryNumber} · ${opts.itemCount} product${opts.itemCount !== 1 ? "s" : ""}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px 24px;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Client</p>
              <p style="margin:0 0 2px;color:#111827;font-size:16px;font-weight:600;">${opts.companyName}</p>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">${opts.clientName} · ${opts.clientEmail}</p>

              <p style="margin:0 0 10px;color:#374151;font-size:14px;font-weight:600;">Requested Products</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">#</th>
                    <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Product</th>
                    <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Qty</th>
                    <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Target Price</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>

              ${
                opts.notes
                  ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
                <p style="margin:0 0 4px;color:#166534;font-size:12px;font-weight:600;text-transform:uppercase;">Client Notes</p>
                <p style="margin:0;color:#15803d;font-size:14px;line-height:1.5;">${opts.notes}</p>
              </div>`
                  : ""
              }

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="border-radius:8px;background:#1D9E75;">
                    <a href="${opts.dashboardUrl}"
                       style="display:inline-block;padding:13px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      View Inquiry in Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px 28px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
                Elios Wholesale · China → India Sourcing Platform<br/>
                This is an automated notification — please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
