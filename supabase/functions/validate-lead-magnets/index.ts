// validate-lead-magnets: HEAD-checks every URL referenced in email_sequences.steps.
// Read-only. Returns per-sequence per-step URL status. Does not mutate anything.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SequenceStep {
  type: string;
  subject?: string;
  content?: string;
}

interface UrlCheck {
  url: string;
  status: number | null;
  ok: boolean;
  error?: string;
  ms: number;
}

interface StepResult {
  step_index: number;
  type: string;
  subject?: string;
  urls: UrlCheck[];
}

interface SequenceResult {
  id: string;
  name: string;
  brand: string;
  status: string;
  total_urls: number;
  broken_urls: number;
  steps: StepResult[];
}

const URL_REGEX = /https?:\/\/[^\s"'<>)]+/g;

function extractUrls(html: string): string[] {
  if (!html) return [];
  const raw = html.match(URL_REGEX) ?? [];
  // Strip trailing punctuation that often gets caught by the regex
  const cleaned = raw.map((u) => u.replace(/[.,;:!?)]+$/g, ""));
  // Deduplicate, skip mailto/tracking pixels
  return [...new Set(cleaned)].filter(
    (u) => !u.includes("{{") && !u.includes("mailto:")
  );
}

async function checkUrl(url: string): Promise<UrlCheck> {
  const start = Date.now();
  try {
    // Try HEAD first
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    // Some hosts (incl. Lovable static) reject HEAD — fall back to GET
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
      // Drain body to avoid resource leak
      try {
        await res.body?.cancel();
      } catch {
        /* noop */
      }
    }
    return {
      url,
      status: res.status,
      ok: res.status >= 200 && res.status < 400,
      ms: Date.now() - start,
    };
  } catch (e) {
    return {
      url,
      status: null,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - start,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Optional filter: ?sequence_name=RLX or ?sequence_id=...
    const url = new URL(req.url);
    const filterName = url.searchParams.get("sequence_name");
    const filterId = url.searchParams.get("sequence_id");

    let query = supabase
      .from("email_sequences")
      .select("id, name, brand, status, steps");
    if (filterId) query = query.eq("id", filterId);
    if (filterName) query = query.ilike("name", `%${filterName}%`);

    const { data: sequences, error } = await query;
    if (error) throw error;

    const results: SequenceResult[] = [];

    for (const seq of sequences ?? []) {
      const steps = (seq.steps as SequenceStep[]) ?? [];
      const stepResults: StepResult[] = [];
      let totalUrls = 0;
      let brokenUrls = 0;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.type !== "send_email" || !step.content) continue;
        const urls = extractUrls(step.content);
        if (urls.length === 0) continue;

        // Check URLs in parallel per step (capped concurrency by step size)
        const checks = await Promise.all(urls.map(checkUrl));
        totalUrls += checks.length;
        brokenUrls += checks.filter((c) => !c.ok).length;
        stepResults.push({
          step_index: i,
          type: step.type,
          subject: step.subject,
          urls: checks,
        });
      }

      results.push({
        id: seq.id,
        name: seq.name,
        brand: seq.brand,
        status: seq.status,
        total_urls: totalUrls,
        broken_urls: brokenUrls,
        steps: stepResults,
      });
    }

    return new Response(
      JSON.stringify({
        checked_at: new Date().toISOString(),
        sequence_count: results.length,
        total_urls: results.reduce((s, r) => s + r.total_urls, 0),
        broken_urls: results.reduce((s, r) => s + r.broken_urls, 0),
        sequences: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
