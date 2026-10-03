// Outbound link tagging for Google Analytics (added 2026-10-03, mirrors Get Well Hub's helper).
// Adds utm_source / utm_medium / utm_campaign to getwellafrica.com links only. Links that already
// carry any utm_ parameter are left alone. Every other domain (aplshop.com, backoffice, the
// unsubscribe page on kit-clone-dashboard.lovable.app) is untouched.
export interface UtmTags { source: string; medium: string; campaign: string }

const SITE_LINK = /https?:\/\/(?:www\.)?getwellafrica\.com(?![\w.-])[^\s<>"'`]*/gi;
const TRAILING = /[.,!?;:*_~)\]}]+$/;

function clean(value: string): string {
  const v = String(value || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  return v || "unknown";
}

export function tagSiteLinks(text: string, tags: UtmTags): string {
  if (!text || typeof text !== "string") return text;
  const qs = `utm_source=${clean(tags.source)}&utm_medium=${clean(tags.medium)}&utm_campaign=${clean(tags.campaign)}`;
  return text.replace(SITE_LINK, (raw) => {
    const trailMatch = raw.match(TRAILING);
    const trail = trailMatch ? trailMatch[0] : "";
    let url = trail ? raw.slice(0, raw.length - trail.length) : raw;
    if (/[?&](?:amp;)?utm_[a-z]+=/i.test(url)) return raw;
    const hashAt = url.indexOf("#");
    const hash = hashAt >= 0 ? url.slice(hashAt) : "";
    if (hashAt >= 0) url = url.slice(0, hashAt);
    url = url.replace(/^https?:\/\/(?:www\.)?getwellafrica\.com/i, "https://getwellafrica.com");
    if (url === "https://getwellafrica.com") url += "/";
    const sep = url.includes("?") ? (/[?&]$/.test(url) ? "" : "&") : "?";
    return `${url}${sep}${qs}${hash}${trail}`;
  });
}

/** Tag the html and text bodies of an email payload; returns a new object. */
export function tagEmailPayload<T extends Record<string, any>>(payload: T, medium: string, campaign: string): T {
  const tags = { source: "email", medium, campaign };
  const out: any = { ...payload };
  if (typeof out.html === "string") out.html = tagSiteLinks(out.html, tags);
  if (typeof out.text === "string") out.text = tagSiteLinks(out.text, tags);
  return out;
}
