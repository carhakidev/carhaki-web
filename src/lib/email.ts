import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReportReadyEmail({
  to,
  name,
  vin,
  make,
  model,
  year,
  reportUrl,
  pdfBuffer,
}: {
  to: string;
  name: string;
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  reportUrl: string;
  pdfBuffer?: ArrayBuffer;
}) {
  const carName = [year, make, model].filter(Boolean).join(' ') || 'Your Vehicle';
  const firstName = name?.split(' ')[0] || 'there';

  const attachments = pdfBuffer
    ? [{
        filename: `CarHaki-Report-${vin}.pdf`,
        content: Buffer.from(pdfBuffer),
      }]
    : [];

  return resend.emails.send({
    from: 'CarHaki <reports@carhaki.com>',
    to,
    subject: `Your CarHaki Report is Ready — ${carName} (${vin})`,
    attachments,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:#1a56db;border-radius:16px 16px 0 0;padding:32px;text-align:center;">
              <img src="https://carhaki.com/logo-wide.png" alt="CarHaki" height="36" style="height:36px;">
              <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">Know the truth about every Tokunbo car</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;">
              <h1 style="color:#1e293b;font-size:22px;margin:0 0 8px;">Your Report is Ready! 🎉</h1>
              <p style="color:#64748b;margin:0 0 24px;">Hello ${firstName},</p>
              <p style="color:#475569;margin:0 0 24px;line-height:1.6;">
                Your CarHaki vehicle history report for the <strong>${carName}</strong> has been generated successfully.
                The full report is attached to this email as a PDF, and you can also view it online anytime.
              </p>

              <!-- VIN box -->
              <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin:0 0 24px;">
                <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Vehicle Checked</p>
                <p style="margin:0;font-size:18px;font-weight:700;color:#1e293b;font-family:monospace;">${vin}</p>
                <p style="margin:4px 0 0;font-size:14px;color:#475569;">${carName}</p>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;margin:0 0 24px;">
                <a href="${reportUrl}" style="display:inline-block;background:#1a56db;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:16px;">
                  View Full Report Online →
                </a>
              </div>

              <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">
                📎 Your report is also attached as a PDF — save it for your records.
              </p>
              <p style="color:#94a3b8;font-size:13px;margin:0;">
                Need help understanding your report? Join our WhatsApp channel or email us at 
                <a href="mailto:carhakisupport@gmail.com" style="color:#1a56db;">carhakisupport@gmail.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;border-radius:0 0 16px 16px;padding:24px;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0 0 8px;">
                © 2026 CarHaki Nigeria. All rights reserved.
              </p>
              <p style="color:#64748b;font-size:11px;margin:0;">
                Powered by USA government records (NMVTIS) via ClearVin
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
  });
}
