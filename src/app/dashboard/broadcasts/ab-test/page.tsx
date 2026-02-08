// A/B test page

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Plus,
  Trash2,
  Users,
  Clock,
  Trophy,
  ArrowRight,
  Sparkles,
  BarChart3,
  Send,
  Save,
} from "lucide-react";

interface Variant {
  id: string;
  subject: string;
  previewText: string;
}

export default function ABTestPage() {
  const [variants, setVariants] = useState<Variant[]>([
    { id: "A", subject: "", previewText: "" },
    { id: "B", subject: "", previewText: "" },
  ]);
  const [testSettings, setTestSettings] = useState({
    testSize: 20,
    winningMetric: "opens",
    duration: 4,
  });

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        title="A/B Test"
        subtitle="Test different subject lines to optimize open rates"
      />

      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header info */}
          <Card className="bg-gradient-to-r from-[#5CC5DE]/10 to-[#7BC47F]/10 border-[#5CC5DE]/30 dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#5CC5DE]/20 rounded-xl">
                  <FlaskConical className="w-6 h-6 text-[#5CC5DE]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    How A/B Testing Works
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    Create multiple subject line variants. We'll send each variant to a portion of your
                    audience, measure the results, and automatically send the winning version to
                    everyone else.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variants */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg dark:text-gray-100">Subject Line Variants</CardTitle>
                {variants.length < 5 && (
                  <button
                    type="button"
                    onClick={addVariant}
                    className="flex items-center gap-2 text-sm text-[#5CC5DE] hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    Add Variant
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {variants.map((variant, index) => (
                <div
                  key={variant.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#5CC5DE] flex items-center justify-center text-black font-bold">
                        {variant.id}
                      </div>
                      <span className="font-medium dark:text-gray-100">Variant {variant.id}</span>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs">Control</Badge>
                      )}
                    </div>
                    {variants.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeVariant(variant.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm dark:text-gray-200">Subject Line</Label>
                      <Input
                        value={variant.subject}
                        onChange={(e) => updateVariant(variant.id, "subject", e.target.value)}
                        placeholder={`Enter subject line for variant ${variant.id}...`}
                        className="mt-1 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {variant.subject.length}/60 characters
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm dark:text-gray-200">Preview Text (optional)</Label>
                      <Input
                        value={variant.previewText}
                        onChange={(e) => updateVariant(variant.id, "previewText", e.target.value)}
                        placeholder="Preview text shown after subject..."
                        className="mt-1 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* AI suggestion */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-[#5CC5DE] hover:text-[#5CC5DE] transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                Generate AI Subject Line Suggestions
              </button>
            </CardContent>
          </Card>

          {/* Test settings */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg dark:text-gray-100">Test Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Test size */}
              <div>
                <Label className="dark:text-gray-200">Test Sample Size</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Percentage of subscribers who will receive test variants
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={testSettings.testSize}
                    onChange={(e) => setTestSettings({ ...testSettings, testSize: Number(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#5CC5DE]"
                  />
                  <span className="w-16 text-center font-medium dark:text-gray-100">
                    {testSettings.testSize}%
                  </span>
                </div>

                {/* Visual breakdown */}
                <div className="mt-4 flex items-center gap-2">
                  {variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex-1 text-center p-2 bg-[#5CC5DE]/10 rounded-lg"
                    >
                      <p className="text-xs text-gray-500 dark:text-gray-400">Variant {variant.id}</p>
                      <p className="font-semibold text-[#5CC5DE]">{testPercentPerVariant}%</p>
                    </div>
                  ))}
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 text-center p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Winner</p>
                    <p className="font-semibold text-green-600">{winnerPercent}%</p>
                  </div>
                </div>
              </div>

              {/* Winning metric */}
              <div>
                <Label className="dark:text-gray-200">Winning Metric</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  How we determine the winning variant
                </p>
                <div className="flex gap-3">
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
                          ? "border-[#5CC5DE] bg-[#5CC5DE]/5"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <metric.icon className={`w-5 h-5 ${
                        testSettings.winningMetric === metric.id ? "text-[#5CC5DE]" : "text-gray-400"
                      }`} />
                      <span className={`font-medium ${
                        testSettings.winningMetric === metric.id ? "text-[#5CC5DE]" : "text-gray-600 dark:text-gray-300"
                      }`}>
                        {metric.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Test duration */}
              <div>
                <Label className="dark:text-gray-200">Test Duration</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  How long to wait before declaring a winner
                </p>
                <div className="flex gap-2">
                  {[2, 4, 8, 12, 24].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => setTestSettings({ ...testSettings, duration: hours })}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        testSettings.duration === hours
                          ? "bg-[#5CC5DE] text-black"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Users className="w-5 h-5" />
                    <span>{variants.length} variants</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Clock className="w-5 h-5" />
                    <span>{testSettings.duration}h test duration</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <BarChart3 className="w-5 h-5" />
                    <span>Winner by {testSettings.winningMetric}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save Draft
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-6 py-2 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
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
