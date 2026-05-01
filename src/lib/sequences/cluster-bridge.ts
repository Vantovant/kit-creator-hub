/**
 * CLUSTER_BRIDGE — Parameterized 5-email / 8-day bridge for the Daily Range.
 * Used by IMMUNITY_BRIDGE, ENERGY_BRIDGE, DETOX_BRIDGE.
 *
 * Same RLX/NRM tone (educational, soft pitch on Day 8).
 * NO medical claims. NO buy link before Day 8.
 * All buy links MUST preserve ?ref={{ref_code}}.
 *
 * Cluster forms post `source = "{product}_bridge_section"` to /save-prospect.
 * The router maps source → cluster sequence_id; per-prospect ref_code is baked in by execute-sequence.
 */

const APP_BASE = "https://onlinecourseformlm.com";

export interface ClusterConfig {
  /** Cluster slug for sequence name, e.g. "Immunity" */
  cluster: string;
  /** PDF filename in /public/lead-magnets/ */
  pdfFilename: string;
  /** Display name of the PDF for email body, e.g. "5-Day Immunity Starter" */
  pdfDisplayName: string;
  /** Emoji used in subject lines */
  emoji: string;
  /** Day-2 question prompt body — the "What hits hardest?" line */
  day2Question: string;
  /** Day-2 four bullet options */
  day2Options: [string, string, string, string];
  /** Day-4 single educational tip — subject + blockquote tip */
  day4Subject: string;
  day4Lead: string;
  day4Tip: string;
  /** Day-6 social-proof story (single quote line) */
  day6Subject: string;
  day6Quote: string;
  day6Outcome: string;
  /** Day-8 soft pitch — products in the cluster */
  day8Products: Array<{ code: string; label: string; oneLiner: string }>;
}

export function buildClusterBridge(cfg: ClusterConfig) {
  const PDF_URL = `${APP_BASE}/lead-magnets/${cfg.pdfFilename}`;

  const productButtons = cfg.day8Products
    .map(
      (p) => `<p style="margin: 16px 0;">
  <a href="${APP_BASE}/shop/${p.code}?ref={{ref_code}}" style="display:inline-block; background:#1a3a8a; color:#fff; padding:12px 22px; border-radius:8px; text-decoration:none; font-weight:600;">🌿 ${p.label} — ${p.oneLiner}</a>
</p>`,
    )
    .join("\n");

  return [
    // DAY 1 — Deliver the PDF
    {
      type: "send_email" as const,
      subject: `Your ${cfg.pdfDisplayName} is here ${cfg.emoji}`,
      from_name: "Vanto Zazi",
      content: `<p>Hey {{first_name}},</p>
<p>Here's the free guide you asked for — <strong>${cfg.pdfDisplayName}</strong>. No supplements required.</p>
<p style="margin: 24px 0;">
  <a href="${PDF_URL}" style="display:inline-block; background:#1a3a8a; color:#fff; padding:14px 24px; border-radius:8px; text-decoration:none; font-weight:600;">📥 Download the ${cfg.cluster} Reset PDF</a>
</p>
<p>Tomorrow I'll ask you one quick question. No pitch.</p>
<p>— Vanto</p>`,
    },
    { type: "wait" as const, duration_hours: 24 },

    // DAY 2 — Reply-driven question
    {
      type: "send_email" as const,
      subject: `Quick question about your ${cfg.cluster.toLowerCase()}`,
      from_name: "Vanto Zazi",
      content: `<p>Hey {{first_name}},</p>
<p>Hope you had a chance to skim the guide. Quick one —</p>
<p><strong>${cfg.day2Question}</strong></p>
<ul>
  <li>${cfg.day2Options[0]}</li>
  <li>${cfg.day2Options[1]}</li>
  <li>${cfg.day2Options[2]}</li>
  <li>${cfg.day2Options[3]}</li>
</ul>
<p>Just hit reply and tell me. I read every one.</p>
<p>— Vanto</p>`,
    },
    { type: "wait" as const, duration_hours: 48 },

    // DAY 4 — One useful habit (pure value)
    {
      type: "send_email" as const,
      subject: cfg.day4Subject,
      from_name: "Vanto Zazi",
      content: `<p>Hey {{first_name}},</p>
<p>${cfg.day4Lead}</p>
<blockquote style="border-left:3px solid #1a3a8a; padding:8px 16px; margin:16px 0; background:#f7f8fc;">
  ${cfg.day4Tip}
</blockquote>
<p>Try it today and tomorrow. Let me know how it goes.</p>
<p>— Vanto</p>`,
    },
    { type: "wait" as const, duration_hours: 48 },

    // DAY 6 — Soft social proof
    {
      type: "send_email" as const,
      subject: cfg.day6Subject,
      from_name: "Vanto Zazi",
      content: `<p>Hey {{first_name}},</p>
<p>One reader tried the routine for a week. They told us:</p>
<blockquote style="border-left:3px solid #1a3a8a; padding:8px 16px; margin:16px 0; background:#f7f8fc; font-style:italic;">
  "${cfg.day6Quote}"
</blockquote>
<p>${cfg.day6Outcome}</p>
<p>If you want to go further, tomorrow I'll share the options some readers add on top.</p>
<p>— Vanto</p>`,
    },
    { type: "wait" as const, duration_hours: 48 },

    // DAY 8 — FIRST and ONLY soft pitch. Links MUST include ?ref={{ref_code}}
    {
      type: "send_email" as const,
      subject: "One more option (only if you want it)",
      from_name: "Vanto Zazi",
      content: `<p>Hey {{first_name}},</p>
<p>Some readers add a small lozenge from the APLGO ${cfg.cluster} family to their daily routine. Plant-based blends, not medication — just one more tool.</p>
<p>If you're curious, here are the options:</p>
${productButtons}
<p>If not, no problem — keep using the guide. Either way, <strong>look after yourself</strong>.</p>
<p>— Vanto</p>`,
    },
  ];
}

// ── Cluster definitions ──────────────────────────────────────────────

export const IMMUNITY_BRIDGE = buildClusterBridge({
  cluster: "Immunity",
  pdfFilename: "5-Day-Immunity-Starter-v1.pdf",
  pdfDisplayName: "5-Day Immunity Starter",
  emoji: "🛡️",
  day2Question: "What's been hitting you hardest lately?",
  day2Options: [
    "Catching every bug going around",
    "Feeling run-down even after rest",
    "Recovery taking longer than it used to",
    "Something else",
  ],
  day4Subject: "The 10-minute morning habit most people skip",
  day4Lead:
    "Most people try to fix immunity with supplements alone. The real foundation is what you do in the <strong>first 30 minutes of the day</strong>.",
  day4Tip:
    "<strong>Get 10 minutes of morning sunlight, before screens.</strong> Direct light on your eyes (no sunglasses) regulates cortisol and gives your immune system its strongest signal of the day.",
  day6Subject: "What Thandi did when she kept getting sick",
  day6Quote:
    "I'm not catching every cold in the office anymore — and when I do feel something, it passes in a day instead of a week.",
  day6Outcome: "That's the goal: a steadier baseline, not a quick fix.",
  day8Products: [
    { code: "grw", label: "GRW", oneLiner: "daily immune support" },
    { code: "gts", label: "GTS", oneLiner: "everyday wellness" },
  ],
});

export const ENERGY_BRIDGE = buildClusterBridge({
  cluster: "Energy",
  pdfFilename: "5-Day-Energy-and-Focus-Reset-v1.pdf",
  pdfDisplayName: "5-Day Energy & Focus Reset",
  emoji: "⚡",
  day2Question: "What hits you hardest in the day?",
  day2Options: [
    "Morning fog — hard to start",
    "2–3pm crash that wipes out the afternoon",
    "Mental fatigue by 5pm with hours of work left",
    "Something else",
  ],
  day4Subject: "The 2 PM crash isn't about coffee",
  day4Lead:
    "Most people try to fix the afternoon crash with more caffeine. The real lever is what you do <strong>between 11am and 1pm</strong>.",
  day4Tip:
    "<strong>Eat protein before carbs at lunch.</strong> Same plate — just protein and fibre first, starches last. Blunts the post-lunch insulin spike that causes the 2pm crash.",
  day6Subject: "How Sipho got his afternoons back",
  day6Quote:
    "I'm not relying on a 3pm coffee anymore — and I'm getting more done between 2 and 5 than I used to do all morning.",
  day6Outcome: "That's the goal: steady focus, not a chemical rollercoaster.",
  day8Products: [
    { code: "sld", label: "SLD", oneLiner: "natural energy & focus" },
    { code: "stp", label: "STP", oneLiner: "performance support" },
  ],
});

export const DETOX_BRIDGE = buildClusterBridge({
  cluster: "Detox",
  pdfFilename: "5-Day-Detox-and-Cleanse-v1.pdf",
  pdfDisplayName: "5-Day Detox & Cleanse",
  emoji: "🌿",
  day2Question: "What's been weighing you down?",
  day2Options: [
    "Bloating or heaviness after meals",
    "Sluggish digestion that throws off the day",
    "Skin or breath that says my system is overloaded",
    "Something else",
  ],
  day4Subject: "The cleanse trick most people get wrong",
  day4Lead:
    "Most people think a cleanse means cutting everything out. The real lever is <strong>what you add in the first hour of the day</strong>.",
  day4Tip:
    "<strong>500ml of warm water with lemon, before coffee.</strong> Wakes up the digestive tract gently, supports the liver's morning detox window, and cuts mid-morning bloat.",
  day6Subject: "What Lerato felt after one week",
  day6Quote:
    "I'm not bloated by lunchtime anymore — and my skin actually changed in 5 days.",
  day6Outcome:
    "That's the goal: a system that's clearing properly, every day — not a once-a-month reset.",
  day8Products: [
    { code: "pwr-lemon", label: "PWR Lemon", oneLiner: "daily cleanse & balance" },
    { code: "pwr-apricot", label: "PWR Apricot", oneLiner: "gentle detox support" },
  ],
});
