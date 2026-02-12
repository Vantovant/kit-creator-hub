import type { PageContext } from "./ai-context";

export interface Guidance {
  title: string;
  message: string;
  actions: { label: string; href: string }[];
  whyItMatters?: string;
}

export function getGuidance(ctx: PageContext): Guidance {
  switch (ctx.page) {
    case "home":
      return getDashboardGuidance(ctx);
    case "subscribers":
      return getSubscriberGuidance(ctx);
    case "broadcasts":
      return getBroadcastGuidance(ctx);
    case "sequences":
      return getSequenceGuidance(ctx);
    case "analytics":
      return getAnalyticsGuidance(ctx);
    case "segments":
      return getSegmentGuidance(ctx);
    case "automations":
      return getAutomationGuidance(ctx);
    case "templates":
      return getTemplateGuidance(ctx);
    case "forms":
      return getFormsGuidance(ctx);
    default:
      return getDefaultGuidance(ctx);
  }
}

function getDashboardGuidance(ctx: PageContext): Guidance {
  if (ctx.subscriber_count === 0) {
    return {
      title: "🚀 Welcome! Let's get started",
      message: "Your first step is importing subscribers. Without an audience, nothing else matters.",
      actions: [
        { label: "Import Subscribers", href: "/dashboard/subscribers" },
        { label: "Create Welcome Form", href: "/dashboard/forms" },
      ],
      whyItMatters: "Every successful email business starts with building a list. Import your existing contacts or set up a form to capture new ones.",
    };
  }
  if (ctx.sent_broadcast_count === 0) {
    return {
      title: "📧 Send your first broadcast",
      message: `You have ${ctx.subscriber_count} subscribers waiting. Revenue requires sending. Create your first broadcast now.`,
      actions: [
        { label: "Create Broadcast", href: "/dashboard/broadcasts/new" },
      ],
      whyItMatters: "Your list loses 2-3% engagement every month you don't email them. The longer you wait, the colder your audience gets.",
    };
  }
  if (ctx.active_sequence_count === 0) {
    return {
      title: "⚡ Activate automation",
      message: "You're sending broadcasts but have no active sequences. You're leaving money on the table — automation works while you sleep.",
      actions: [
        { label: "Create Sequence", href: "/dashboard/sequences" },
        { label: "Set Up Automation", href: "/dashboard/automations" },
      ],
      whyItMatters: "Automated sequences generate 320% more revenue per email than one-off broadcasts. Set it once, earn forever.",
    };
  }
  const health = calculateHealthScore(ctx);
  return {
    title: `📊 Platform Health: ${health}/100`,
    message: health >= 80 ? "Your platform is running strong. Keep sending consistently." : "There's room to improve. Check suggestions below.",
    actions: [
      { label: "View Analytics", href: "/dashboard/analytics" },
      ...(ctx.segment_count === 0 ? [{ label: "Create Segment", href: "/dashboard/segments" }] : []),
    ],
    whyItMatters: `Health score breakdown: Subscribers (${Math.min(ctx.subscriber_count, 100) > 0 ? '✓' : '✗'}), Broadcasts sent (${ctx.sent_broadcast_count > 0 ? '✓' : '✗'}), Sequences active (${ctx.active_sequence_count > 0 ? '✓' : '✗'}), Tags configured (${ctx.has_tags ? '✓' : '✗'}).`,
  };
}

function getSubscriberGuidance(ctx: PageContext): Guidance {
  if (ctx.subscriber_count === 0) {
    return {
      title: "👥 Build your audience",
      message: "You have no subscribers yet.\n1. Import a CSV file\n2. Create a Welcome Form\n3. Add tag automation",
      actions: [
        { label: "Import CSV", href: "/dashboard/subscribers" },
        { label: "Welcome Form", href: "/dashboard/forms" },
      ],
      whyItMatters: "Without subscribers, your email platform has no purpose. Start with people you already know — import existing contacts.",
    };
  }
  if (!ctx.has_tags) {
    return {
      title: "🏷️ Organize with tags",
      message: `You have ${ctx.subscriber_count} subscribers but no tags. Tags help you segment and personalize your emails.`,
      actions: [
        { label: "Create Tags", href: "/dashboard/subscribers" },
      ],
      whyItMatters: "Segmented emails get 14% higher open rates. Tags are the foundation of smart email marketing.",
    };
  }
  return {
    title: "✅ Subscriber list is healthy",
    message: `${ctx.subscriber_count} active subscribers with ${ctx.tag_count} tags. Consider cleaning inactive users or creating segments.`,
    actions: [
      { label: "Create Segment", href: "/dashboard/segments" },
    ],
  };
}

function getBroadcastGuidance(ctx: PageContext): Guidance {
  if (ctx.subscriber_count === 0) {
    return {
      title: "⚠️ No audience yet",
      message: "You need subscribers before sending broadcasts. Import your contacts first.",
      actions: [{ label: "Import Subscribers", href: "/dashboard/subscribers" }],
    };
  }
  if (ctx.sent_broadcast_count === 0) {
    return {
      title: "📨 Send your first email",
      message: "Revenue requires sending. Your subscribers are waiting. Create a compelling broadcast now.",
      actions: [{ label: "New Broadcast", href: "/dashboard/broadcasts/new" }],
      whyItMatters: "The best subject lines are short (6-10 words), create curiosity, and speak to a specific benefit.",
    };
  }
  return {
    title: "📬 Keep the momentum",
    message: `${ctx.sent_broadcast_count} broadcasts sent. Open rate: ${ctx.open_rate}%. ${ctx.open_rate < 20 ? "Consider improving subject lines." : "Great engagement!"}`,
    actions: [{ label: "New Broadcast", href: "/dashboard/broadcasts/new" }],
    whyItMatters: "Consistency matters more than perfection. Aim for 1-3 emails per week. Sequences handle the rest.",
  };
}

function getSequenceGuidance(ctx: PageContext): Guidance {
  if (ctx.active_sequence_count === 0 && ctx.total_sequence_count === 0) {
    return {
      title: "🤖 No sequences yet",
      message: "You have no automation. Your list is idle. Create an activation sequence to engage subscribers automatically.",
      actions: [{ label: "Create Sequence", href: "/dashboard/sequences" }],
      whyItMatters: "Automated sequences deliver the right message at the right time. They work 24/7 without manual effort.",
    };
  }
  if (ctx.active_sequence_count === 0) {
    return {
      title: "⏸️ Sequences are paused",
      message: `You have ${ctx.total_sequence_count} sequence(s) but none are active. Activate one to start automating.`,
      actions: [{ label: "Manage Sequences", href: "/dashboard/sequences" }],
      whyItMatters: "A draft sequence doesn't generate results. Activate it to start converting subscribers into engaged users.",
    };
  }
  return {
    title: "✅ Automation is running",
    message: `${ctx.active_sequence_count} active sequence(s). Your subscribers are being nurtured automatically.`,
    actions: [{ label: "View Analytics", href: "/dashboard/analytics" }],
  };
}

function getAnalyticsGuidance(ctx: PageContext): Guidance {
  if (ctx.sent_broadcast_count === 0) {
    return {
      title: "📊 No data yet",
      message: "Send your first broadcast to see analytics here.",
      actions: [{ label: "Create Broadcast", href: "/dashboard/broadcasts/new" }],
    };
  }
  return {
    title: "📈 Understanding your metrics",
    message: `Open rate: ${ctx.open_rate}% ${ctx.open_rate >= 20 ? "(Good!)" : "(Below average — aim for 20%+)"}. Click rate: ${ctx.click_rate}% ${ctx.click_rate >= 3 ? "(Solid!)" : "(Try stronger CTAs)"}`,
    actions: [],
    whyItMatters: "A good open rate is 20-30%. Below 15% means your subject lines need work or your list needs cleaning. A bounce rate above 5% indicates list hygiene issues.",
  };
}

function getSegmentGuidance(ctx: PageContext): Guidance {
  if (ctx.segment_count === 0) {
    return {
      title: "🎯 Start segmenting",
      message: "Segments let you send targeted emails. Create your first segment based on engagement or tags.",
      actions: [{ label: "Create Segment", href: "/dashboard/segments" }],
      whyItMatters: "Segmented campaigns see 14% higher opens and 100% more clicks than non-segmented ones.",
    };
  }
  return {
    title: "✅ Segments configured",
    message: `You have ${ctx.segment_count} segment(s). Use them when sending broadcasts for better targeting.`,
    actions: [{ label: "New Broadcast", href: "/dashboard/broadcasts/new" }],
  };
}

function getAutomationGuidance(ctx: PageContext): Guidance {
  if (ctx.automation_count === 0) {
    return {
      title: "⚡ Set up automations",
      message: "Automations trigger sequences based on events like new signups or tag changes. Set one up to work on autopilot.",
      actions: [{ label: "Create Automation", href: "/dashboard/automations/builder" }],
      whyItMatters: "Automations ensure every subscriber gets the right content at the right time without manual intervention.",
    };
  }
  return {
    title: "✅ Automations active",
    message: `${ctx.automation_count} automation(s) configured. Your workflows are running.`,
    actions: [{ label: "View Sequences", href: "/dashboard/sequences" }],
  };
}

function getTemplateGuidance(ctx: PageContext): Guidance {
  return {
    title: "📄 Email Templates",
    message: "Templates save time. Create reusable designs for your broadcasts and sequences.",
    actions: [{ label: "Create Template", href: "/dashboard/templates" }],
    whyItMatters: "Consistent branding across emails builds trust. Templates ensure every email looks professional.",
  };
}

function getFormsGuidance(ctx: PageContext): Guidance {
  return {
    title: "📋 Capture Leads",
    message: "Share your welcome form to grow your subscriber list organically.",
    actions: [{ label: "View Form", href: "/forms/welcome" }],
    whyItMatters: "Forms are your primary subscriber growth engine. Embed them on your website or share the link directly.",
  };
}

function getDefaultGuidance(ctx: PageContext): Guidance {
  return {
    title: "💡 Need help?",
    message: "Use the navigation to explore your email platform. The assistant adapts to each page.",
    actions: [{ label: "Go to Dashboard", href: "/dashboard" }],
  };
}

function calculateHealthScore(ctx: PageContext): number {
  let score = 0;
  if (ctx.subscriber_count > 0) score += 20;
  if (ctx.subscriber_count >= 100) score += 10;
  if (ctx.sent_broadcast_count > 0) score += 20;
  if (ctx.active_sequence_count > 0) score += 20;
  if (ctx.has_tags) score += 10;
  if (ctx.segment_count > 0) score += 10;
  if (ctx.open_rate >= 20) score += 10;
  return Math.min(score, 100);
}
