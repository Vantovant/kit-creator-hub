import { useEffect, useMemo, useRef, useState } from "react";
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
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(520);

  const sanitizedHtml = useMemo(() => {
    if (!html?.trim()) return "";
    const clean = DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ["style"],
      ADD_ATTR: ["target", "rel", "style", "align", "bgcolor", "border", "cellpadding", "cellspacing", "height", "width", "valign"],
      FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
      FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover"],
    });
    return clean.replace(/<a /gi, '<a target="_blank" rel="noopener noreferrer" ');
  }, [html]);

  const sanitizedText = useMemo(() => {
    if (text) return linkifyPlain(text);
    return "<em class='text-muted-foreground'>No body available.</em>";
  }, [text]);

  const srcDoc = useMemo(() => {
    if (!html?.trim()) return "";
    return `<!doctype html>
<html>
  <head>
    <base target="_blank" />
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; background: #ffffff; color: #111827; }
      body { overflow-wrap: anywhere; }
      img { max-width: 100%; height: auto; }
      table { max-width: 100%; }
      a { color: #2563eb; }
    </style>
  </head>
  <body>${sanitizedHtml}</body>
</html>`;
  }, [html, sanitizedHtml]);

  useEffect(() => {
    if (!html?.trim()) return;
    const frame = frameRef.current;
    if (!frame) return;
    const resize = () => {
      const doc = frame.contentDocument;
      if (!doc) return;
      const nextHeight = Math.max(
        520,
        doc.documentElement.scrollHeight,
        doc.body?.scrollHeight || 0,
      );
      setHeight(Math.min(nextHeight + 24, 6000));
    };
    frame.addEventListener("load", resize);
    const timer = window.setTimeout(resize, 350);
    return () => {
      frame.removeEventListener("load", resize);
      window.clearTimeout(timer);
    };
  }, [html, srcDoc]);

  if (html?.trim()) {
    return (
      <iframe
        ref={frameRef}
        title="Email body"
        srcDoc={srcDoc}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        className="w-full rounded-md border bg-background"
        style={{ height }}
      />
    );
  }

  return (
    <div
      className="email-body prose prose-sm max-w-none dark:prose-invert
                 [&_a]:text-primary [&_a]:underline
                 [&_img]:max-w-full [&_table]:max-w-full
                 [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
      dangerouslySetInnerHTML={{ __html: sanitized }}
      dangerouslySetInnerHTML={{ __html: sanitizedText }}
    />
  );
}
