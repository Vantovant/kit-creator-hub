/**
 * NRM_GUT_BRIDGE — 5 emails over 8 days (3 silence days).
 * Triggered by /shop/nrm lead form on onlinecourseformlm.com (when NRM_BRIDGE re-enabled).
 * Digestion / sugar balance theme — matches NRM (the actual product).
 * Lifestyle copy only. NO medical claims. NO buy link before Day 8.
 * All buy links MUST preserve ?ref={{ref_code}}.
 */
const PDF_URL = "https://onlinecourseformlm.com/lead-magnets/5-Day-Sugar-and-Gut-Reset-v1.pdf";
const SHOP_URL = "https://onlinecourseformlm.com/shop/nrm";

export const NRM_GUT_BRIDGE_SEQUENCE = [
  // DAY 1 — Deliver the PDF
  {
    type: "send_email" as const,
    subject: "Your 5-Day Sugar & Gut Reset is here 🌿",
    from_name: "Vanto Zazi",
    content: `<p>Hey {{first_name}},</p>
<p>Here's the free guide you asked for — <strong>5 small daily resets for a calmer gut and steadier energy</strong>. No supplements required.</p>
<p style="margin: 24px 0;">
  <a href="${PDF_URL}" style="display:inline-block; background:#1a3a8a; color:#fff; padding:14px 24px; border-radius:8px; text-decoration:none; font-weight:600;">📥 Download the Sugar & Gut Reset PDF</a>
</p>
<p>Tomorrow I'll ask you one quick question. No pitch.</p>
<p>— Vanto</p>`,
  },
  { type: "wait" as const, duration_hours: 24 },

  // DAY 2 — Reply-driven question
  {
    type: "send_email" as const,
    subject: "Quick question about your energy",
    from_name: "Vanto Zazi",
    content: `<p>Hey {{first_name}},</p>
<p>Hope you had a chance to skim the guide. Quick one —</p>
<p><strong>What hits you hardest in the day?</strong></p>
<ul>
  <li>Afternoon sugar crash around 2–3pm</li>
  <li>Bloating or heaviness after meals</li>
  <li>Snack cravings between lunch and dinner</li>
  <li>Something else</li>
</ul>
<p>Just hit reply and tell me. I read every one.</p>
<p>— Vanto</p>`,
  },
  // Day 3 = silence
  { type: "wait" as const, duration_hours: 48 },

  // DAY 4 — Lifestyle tip
  {
    type: "send_email" as const,
    subject: "The 2 PM sugar-crash trick most people miss",
    from_name: "Vanto Zazi",
    content: `<p>Hey {{first_name}},</p>
<p>Most people blame the 2pm crash on lunch. The real culprit is usually <strong>what you ate first thing in the morning</strong>.</p>
<blockquote style="border-left:3px solid #1a3a8a; padding:8px 16px; margin:16px 0; background:#f7f8fc;">
  <strong>Eat protein first at breakfast.</strong> Even 15g (eggs, yoghurt, a protein shake) before any toast or cereal flattens the sugar curve for the next 6–8 hours. The 2pm crash quietly disappears.
</blockquote>
<p>Try it for two days. Watch what happens to the afternoon dip.</p>
<p>— Vanto</p>`,
  },
  // Day 5 = silence
  { type: "wait" as const, duration_hours: 48 },

  // DAY 6 — Soft proof / story (NO medical claims)
  {
    type: "send_email" as const,
    subject: "What 'a calm gut' actually feels like",
    from_name: "Vanto Zazi",
    content: `<p>Hey {{first_name}},</p>
<p>Thandi from Johannesburg ran the 5-day reset last month. She told us:</p>
<blockquote style="border-left:3px solid #1a3a8a; padding:8px 16px; margin:16px 0; background:#f7f8fc; font-style:italic;">
  "It's not a dramatic thing. I just stopped <strong>noticing</strong> my stomach after lunch. That's the part that surprised me."
</blockquote>
<p>That's the goal — a gut that gets quieter, not louder.</p>
<p>If you want to go further, tomorrow I'll share one more option some readers add on top.</p>
<p>— Vanto</p>`,
  },
  // Day 7 = silence
  { type: "wait" as const, duration_hours: 48 },

  // DAY 8 — FIRST and ONLY soft pitch
  {
    type: "send_email" as const,
    subject: "One small thing that helped me — the NRM lozenge",
    from_name: "Vanto Zazi",
    content: `<p>Hey {{first_name}},</p>
<p>Some readers add a small lozenge called <strong>NRM</strong> to their daily routine. It's a plant-based blend designed to support digestion and a steadier sugar response — not a medication, not a quick fix. Just one more tool that pairs well with the 5-day reset.</p>
<p>If you're curious, here's the page:</p>
<p style="margin: 24px 0;">
  <a href="${SHOP_URL}?ref={{ref_code}}" style="display:inline-block; background:#1a3a8a; color:#fff; padding:14px 24px; border-radius:8px; text-decoration:none; font-weight:600;">🌿 See NRM on the shop</a>
</p>
<p>If not, no problem — keep using the guide. Either way, <strong>eat well, feel calm</strong>.</p>
<p>— Vanto</p>`,
  },
];
