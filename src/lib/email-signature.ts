// Professional email signature HTML template using Vanto Zazi branding

export const EMAIL_SIGNATURE_HTML = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; max-width: 500px; margin-top: 24px; border-top: 2px solid #5CC5DE; padding-top: 16px;">
  <tr>
    <td style="vertical-align: top; padding-right: 16px;">
      <img src="https://kit-clone-dashboard.lovable.app/assets/logo.jpg" alt="Vanto Zazi Mail" width="80" height="80" style="border-radius: 8px; display: block;" />
    </td>
    <td style="vertical-align: top;">
      <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold; color: #1a1a1a;">Vanto Zazi</p>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #5CC5DE; font-weight: 600;">Wellness Business Leader | APLGO</p>
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
            <a href="https://onlinecourseformlm.com" style="font-size: 13px; color: #5CC5DE; text-decoration: none; font-weight: 500;">onlinecourseformlm.com</a>
          </td>
        </tr>
      </table>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #999; font-style: italic;">"Empowering wellness entrepreneurs to build scalable income."</p>
    </td>
  </tr>
</table>
`;

/**
 * Returns the full email signature HTML ready for insertion into emails.
 * Includes unsubscribe link placeholder.
 */
export function getEmailWithSignature(bodyHtml: string, unsubscribeUrl?: string): string {
  const unsubBlock = unsubscribeUrl
    ? `<p style="font-size: 11px; color: #999; margin-top: 16px;">
        You're receiving this email because you registered in APLGO.
        <br/><a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
      </p>`
    : `<p style="font-size: 11px; color: #999; margin-top: 16px;">
        You're receiving this email because you registered in APLGO.
      </p>`;

  return `${bodyHtml}${EMAIL_SIGNATURE_HTML}${unsubBlock}`;
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
