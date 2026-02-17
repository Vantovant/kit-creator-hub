import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import logo from "@/assets/logo.jpg";

interface SequenceInfo {
  name: string;
  description: string | null;
}

export default function SequenceForm() {
  const { id } = useParams<{ id: string }>();
  const [sequence, setSequence] = useState<SequenceInfo | null>(null);
  const [loadingSeq, setLoadingSeq] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadSequence() {
      if (!id) { setNotFound(true); setLoadingSeq(false); return; }

      const { data, error } = await supabase
        .from("email_sequences")
        .select("name, description")
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setSequence(data);
      }
      setLoadingSeq(false);
    }
    loadSequence();
  }, [id]);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !isValidEmail(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("loading");

    try {
      const { error } = await supabase.functions.invoke("save-prospect", {
        body: {
          email: email.trim().toLowerCase(),
          first_name: firstName.trim() || null,
          source: "sequence_form",
          sequence_id: id,
        },
      });

      if (error) throw error;
      setStatus("success");
    } catch (err: any) {
      console.error("Submission error:", err);
      setErrorMsg(err?.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  if (loadingSeq) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Form Not Available</h1>
          <p className="text-muted-foreground">This form is no longer active or doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <CheckCircle className="w-16 h-16 text-primary mx-auto" />
          <h1 className="text-3xl font-bold text-foreground font-serif">You're In!</h1>
          <p className="text-muted-foreground text-lg">Check your inbox — your first email is on its way.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto mb-4">
            <img src={logo} alt="Vanto Zazi Mail" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-foreground font-serif">{sequence?.name}</h1>
          {sequence?.description && (
            <p className="text-muted-foreground">{sequence.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              placeholder="Your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={100}
              disabled={status === "loading"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
              disabled={status === "loading"}
            />
          </div>

          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === "loading" ? "Joining..." : "Join Now"}
          </button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          No spam. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
