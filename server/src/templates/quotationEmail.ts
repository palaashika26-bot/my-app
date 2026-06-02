interface QuotationItem {
  productName: string;
  quantity: number;
  unit: string;
  unitPriceINR: number;
}

interface QuotationEmailOptions {
  clientName: string;
  requestNumber: string;
  requestId: string;
  items: QuotationItem[];
  totalINR: number;
  frontendUrl: string;
}

export function quotationEmailTemplate(opts: QuotationEmailOptions): string {
  const reviewUrl = `${opts.frontendUrl}/client-dashboard/requests/${opts.requestId}`;

  const itemRows = opts.items
    .map(
      (item) => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 12px;color:#374151;font-size:14px;">${item.productName}</td>
      <td style="padding:10px 12px;color:#374151;font-size:14px;text-align:center;">${item.quantity} ${item.unit}</td>
      <td style="padding:10px 12px;color:#374151;font-size:14px;text-align:right;">₹${item.unitPriceINR.toLocaleString("en-IN")}</td>
      <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;text-align:right;">₹${(item.unitPriceINR * item.quantity).toLocaleString("en-IN")}</td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quotation Ready: ${opts.requestNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1D9E75;padding:28px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Your Quotation is Ready</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${opts.requestNumber}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 24px;">
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
                Hi ${opts.clientName},<br/>
                Your sourcing request has been reviewed. Here is the quotation from our team:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Product</th>
                    <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Qty</th>
                    <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Unit Price (INR)</th>
                    <th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;">Total (INR)</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
                <tfoot>
                  <tr style="background:#f0fdf4;border-top:2px solid #bbf7d0;">
                    <td colspan="3" style="padding:12px;font-weight:700;color:#111827;font-size:15px;">Grand Total</td>
                    <td style="padding:12px;font-weight:700;color:#1D9E75;font-size:16px;text-align:right;">₹${opts.totalINR.toLocaleString("en-IN")}</td>
                  </tr>
                </tfoot>
              </table>

              <p style="margin:0 0 20px;color:#6b7280;font-size:13px;">This quote is valid for 7 days. Please review and respond in your dashboard.</p>

              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="border-radius:8px;background:#1D9E75;">
                    <a href="${reviewUrl}"
                       style="display:inline-block;padding:13px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Review &amp; Respond
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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
