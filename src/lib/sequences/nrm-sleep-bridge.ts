/**
 * NRM_SLEEP_BRIDGE — 5 emails over 8 days.
 * Triggered by /shop/nrm lead form on onlinecourseformlm.com.
 * Lifestyle copy only. NO medical claims. NO buy link before Day 8.
 * All buy links MUST preserve ?ref={{ref_code}}.
 */
const PDF_URL = "https://onlinecourseformlm.com/lead-magnets/5-Day-Calm-and-Sleep-Reset-v1.pdf";
const SHOP_URL = "https://onlinecourseformlm.com/shop/nrm";

export const NRM_SLEEP_BRIDGE_SEQUENCE = [
  // DAY 1 — Deliver the PDF (no product, no pitch)
  {
    type: "send_email" as const,
    subject: "Your 5-Day Calm & Sleep Reset is here 🌙",
    from_name: "Vanto Zazi",
    content: `<p>Hey {{first_name}},</p>
<p>Here's the free guide you asked for — <strong>5 small habits to help your brain switch off at night</strong>. No supplements required.</p>
<p style="margin: 24px 0;">
  <a href="${PDF_URL}" style="display:inline-block; background:#1a3a8a; color:#fff; padding:14px 24px; border-radius:8px; text-decoration:none; font-weight:600;">📥 Download the Sleep Reset PDF</a>
</p>
<p>Tomorrow I'll ask you one quick question. No pitch.</p>
<p>Sleep well,<br/>— Vanto</p>`,
  },
  { type: "wait" as const, duration_hours: 24 },

  // DAY 2 — Reply-driven question
  {
    type: "send_email" as const,
    subject: "Quick question about your sleep",
    from_name: "Vanto Zazi",
    content: `<p>Hey {{first_name}},</p>
<p>Hope you had a chance to skim the guide. Quick one —</p>
<p><strong>What's the #1 thing keeping you from falling asleep right now?</strong></p>
<ul>
  <li>Racing thoughts</li>
  <li>Waking up at 3am</li>
  <li>Can't switch off after work</li>
  <li>Something else</li>
</ul>
<p>Just hit reply and tell me. I read every one.</p>
<p>— Vanto</p>`,
  },
  { type: "wait" as const, duration_hours: 48 },

  // DAY 4 — One useful habit (pure value)
  {
    type: "send_email" as const,
    subject: "The 90-minute window most people miss",
    from_name: "Vanto Zazi",
    content: `<p>Hey {{first_name}},</p>
<p>Most people try to fix sleep in the last 10 minutes of their day. The real window is the <strong>90 minutes BEFORE bed</strong>.</p>
<p>Here's one habit from the guide that works fastest:</p>
<blockquote style="border-left:3px solid #1a3a8a; padding:8px 16px; margin:16px 0; background:#f7f8fc;">
  <strong>Dim the lights at the 90-minute mark.</strong> Switch overhead lights off, use a single warm lamp. Your nervous system reads "darkness" as the signal to start producing melatonin — long before you actually lie down.
</blockquote>
<p>Try it tonight and tomorrow. Let me know how it goes.</p>
<p>— Vanto</p>`,
  },
  { type: "wait" as const, duration_hours: 48 },

  // DAY 6 — Story / soft proof, NO medical claims, sets up Day 8
  {
    type: "send_email" as const,
    subject: "What Sarah did when nothing else worked",
    from_name: "Vanto Zazi",
    content: `<p>Hey {{first_name}},</p>
<p>Sarah from Cape Town tried the wind-down routine for a week. She told us:</p>
<blockquote style="border-left:3px solid #1a3a8a; padding:8px 16px; margin:16px 0; background:#f7f8fc; font-style:italic;">
  "I'm not falling asleep faster — I'm <strong>staying</strong> asleep."
</blockquote>
<p>That's the goal: a calmer nervous system before bed.</p>
<p>If you want to go further, tomorrow I'll share one more option some readers add on top.</p>
<p>— Vanto</p>`,
  },
  { type: "wait" as const, duration_hours: 48 },

  // DAY 8 — FIRST and ONLY soft pitch. Link MUST include ?ref={{ref_code}}
  {
    type: "send_email" as const,
    subject: "One more option (only if you want it)",
    from_name: "Vanto Zazi",
    content: `<p>Hey {{first_name}},</p>
<p>Some readers add a small lozenge called <strong>NRM</strong> to their wind-down. It's a plant-based blend designed to support a calmer evening — not a sleeping pill, not a sedative. Just one more tool.</p>
<p>If you're curious, here's the page:</p>
<p style="margin: 24px 0;">
  <a href="${SHOP_URL}?ref={{ref_code}}" style="display:inline-block; background:#1a3a8a; color:#fff; padding:14px 24px; border-radius:8px; text-decoration:none; font-weight:600;">🌿 See NRM on the shop</a>
</p>
<p>If not, no problem — keep using the guide. Either way, <strong>sleep well</strong>.</p>
<p>— Vanto</p>`,
  },
];
