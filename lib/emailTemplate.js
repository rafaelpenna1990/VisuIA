// Shared branded email wrapper — used by both the Marketing tab (bulk
// campaigns) and individual per-user emails, so a single edit here
// updates the look everywhere.
const APP_URL = process.env.APP_URL || 'https://www.visuia.ai';

export function emailHtml({ badge, headline, body, buttonText, buttonLink }) {
  // body may contain simple line breaks — turn each line into its own
  // paragraph so admin-typed text doesn't collapse into one run-on block.
  const bodyHtml = (body || '')
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p style="color:rgba(255,255,255,0.6);font-size:15px;line-height:1.6;margin:0 0 20px 0;">${line}</p>`)
    .join('');

  return `
  <div style="background:#080910;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#0F1119;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
      <div style="padding:32px 32px 0 32px;text-align:center;">
        <img src="${APP_URL}/api/assets/logo.png" alt="VisuIA" style="height:56px;width:auto;margin-bottom:24px;" />
      </div>
      <div style="padding:0 32px 32px 32px;">
        ${badge ? `<span style="display:inline-block;background:#FF9500;color:#000;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;padding:6px 14px;border-radius:999px;margin-bottom:16px;">${badge}</span>` : ''}
        <h1 style="color:#fff;font-size:24px;font-weight:900;margin:0 0 12px 0;line-height:1.3;">${headline || ''}</h1>
        ${bodyHtml}
        ${buttonText ? `
        <div style="text-align:center;margin-top:8px;">
          <a href="${buttonLink || APP_URL}"
             style="display:inline-block;background:#FF9500;color:#000;font-weight:800;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:14px;">
            ${buttonText}
          </a>
        </div>` : ''}
      </div>
      <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
        <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;">VisuIA — Feito no Brasil</p>
      </div>
    </div>
  </div>`;
}
