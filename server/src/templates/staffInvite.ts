export function staffInviteEmail(name: string, inviteLink: string): { subject: string; html: string } {
  return {
    subject: "You have been invited to join the Elios team",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Staff Invitation – Elios</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1D9E75;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">Elios Wholesale</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">China → India Sourcing Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:600;">You've been invited to join the team</h2>
              <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.6;">Hi ${name},</p>
              <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.6;">
                An administrator has added you as a staff member on Elios Wholesale.
                Click the button below to set your password and activate your account.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td align="center" style="border-radius:8px;background:#1D9E75;">
                    <a href="${inviteLink}"
                       style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Set Password &amp; Activate Account
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 28px;word-break:break-all;">
                <a href="${inviteLink}" style="color:#1D9E75;font-size:13px;">${inviteLink}</a>
              </p>
              <div style="background:#f9fafb;border-radius:8px;padding:16px;border:1px solid #e5e7eb;">
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                  ⏱ This link expires in <strong>24 hours</strong>. If you were not expecting this invitation, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
                Elios Wholesale · Your Bridge from China to India<br/>
                This is an automated email — please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}
