import { EMAIL_SIGNATURE_HTML } from "@/lib/email-signature";
import DOMPurify from "dompurify";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function EmailSignaturePreview() {
  const [copied, setCopied] = useState(false);

  const copySignature = () => {
    navigator.clipboard.writeText(EMAIL_SIGNATURE_HTML);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Email Signature</h3>
          <button
            type="button"
            onClick={copySignature}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy HTML"}
          </button>
        </div>
        <div className="bg-background rounded-lg p-4 border border-border">
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(EMAIL_SIGNATURE_HTML, {
                ALLOWED_TAGS: ['table', 'tr', 'td', 'p', 'a', 'img', 'span', 'br', 'strong'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'width', 'height', 'style', 'cellpadding', 'cellspacing', 'border'],
              }),
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          This signature is automatically appended to all emails sent through automations and broadcasts.
        </p>
      </CardContent>
    </Card>
  );
}
