// Professional email signature HTML template using Vanto Zazi branding

export const EMAIL_SIGNATURE_HTML = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; max-width: 540px; margin-top: 24px; border-top: 2px solid #1a3a8a; padding-top: 16px;">
  <tr>
    <td style="vertical-align: top; padding-right: 16px;">
      <img src="https://kit-clone-dashboard.lovable.app/assets/logo-mlm.jpg" alt="Online Course For MLM" width="90" height="68" style="border-radius: 6px; display: block; object-fit: cover;" />
    </td>
    <td style="vertical-align: top;">
      <p style="margin: 0 0 2px 0; font-size: 16px; font-weight: bold; color: #1a1a1a;">Vanto Vanto</p>
      <p style="margin: 0 0 2px 0; font-size: 13px; color: #1a3a8a; font-weight: 600;">Founder — Vanto Zazi</p>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">Master AI. Recruit Smart. Grow Fast.</p>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right: 6px;">
            <span style="font-size: 12px; color: #666;">📧</span>
          </td>
          <td>
            <a href="mailto:vanto@onlinecourseformlm.com" style="font-size: 13px; color: #333; text-decoration: none;">vanto@onlinecourseformlm.com</a>
          </td>
        </tr>
        <tr>
          <td style="padding-right: 6px; padding-top: 4px;">
            <span style="font-size: 12px; color: #666;">🌐</span>
          </td>
          <td style="padding-top: 4px;">
            <a href="https://onlinecourseformlm.com" style="font-size: 13px; color: #1a3a8a; text-decoration: none; font-weight: 500;">onlinecourseformlm.com</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;

/**
 * Returns the full email signature HTML ready for insertion into emails.
 * Includes unsubscribe link placeholder.
 */
/**
 * APLGO header branding block — appears at the top of every outgoing email.
 */
export const EMAIL_HEADER_HTML = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; max-width: 540px; margin-bottom: 20px;">
  <tr>
    <td style="vertical-align: middle; padding-right: 10px;">
      <img src="https://kit-clone-dashboard.lovable.app/assets/aplgo-logo.png" alt="APLGO" width="48" height="48" style="display: block;" />
    </td>
    <td style="vertical-align: middle;">
      <p style="margin: 0; font-size: 14px; font-weight: 600; color: #333; line-height: 1.3;">Accredited Distributors<br/>of APLGO</p>
    </td>
  </tr>
</table>
`;

export function getEmailWithSignature(bodyHtml: string, unsubscribeUrl?: string): string {
  const unsubBlock = unsubscribeUrl
    ? `<p style="font-size: 11px; color: #999; margin-top: 16px;">
        You're receiving this email because you registered in APLGO.
        <br/><a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
      </p>`
    : `<p style="font-size: 11px; color: #999; margin-top: 16px;">
        You're receiving this email because you registered in APLGO.
      </p>`;

  return `${EMAIL_HEADER_HTML}${bodyHtml}${EMAIL_SIGNATURE_HTML}${unsubBlock}`;
}

/**
 * Pre-built 5-email re-engagement sequence for Registered_not_activated prospects
 */
export const REENGAGEMENT_SEQUENCE = [
  {
    type: "send_email" as const,
    subject: "Quick check-in 👋",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>A while ago, you registered to explore our wellness business opportunity.</p>
<p>Life gets busy — and sometimes timing just isn't right.</p>
<p>Before I continue sharing updates, I wanted to personally check:</p>
<p><strong>Are you still open to exploring this opportunity?</strong></p>
<p>If yes, simply reply <strong>"Interested."</strong></p>
<p>If not, you can unsubscribe below and I completely understand.</p>
<p>No pressure. Just clarity.</p>
<p>Wishing you success either way,</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 48,
  },
  {
    type: "send_email" as const,
    subject: "You didn't register by accident",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>When you created your account, something about this opportunity caught your attention.</p>
<p>Maybe it was:</p>
<ul>
<li>Extra income</li>
<li>A flexible business</li>
<li>Wellness products</li>
<li>Financial growth</li>
<li>Leadership development</li>
</ul>
<p>Since then, our ecosystem has expanded.</p>
<p>You can explore everything here:</p>
<p>👉 <a href="https://onlinecourseformlm.com">onlinecourseformlm.com</a></p>
<p>If your goals still include income growth, business ownership, or wellness-based entrepreneurship — then your account is still waiting for activation.</p>
<p>Reply <strong>"Let's talk"</strong> if you'd like clarity on next steps.</p>
<p>Warm regards,</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 48,
  },
  {
    type: "send_email" as const,
    subject: "This is bigger than just a product business",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>Many people think this is just a product company.</p>
<p><strong>It's not.</strong></p>
<p>It's an entire ecosystem built around:</p>
<ul>
<li>Personal development</li>
<li>Sales mastery</li>
<li>Network marketing systems</li>
<li>Compensation strategy</li>
<li>Leadership growth</li>
<li>Online branding education</li>
</ul>
<p>You can see the full business ecosystem here:</p>
<p>👉 <a href="https://onlinecourseformlm.com">onlinecourseformlm.com</a></p>
<p>If you're serious about building a structured income stream — this isn't a side hobby. It's a scalable model.</p>
<p>If you're still curious, reply <strong>"Info."</strong></p>
<p>If not, you can unsubscribe below — no hard feelings at all.</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 48,
  },
  {
    type: "send_email" as const,
    subject: "Timing matters",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>Sometimes it's not about interest — it's about timing.</p>
<p>If now isn't your season to build, I respect that.</p>
<p>But if you're:</p>
<ul>
<li>Tired of income limits</li>
<li>Looking for a structured system</li>
<li>Wanting mentorship</li>
<li>Ready for something different</li>
</ul>
<p>Then your unfinished registration could be your open door.</p>
<p>If you're no longer interested, please unsubscribe below so I don't disturb you again.</p>
<p>Either way, I appreciate the time you once gave this.</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 48,
  },
  {
    type: "send_email" as const,
    subject: "Should I close your file?",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>This will be my final follow-up regarding your inactive account.</p>
<p>I don't want to keep emailing you if this no longer aligns with your goals.</p>
<p>If you want to:</p>
<ul>
<li>✔ Activate</li>
<li>✔ Get clarity</li>
<li>✔ Revisit the business</li>
<li>✔ Understand the income structure</li>
</ul>
<p>Reply with <strong>"Activate."</strong></p>
<p>If not, you can unsubscribe below — and I genuinely wish you success in whatever you pursue.</p>
<p>Respectfully,</p>`,
  },
];

/**
 * Pre-built 5-email GO-Status Upgrade sequence for Activation_Only distributors.
 * Goal: encourage R375-only distributors to order 2 starter products and achieve GO-Status rank.
 */
export const GO_STATUS_UPGRADE_SEQUENCE = [
  {
    type: "send_email" as const,
    subject: "You're 1 step away from GO-Status 🚀",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>Congratulations on activating your APLGO distributor account! 🎉</p>
<p>You've already taken the biggest step — investing in yourself with the R375 activation.</p>
<p>But right now, your business is <strong>parked</strong>. You can't earn commissions or build a team until you reach <strong>GO-Status</strong>.</p>
<p><strong>What's GO-Status?</strong></p>
<p>It's simple: order your 2 starter products (R750+VAT) and your business goes LIVE.</p>
<ul>
<li>✅ Start earning commissions immediately</li>
<li>✅ Unlock your personal referral link</li>
<li>✅ Begin building your team</li>
<li>✅ Access the full compensation plan</li>
</ul>
<p>You've already paid the activation fee. Don't let that investment sit idle.</p>
<p>Reply <strong>"Ready"</strong> and I'll walk you through the product order.</p>
<p>Let's get you moving,</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 48,
  },
  {
    type: "send_email" as const,
    subject: "Why your starter products matter (it's not just about selling)",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>Some people think the 2 starter products are "just inventory."</p>
<p><strong>They're not.</strong></p>
<p>Your starter products serve 3 critical purposes:</p>
<ol>
<li><strong>Personal experience</strong> — You can't recommend what you haven't tried. Your own transformation story becomes your most powerful sales tool.</li>
<li><strong>Credibility</strong> — When you share results from personal use, people trust you. That trust converts to sales.</li>
<li><strong>GO-Status activation</strong> — Without this step, your entire business is on pause. No commissions, no team building, no growth.</li>
</ol>
<p>Think of it this way: you've already bought the ticket to the concert (R375 activation). Now you just need to walk through the door (starter products).</p>
<p>The most successful distributors in our network all started the same way — by using the products themselves first.</p>
<p>Ready to take that step? Reply <strong>"Let's go"</strong> and I'll send you the product options.</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 48,
  },
  {
    type: "send_email" as const,
    subject: "Meet {{first_name}} from 3 months from now",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>Imagine this scenario 3 months from today:</p>
<ul>
<li>🏆 You've reached GO-Status and your business is live</li>
<li>💰 You're earning your first commissions</li>
<li>👥 You've signed up 2-3 people in your own team</li>
<li>💪 You're using the products daily and feeling the difference</li>
<li>📱 People are asking YOU how to get started</li>
</ul>
<p>All of that starts with <strong>one decision today</strong>: ordering your starter products.</p>
<p>The R750+VAT investment pays for itself once you make your first sale — and with the APLGO compensation plan, that can happen in your first week.</p>
<p>I've seen it happen dozens of times with distributors just like you.</p>
<p>Don't let another month go by watching from the sidelines.</p>
<p>Reply <strong>"Show me the products"</strong> and let's make it happen.</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 48,
  },
  {
    type: "send_email" as const,
    subject: "The real cost of waiting",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>Every day without GO-Status is a day of missed opportunities:</p>
<ul>
<li>❌ Missed commissions from people who would have joined your team</li>
<li>❌ Missed bonuses from the compensation plan</li>
<li>❌ Missed personal health benefits from the products</li>
<li>❌ Missed momentum — the longer you wait, the harder it feels to start</li>
</ul>
<p>You've already invested R375. That money is working for nothing right now.</p>
<p>With GO-Status, it becomes the foundation of a real income stream.</p>
<p>I'm not here to pressure you — I'm here because I've seen what happens when people finally take this step. It changes everything.</p>
<p>If cost is a concern, reply <strong>"Budget"</strong> and I'll show you the most affordable way to get started.</p>
<p>If timing is the issue, reply <strong>"When"</strong> and we'll find the right moment together.</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 48,
  },
  {
    type: "send_email" as const,
    subject: "Final call: Your activation expires soon ⏰",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>This is my last email about upgrading to GO-Status.</p>
<p>I want to respect your time and your decision — whatever it may be.</p>
<p><strong>Here's where things stand:</strong></p>
<ul>
<li>Your R375 activation is active ✅</li>
<li>Your GO-Status is pending ⏳</li>
<li>Your business potential is untapped 📊</li>
</ul>
<p>If you're ready to move forward:</p>
<p>👉 Reply <strong>"Activate GO"</strong> — I'll personally guide you through the product order and get your business live within 24 hours.</p>
<p>If this isn't for you right now, I completely understand. You'll continue receiving our general wellness content, and the door is always open.</p>
<p>Either way, I appreciate your trust in joining our network.</p>
<p>To your success,</p>`,
  },
];

/**
 * Pre-built 5-email Product Reorder & Retention sequence for Has_GO_Status distributors.
 * Goal: encourage monthly reorders, share product tips, and maintain active distributor status.
 */
export const PRODUCT_RETENTION_SEQUENCE = [
  {
    type: "send_email" as const,
    subject: "Your first month as a GO-Status distributor 🎯",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>Welcome to the active side of the business! 🎉</p>
<p>Now that you've achieved GO-Status, you're part of an exclusive group of distributors who are actually <strong>building</strong>.</p>
<p>Here's your first-month checklist:</p>
<ul>
<li>✅ Use your products daily — consistency is key</li>
<li>✅ Track how you feel after 2 weeks (energy, sleep, focus)</li>
<li>✅ Share your experience with 3 people this week</li>
<li>✅ Set a reminder for your monthly reorder</li>
</ul>
<p>The most successful distributors in our network have one thing in common: <strong>they use the products themselves every single day.</strong></p>
<p>Your personal results become your most powerful marketing tool.</p>
<p>Reply <strong>"Tips"</strong> if you'd like product usage guides for maximum results.</p>
<p>Let's build together,</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 72,
  },
  {
    type: "send_email" as const,
    subject: "Why monthly reorders matter more than you think",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>Quick question: have you set up your monthly product reorder yet?</p>
<p>Here's why this matters:</p>
<ol>
<li><strong>Stay active</strong> — Your distributor status requires consistent monthly volume. Missing a month can reset your progress.</li>
<li><strong>Compound results</strong> — The health benefits of these products build over time. Stopping and starting reduces effectiveness.</li>
<li><strong>Lead by example</strong> — When your team sees you reordering consistently, they follow suit. That's how residual income grows.</li>
</ol>
<p>Think of your monthly reorder as an investment in three things:</p>
<ul>
<li>💪 Your health</li>
<li>💰 Your business</li>
<li>👥 Your team's confidence in you</li>
</ul>
<p>If you need help choosing which products to reorder, reply <strong>"Help me choose"</strong> and I'll send you my personal recommendations.</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 72,
  },
  {
    type: "send_email" as const,
    subject: "Product spotlight: what top distributors are ordering 🏆",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>I wanted to share something interesting with you.</p>
<p>I looked at what our <strong>top-performing distributors</strong> are ordering each month, and there's a clear pattern:</p>
<ul>
<li>🔄 They reorder the <strong>same core products</strong> every month for personal use</li>
<li>📦 They keep <strong>1-2 extra units</strong> for demonstrations and sampling</li>
<li>📊 They track their <strong>personal results</strong> and share them as testimonials</li>
</ul>
<p>The strategy is simple: <strong>be your own best customer.</strong></p>
<p>When someone asks "does this really work?" — you don't need to guess. You show them YOUR results.</p>
<p>That authenticity converts better than any sales pitch ever could.</p>
<p>Ready to place your next order? Reply <strong>"Order"</strong> and I'll walk you through it.</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 72,
  },
  {
    type: "send_email" as const,
    subject: "Don't let your momentum slip ⚡",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>I've seen it happen too many times:</p>
<p>A distributor reaches GO-Status, feels great about it… then gets busy and forgets to reorder. A month goes by. Then two. Suddenly they've lost their active status and have to rebuild.</p>
<p><strong>Don't let that be you.</strong></p>
<p>Here's a simple system to stay consistent:</p>
<ul>
<li>📅 Pick a specific date each month (e.g., the 1st or 15th)</li>
<li>⏰ Set a recurring calendar reminder</li>
<li>💳 Keep your preferred payment method ready</li>
<li>📝 Know your go-to products so ordering takes 5 minutes</li>
</ul>
<p>Consistency beats intensity. A small monthly reorder builds more long-term wealth than sporadic big orders.</p>
<p>If you're unsure about your reorder date or need help, reply <strong>"Remind me"</strong> and I'll help you set it up.</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 72,
  },
  {
    type: "send_email" as const,
    subject: "Your business is growing — here's the proof 📈",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>Take a moment to appreciate how far you've come:</p>
<ul>
<li>✅ You activated your account</li>
<li>✅ You ordered your starter products</li>
<li>✅ You achieved GO-Status</li>
<li>✅ You're building a real business</li>
</ul>
<p>Most people never get this far. You did.</p>
<p>Now the question is: <strong>what's your next milestone?</strong></p>
<p>Whether it's reaching the next rank, building your first team of 3, or hitting your first commission payout — the path forward is clear:</p>
<ol>
<li>Keep using and reordering your products monthly</li>
<li>Share your story with people who need it</li>
<li>Support your team members the way I'm supporting you</li>
</ol>
<p>I'm here whenever you need guidance. Just reply to any of my emails.</p>
<p>Proud to have you on the team,</p>`,
  },
];
