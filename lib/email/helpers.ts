/**
 * Shared HTML helpers for email templates.
 *
 * Used by both drip (marketing) and transactional email templates.
 * Dark theme, inline styles for maximum email client compatibility.
 */

export const BASE_URL = 'https://airwaylab.app'

export function ctaButton(text: string, href: string): string {
  return `<div style="margin:24px 0;">
    <a href="${href}" style="display:inline-block;padding:10px 24px;background-color:#5eead4;color:#0a0a0b;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
      ${text}
    </a>
  </div>`
}

export function paragraph(text: string): string {
  return `<p style="font-size:14px;color:#a1a1aa;line-height:1.7;margin:0 0 16px 0;">${text}</p>`
}

export function heading(text: string): string {
  return `<h2 style="font-size:20px;color:#ffffff;font-weight:700;margin:0 0 16px 0;">${text}</h2>`
}

export function bulletList(items: string[]): string {
  const lis = items.map(
    (item) => `<li style="font-size:14px;color:#a1a1aa;line-height:1.7;margin-bottom:8px;">${item}</li>`
  ).join('')
  return `<ul style="margin:0 0 16px 0;padding-left:20px;">${lis}</ul>`
}

export function emailHeader(): string {
  return `<!-- Header -->
    <div style="margin-bottom:32px;">
      <span style="font-size:18px;font-weight:700;color:#ffffff;">
        <span style="color:#ffffff;">Airway</span><span style="color:#5eead4;font-weight:400;">Lab</span>
      </span>
    </div>`
}

export function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>AirwayLab</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    ${emailHeader()}

    <!-- Content -->
    ${content}

    <!-- Medical disclaimer -->
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #1e1e21;">
      <p style="font-size:10px;color:#52525b;line-height:1.5;margin:0;">
        AirwayLab is not a medical device. This email contains data summaries for informational purposes. Your clinician can help interpret these findings in the context of your care.
      </p>
    </div>
  </div>
</body>
</html>`
}
