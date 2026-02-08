import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MailX, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "invalid">(
    token ? "loading" : "invalid"
  );

  useEffect(() => {
    if (!token) return;

    async function unsubscribe() {
      const { error } = await supabase
        .from("prospects")
        .update({ unsubscribed: true })
        .eq("unsubscribe_token", token!);

      if (error) {
        console.error("Unsubscribe error:", error);
        setStatus("error");
      } else {
        setStatus("success");
      }
    }

    unsubscribe();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
            <h1 className="text-2xl font-bold text-foreground font-serif">Unsubscribing…</h1>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold text-foreground font-serif">You've been unsubscribed</h1>
            <p className="text-muted-foreground">You won't receive any more emails from us.</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold text-foreground font-serif">Something went wrong</h1>
            <p className="text-muted-foreground">Please try again or contact support.</p>
          </>
        )}
        {status === "invalid" && (
          <>
            <MailX className="w-16 h-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold text-foreground font-serif">Invalid link</h1>
            <p className="text-muted-foreground">This unsubscribe link is not valid.</p>
          </>
        )}
      </div>
    </div>
  );
}
