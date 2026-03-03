import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, Zap, Users, Shield } from "lucide-react";

const SEQUENCE_NAME = "VantoOS Executive Beta — 12 Days / 12 Pages";

export default function VantoOSBetaForm() {
  const [sequenceId, setSequenceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function findSequence() {
      const { data } = await supabase
        .from("email_sequences")
        .select("id")
        .eq("name", SEQUENCE_NAME)
        .eq("status", "active")
        .maybeSingle();
      setSequenceId(data?.id || null);
      setLoading(false);
    }
    findSequence();
  }, []);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!firstName.trim()) {
      setErrorMsg("Please enter your first name.");
      return;
    }
    if (!email || !isValidEmail(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("loading");

    try {
      const { error } = await supabase.functions.invoke("save-prospect", {
        body: {
          email: email.trim().toLowerCase(),
          first_name: firstName.trim(),
          source: "vantoos_beta_form",
          sequence_id: sequenceId,
          tags: ["beta_20", "prominent_sa", "vantoos_exec_beta"],
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome to the Beta!</h1>
          <p className="text-gray-400 text-lg">
            Check your inbox — Day 1 is on its way. You're one of 20 leaders testing VantoOS.
          </p>
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-gray-500">
              Your 10-day journey starts now. One email per day. One page per day.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4 py-12">
      <div className="max-w-lg w-full space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium tracking-wide uppercase">
            <Shield className="w-3.5 h-3.5" />
            Private Beta — 20 Spots Only
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">
            VantoOS<br />
            <span className="text-indigo-400">Executive Beta</span>
          </h1>
          <p className="text-gray-400 text-base max-w-md mx-auto leading-relaxed">
            A private cohort of 20 prominent South Africans testing an AI-powered Executive Operating System. 
            10 days. 10 pages. Real work. Real feedback.
          </p>
        </div>

        {/* Value props */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Zap, label: "10-minute daily tasks", sub: "Prove value fast" },
            { icon: Users, label: "20 handpicked leaders", sub: "Elite feedback group" },
            { icon: Shield, label: "Shape the product", sub: "Your voice matters" },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
              <item.icon className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
              <p className="text-white text-sm font-medium">{item.label}</p>
              <p className="text-gray-500 text-xs">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-gray-300">First name *</Label>
            <Input
              id="firstName"
              placeholder="Your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={100}
              required
              disabled={status === "loading"}
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-gray-500 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
              disabled={status === "loading"}
              className="bg-white/[0.05] border-white/[0.1] text-white placeholder:text-gray-500 focus:border-indigo-500"
            />
          </div>

          {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === "loading" ? "Joining..." : "Join the Executive Beta"}
          </button>
        </form>

        <p className="text-xs text-center text-gray-600">
          By invitation only. No spam. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
