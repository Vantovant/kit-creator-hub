import { EMAIL_SIGNATURE_HTML, EMAIL_HEADER_HTML, VANTOOS_HEADER_HTML, VANTOOS_SIGNATURE_HTML } from "@/lib/email-signature";
import DOMPurify from "dompurify";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

const sanitizeOpts = {
  ALLOWED_TAGS: ['table', 'tr', 'td', 'p', 'a', 'img', 'span', 'br', 'strong'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'width', 'height', 'style', 'cellpadding', 'cellspacing', 'border'],
};

function SignatureBlock({ title, headerHtml, signatureHtml, description }: {
  title: string; headerHtml: string; signatureHtml: string; description: string;
}) {
  const [copied, setCopied] = useState(false);
  const fullHtml = headerHtml + signatureHtml;

  const copy = () => {
    navigator.clipboard.writeText(fullHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button type="button" onClick={copy}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors">
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy HTML"}
          </button>
        </div>
        <div className="bg-background rounded-lg p-4 border border-border space-y-4">
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(headerHtml, sanitizeOpts) }} />
          <p style={{ color: "#666", fontSize: 13 }}>— email body here —</p>
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(signatureHtml, sanitizeOpts) }} />
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function EmailSignaturePreview() {
  return (
    <div className="space-y-6">
      <SignatureBlock
        title="APLGO — Email Branding"
        headerHtml={EMAIL_HEADER_HTML}
        signatureHtml={EMAIL_SIGNATURE_HTML}
        description="Used for all APLGO broadcasts, sequences, and automations."
      />
      <SignatureBlock
        title="VantoOS — Email Branding"
        headerHtml={VANTOOS_HEADER_HTML}
        signatureHtml={VANTOOS_SIGNATURE_HTML}
        description="Used for VantoOS Executive Beta and related communications."
      />
    </div>
  );
}