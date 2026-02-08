import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Plus,
  Trash2,
  Users,
  Clock,
  Trophy,
  ArrowRight,
  BarChart3,
  Send,
  Save,
  Loader2,
} from "lucide-react";

interface Variant {
  id: string;
  subject: string;
  previewText: string;
}

export default function ABTestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [variants, setVariants] = useState<Variant[]>([
    { id: "A", subject: "", previewText: "" },
    { id: "B", subject: "", previewText: "" },
  ]);
  const [testSettings, setTestSettings] = useState({
    testSize: 20,
    winningMetric: "opens",
    duration: 4,
  });
  const [content, setContent] = useState("");
  const [fromName, setFromName] = useState("Vanto Zazi");
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const addVariant = () => {
    const nextLetter = String.fromCharCode(65 + variants.length);
    if (variants.length < 5) {
      setVariants([...variants, { id: nextLetter, subject: "", previewText: "" }]);
    }
  };

  const removeVariant = (id: string) => {
    if (variants.length > 2) {
      setVariants(variants.filter((v) => v.id !== id));
    }
  };

  const updateVariant = (id: string, field: "subject" | "previewText", value: string) => {
    setVariants(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const testPercentPerVariant = Math.floor(testSettings.testSize / variants.length);
  const winnerPercent = 100 - testSettings.testSize;

  const saveDraft = async () => {
    if (!user) return;
    if (variants.some((v) => !v.subject.trim())) {
      setError("All variants need a subject line");
      return;
    }
    setSaving(true);
    setError("");

    const { error: insertError } = await supabase.from("ab_tests").insert({
      user_id: user.id,
      variants: variants as any,
      test_size_percent: testSettings.testSize,
      winning_metric: testSettings.winningMetric,
      duration_hours: testSettings.duration,
      status: "draft",
    });

    if (insertError) {
      setError("Failed to save: " + insertError.message);
    } else {
      setMessage("A/B test saved as draft!");
      setTimeout(() => navigate("/dashboard/broadcasts"), 1500);
    }
    setSaving(false);
  };

  const startTest = async () => {
    if (!user) return;
    if (variants.some((v) => !v.subject.trim())) {
      setError("All variants need a subject line");
      return;
    }
    if (!content.trim()) {
      setError("Email content is required");
      return;
    }
    if (!confirm("Start the A/B test? This will send emails to a subset of your subscribers.")) return;

    setStarting(true);
    setError("");

    // First create the A/B test record
    const { data: testData, error: insertError } = await supabase
      .from("ab_tests")
      .insert({
        user_id: user.id,
        variants: variants as any,
        test_size_percent: testSettings.testSize,
        winning_metric: testSettings.winningMetric,
        duration_hours: testSettings.duration,
        status: "draft",
      })
      .select("id")
      .single();

    if (insertError || !testData) {
      setError("Failed to create test: " + (insertError?.message || "Unknown error"));
      setStarting(false);
      return;
    }

    // Call edge function to start the test
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-ab-test`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: "start",
          ab_test_id: testData.id,
          broadcast_content: content,
          from_name: fromName,
        }),
      }
    );

    const result = await res.json();
    if (!res.ok) {
      setError(result.error || "Failed to start test");
    } else {
      setMessage("A/B test started! Results will be tracked automatically.");
      setTimeout(() => navigate("/dashboard/broadcasts"), 2000);
    }
    setStarting(false);
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="A/B Test"
        subtitle="Test different subject lines to optimize open rates"
      />

      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-primary">{message}</p>}

          {/* Info card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <FlaskConical className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">How A/B Testing Works</h2>
                  <p className="text-muted-foreground text-sm">
                    Create multiple subject line variants. We'll send each variant to a portion of your
                    audience, measure the results, and determine the winning version.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variants */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Subject Line Variants</CardTitle>
                {variants.length < 5 && (
                  <button type="button" onClick={addVariant} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Plus className="w-4 h-4" /> Add Variant
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {variants.map((variant, index) => (
                <div key={variant.id} className="p-4 border border-border rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                        {variant.id}
                      </div>
                      <span className="font-medium text-foreground">Variant {variant.id}</span>
                      {index === 0 && <Badge variant="outline" className="text-xs">Control</Badge>}
                    </div>
                    {variants.length > 2 && (
                      <button type="button" onClick={() => removeVariant(variant.id)} className="p-2 text-muted-foreground hover:text-destructive rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">Subject Line</Label>
                      <Input
                        value={variant.subject}
                        onChange={(e) => updateVariant(variant.id, "subject", e.target.value)}
                        placeholder={`Subject line for variant ${variant.id}...`}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{variant.subject.length}/60 characters</p>
                    </div>
                    <div>
                      <Label className="text-sm">Preview Text (optional)</Label>
                      <Input
                        value={variant.previewText}
                        onChange={(e) => updateVariant(variant.id, "previewText", e.target.value)}
                        placeholder="Preview text shown after subject..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Email content */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>From Name</Label>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Content (HTML, shared across all variants)</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`<h1>Hello {{first_name}}!</h1>\n<p>Your email content here...</p>`}
                  className="mt-1 min-h-[200px] font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Test settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Test Sample Size</Label>
                <p className="text-sm text-muted-foreground mb-3">Percentage of subscribers who will receive test variants</p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10" max="50" step="5"
                    value={testSettings.testSize}
                    onChange={(e) => setTestSettings({ ...testSettings, testSize: Number(e.target.value) })}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="w-16 text-center font-medium text-foreground">{testSettings.testSize}%</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {variants.map((v) => (
                    <div key={v.id} className="flex-1 text-center p-2 bg-primary/10 rounded-lg">
                      <p className="text-xs text-muted-foreground">Variant {v.id}</p>
                      <p className="font-semibold text-primary">{testPercentPerVariant}%</p>
                    </div>
                  ))}
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 text-center p-2 bg-green-500/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">Winner</p>
                    <p className="font-semibold text-green-600">{winnerPercent}%</p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Winning Metric</Label>
                <div className="flex gap-3 mt-3">
                  {[
                    { id: "opens", label: "Open Rate", icon: BarChart3 },
                    { id: "clicks", label: "Click Rate", icon: Trophy },
                  ].map((metric) => (
                    <button
                      key={metric.id}
                      type="button"
                      onClick={() => setTestSettings({ ...testSettings, winningMetric: metric.id })}
                      className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                        testSettings.winningMetric === metric.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <metric.icon className={`w-5 h-5 ${testSettings.winningMetric === metric.id ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`font-medium ${testSettings.winningMetric === metric.id ? "text-primary" : "text-muted-foreground"}`}>
                        {metric.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Test Duration</Label>
                <div className="flex gap-2 mt-3">
                  {[2, 4, 8, 12, 24].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setTestSettings({ ...testSettings, duration: hours })}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        testSettings.duration === hours
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-5 h-5" />
                    <span>{variants.length} variants</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-5 h-5" />
                    <span>{testSettings.duration}h duration</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BarChart3 className="w-5 h-5" />
                    <span>Winner by {testSettings.winningMetric}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={startTest}
                    disabled={starting}
                    className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Start A/B Test
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
