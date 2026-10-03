const { Resend } = require("resend");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const LOGO_CONTENT_ID = "preacher-clan-logo";
const LOGO_PATH = path.join(__dirname, "..", "assets", "preacher-clan-logo.png");
const logoContent = readFileSync(LOGO_PATH);

const escapeHtml = (value) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

const prepareEmailContent = ({ html, text }) => {
  if (html) {
    const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    const body = bodyMatch ? bodyMatch[1] : html;

    return body
      .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<img\b[^>]*>/gi, "")
      .replace(/\s(?:class|style|bgcolor)=(".*?"|'.*?'|[^\s>]+)/gi, "")
      .replace(/<!doctype[^>]*>/gi, "")
      .replace(/<\/?(?:html|body)\b[^>]*>/gi, "")
      .trim();
  }

  return escapeHtml(text || "").replace(/\r?\n/g, "<br />");
};

const renderBrandedEmailHtml = ({ html, text }) => {
  const content = prepareEmailContent({ html, text });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
      body, table, td, p, div, span, a, h1, h2, h3, li, strong, b {
        font-family: 'Montserrat', Arial, sans-serif !important;
      }
      a { color: #f472b6 !important; }
      h1, h2, h3 { color: #ffffff !important; }
      p, li, div, span, strong, b { color: #e4e4e7 !important; }
      @media screen and (max-width: 640px) {
        .email-frame { width: 100% !important; }
        .email-content { padding: 24px 20px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#09090b;color:#e4e4e7;font-family:'Montserrat',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#09090b;">
      <tr>
        <td align="center" style="padding:32px 16px;background-color:#09090b;">
          <table class="email-frame" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border:1px solid #27272a;border-radius:16px;overflow:hidden;background-color:#18181b;">
            <tr>
              <td align="center" style="padding:24px;background-color:#09090b;border-bottom:1px solid #27272a;">
                <img src="cid:${LOGO_CONTENT_ID}" width="240" alt="Preacher Clan" style="display:block;width:240px;max-width:70%;height:auto;border:0;" />
              </td>
            </tr>
            <tr>
              <td class="email-content" style="padding:32px;background-color:#18181b;color:#e4e4e7;font-family:'Montserrat',Arial,sans-serif;font-size:15px;line-height:1.7;">
                ${content}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 24px;background-color:#09090b;border-top:1px solid #27272a;color:#a1a1aa;font-family:'Montserrat',Arial,sans-serif;font-size:12px;line-height:1.6;">
                Preacher Clan &mdash; Ek Rep Aur
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || process.env.EMAIL;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send email");
  }
  if (!from) {
    throw new Error("EMAIL_FROM is required to send email");
  }
  if (!to || !subject || (!html && !text)) {
    throw new Error("Email recipient, subject, and content are required");
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html: renderBrandedEmailHtml({ html, text }),
    ...(text ? { text } : {}),
    attachments: [{
      filename: "preacher-clan-logo.png",
      content: logoContent,
      contentType: "image/png",
      contentId: LOGO_CONTENT_ID,
    }],
  });

  if (error) {
    throw new Error(`Resend email failed: ${error.message}`);
  }

  return data;
};

module.exports = { sendEmail, renderBrandedEmailHtml };
