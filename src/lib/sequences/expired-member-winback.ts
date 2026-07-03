/**
 * 5-email Win-Back sequence for Expired Members.
 * Goal: re-engage distributors whose memberships have lapsed,
 * remind them of their achievements, and direct them to onlinecourseformlm.com.
 */
export const EXPIRED_MEMBER_WINBACK_SEQUENCE = [
  {
    type: "send_email" as const,
    subject: "We noticed you've been away, {{first_name}} 👋",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>It's been a while since you were active in our community — and I wanted to personally reach out.</p>
<p>Your membership may have expired, but <strong>your potential hasn't.</strong></p>
<p>A lot has changed since you were last active:</p>
<ul>
<li>🎓 New training modules and business tools</li>
<li>📈 Updated compensation structure</li>
<li>🤝 A growing support community</li>
<li>🧠 Free resources at <a href="https://getwellafrica.com">getwellafrica.com</a></li>
</ul>
<p>I'm not here to pressure you — just to let you know the door is still open.</p>
<p>Reply <strong>"Tell me more"</strong> and I'll bring you up to speed.</p>
<p>Warm regards,</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 48,
  },
  {
    type: "send_email" as const,
    subject: "You already did the hardest part",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>Most people never take the first step. <strong>You did.</strong></p>
<p>You activated your account. You ordered products. You started building. That takes courage — and it means something.</p>
<p>The truth is, many successful distributors in our network had a pause just like yours. What set them apart was coming back.</p>
<p>Here's what's waiting for you:</p>
<ul>
<li>✅ Your account history is preserved</li>
<li>✅ Your previous rank and achievements are on record</li>
<li>✅ Reactivation is simpler than starting from scratch</li>
<li>✅ Free business training at <a href="https://getwellafrica.com">getwellafrica.com</a></li>
</ul>
<p>If you're even slightly curious about picking up where you left off, reply <strong>"I'm curious"</strong> — no commitment needed.</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 48,
  },
  {
    type: "send_email" as const,
    subject: "What's new at Vanto Zazi (and why it matters for you)",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>Since you've been away, we've invested heavily in making success more accessible for every distributor.</p>
<p><strong>Here's what's new:</strong></p>
<ol>
<li><strong>Online Course for MLM</strong> — A complete training platform covering sales, recruitment, leadership, and personal branding. It's free for active distributors: <a href="https://getwellafrica.com">getwellafrica.com</a></li>
<li><strong>AI-Powered Support</strong> — Personalised guidance to help you grow your network smarter</li>
<li><strong>Stronger Community</strong> — Weekly team calls, mentorship matching, and recognition programmes</li>
<li><strong>Simplified Compensation</strong> — Clearer paths to earning at every rank</li>
</ol>
<p>The ecosystem has evolved — and it's designed to help people exactly like you succeed.</p>
<p>Take a look around: 👉 <a href="https://getwellafrica.com">getwellafrica.com</a></p>
<p>Reply <strong>"What's my next step?"</strong> and I'll create a personalised re-entry plan for you.</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 48,
  },
  {
    type: "send_email" as const,
    subject: "Your team still needs you, {{first_name}}",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>When you joined this business, you inspired people around you. Some of them are still watching to see what you'll do next.</p>
<p>Reactivating isn't just about products or commissions — it's about:</p>
<ul>
<li>💪 Showing resilience</li>
<li>🌱 Reigniting your personal growth</li>
<li>👥 Leading by example for your network</li>
<li>💰 Unlocking the income potential you originally saw</li>
</ul>
<p>The best part? You don't have to figure it out alone. Our entire training library is at your fingertips:</p>
<p>👉 <a href="https://getwellafrica.com">getwellafrica.com</a></p>
<p>I've helped dozens of expired members come back stronger. Let me do the same for you.</p>
<p>Reply <strong>"Let's reconnect"</strong> and I'll walk you through the reactivation process personally.</p>`,
  },
  {
    type: "wait" as const,
    duration_hours: 48,
  },
  {
    type: "send_email" as const,
    subject: "Last call: Should I close your file? 📋",
    from_name: "Vanto Zazi",
    content: `<p>Hi {{first_name}},</p>
<p>This is my final follow-up regarding your expired membership.</p>
<p>I genuinely believe in what we're building — but I also respect your time and your choices.</p>
<p><strong>Here's a quick summary of what you'd get by reactivating:</strong></p>
<ul>
<li>🔄 Restored account with your history intact</li>
<li>📚 Full access to <a href="https://getwellafrica.com">getwellafrica.com</a> training</li>
<li>💼 A clear, step-by-step plan to rebuild momentum</li>
<li>🤝 Personal mentorship from our leadership team</li>
</ul>
<p>If you'd like to come back, reply <strong>"Reactivate"</strong> — I'll handle everything for you.</p>
<p>If this chapter is closed, I completely understand. You can unsubscribe below and I wish you nothing but success in everything you pursue.</p>
<p>With respect and appreciation,</p>`,
  },
];
