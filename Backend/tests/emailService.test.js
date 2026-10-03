const assert = require("node:assert/strict");
const test = require("node:test");
const { renderBrandedEmailHtml } = require("../Utils/emailService");

test("wraps HTML fragments in the dark Preacher Clan email layout", () => {
  const rendered = renderBrandedEmailHtml({
    html: `
      <!doctype html>
      <html>
        <head><style>body { background: white; }</style></head>
        <body>
          <div class="container" style="background: #fff; color: #000">
            <img src="https://example.com/old-logo.png" alt="old logo" />
            <h2>Welcome</h2>
            <p>Glad you're here.</p>
          </div>
        </body>
      </html>
    `,
  });

  assert.match(rendered, /cid:preacher-clan-logo/);
  assert.match(rendered, /Montserrat/);
  assert.match(rendered, /background-color:#09090b/);
  assert.match(rendered, /background-color:#18181b/);
  assert.match(rendered, /<h2>Welcome<\/h2>/);
  assert.match(rendered, /Glad you're here\./);
  assert.doesNotMatch(rendered, /old-logo\.png|background: white|class="container"/);
});

test("formats text-only mail as escaped Montserrat HTML content", () => {
  const rendered = renderBrandedEmailHtml({
    text: "Hello <member>\nWelcome to Preacher Clan.",
  });

  assert.match(rendered, /Hello &lt;member&gt;<br \/>Welcome to Preacher Clan\./);
  assert.match(rendered, /cid:preacher-clan-logo/);
});
