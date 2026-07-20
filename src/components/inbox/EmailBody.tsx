import { useMemo } from "react";
import DOMPurify from "dompurify";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function linkifyPlain(text: string): string {
  const escaped = escapeHtml(text);
  const withLinks = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline">${url}</a>`,
  );
  const withMailto = withLinks.replace(
    /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi,
    (e) => `<a href="mailto:${e}" class="text-primary underline">${e}</a>`,
  );
  return withMailto.replace(/\n/g, "<br />");
}

/**
 * Render an email body. Prefer sanitized HTML with clickable links.
 * Falls back to linkified plain text.
 */
export function EmailBody({ html, text }: { html?: string | null; text?: string | null }) {
  const sanitized = useMemo(() => {
    if (html && html.trim()) {
      const clean = DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ["target", "rel"],
        FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form"],
        FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover"],
      });
      // Force links open in new tab
      return clean.replace(/<a /gi, '<a target="_blank" rel="noopener noreferrer" ');
    }
    if (text) return linkifyPlain(text);
    return "<em class='text-muted-foreground'>No body available.</em>";
  }, [html, text]);

  return (
    <div
      className="email-body prose prose-sm max-w-none dark:prose-invert
                 [&_a]:text-primary [&_a]:underline
                 [&_img]:max-w-full [&_table]:max-w-full
                 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
