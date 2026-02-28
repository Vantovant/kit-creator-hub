import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function chunkText(text: string, maxChunkSize = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      // Keep overlap from end of previous chunk
      const words = current.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      current = overlapWords.join(" ") + " " + sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.filter(c => c.length > 20); // skip tiny chunks
}

function extractTextFromCSV(content: string): string {
  // Just join all CSV content as text
  return content.replace(/,/g, " ").replace(/"/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { source_id } = await req.json();
    if (!source_id) throw new Error("source_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceRoleKey);

    // Create ingestion job
    const { data: job } = await client.from("kb_ingestion_jobs").insert({
      source_id,
      status: "processing",
      started_at: new Date().toISOString(),
    }).select().single();

    const jobId = job?.id;

    // Get source info
    const { data: source, error: srcErr } = await client
      .from("kb_sources")
      .select("*")
      .eq("id", source_id)
      .single();

    if (srcErr || !source) {
      await client.from("kb_ingestion_jobs").update({ status: "failed", error: "Source not found" }).eq("id", jobId);
      throw new Error("Source not found");
    }

    // Update source status
    await client.from("kb_sources").update({ status: "processing" }).eq("id", source_id);

    // Download file from storage
    const { data: fileData, error: dlErr } = await client.storage
      .from("zazi_kb")
      .download(source.storage_path);

    if (dlErr || !fileData) {
      await client.from("kb_sources").update({ status: "failed" }).eq("id", source_id);
      await client.from("kb_ingestion_jobs").update({ status: "failed", error: "File download failed", finished_at: new Date().toISOString() }).eq("id", jobId);
      throw new Error("File download failed");
    }

    // Extract text based on file type
    let rawText = "";
    const mime = source.mime_type || "";
    const filename = source.filename.toLowerCase();

    if (mime.includes("text/plain") || filename.endsWith(".txt")) {
      rawText = await fileData.text();
    } else if (mime.includes("text/csv") || filename.endsWith(".csv")) {
      rawText = extractTextFromCSV(await fileData.text());
    } else if (mime.includes("pdf") || filename.endsWith(".pdf")) {
      // Basic PDF text extraction - extract readable text between stream markers
      const bytes = new Uint8Array(await fileData.arrayBuffer());
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const pdfText = decoder.decode(bytes);
      // Extract text between BT/ET markers or parentheses in PDF
      const textMatches = pdfText.match(/\(([^)]+)\)/g);
      if (textMatches) {
        rawText = textMatches.map(m => m.slice(1, -1)).join(" ");
      }
      // Fallback: just extract all printable ASCII
      if (rawText.length < 50) {
        rawText = pdfText.replace(/[^\x20-\x7E\n\r]/g, " ").replace(/\s+/g, " ");
      }
    } else {
      // Try as plain text for docx, etc.
      try {
        const text = await fileData.text();
        // For DOCX, extract text between XML tags
        if (filename.endsWith(".docx")) {
          rawText = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
        } else {
          rawText = text;
        }
      } catch {
        rawText = "";
      }
    }

    if (!rawText || rawText.trim().length < 10) {
      await client.from("kb_sources").update({ status: "failed" }).eq("id", source_id);
      await client.from("kb_ingestion_jobs").update({
        status: "failed",
        error: "Could not extract text from file. Try uploading as TXT or CSV.",
        finished_at: new Date().toISOString(),
      }).eq("id", jobId);
      return new Response(JSON.stringify({ error: "No extractable text" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean and sanitize text
    rawText = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();

    // Delete old chunks for this source (idempotent)
    await client.from("kb_chunks").delete().eq("source_id", source_id);

    // Chunk the text
    const chunks = chunkText(rawText);

    // Insert chunks
    const chunkRows = chunks.map((chunk, i) => ({
      source_id,
      chunk_text: chunk,
      chunk_index: i,
      metadata_json: { collection: source.collection, filename: source.filename },
    }));

    // Insert in batches of 50
    let totalCreated = 0;
    for (let i = 0; i < chunkRows.length; i += 50) {
      const batch = chunkRows.slice(i, i + 50);
      const { error: insertErr } = await client.from("kb_chunks").insert(batch);
      if (insertErr) {
        console.error("Chunk insert error:", insertErr);
      } else {
        totalCreated += batch.length;
      }
    }

    // Mark as ready
    await client.from("kb_sources").update({ status: "ready" }).eq("id", source_id);
    await client.from("kb_ingestion_jobs").update({
      status: "completed",
      chunks_created: totalCreated,
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);

    console.log(`Ingested ${source.filename}: ${totalCreated} chunks created`);

    return new Response(JSON.stringify({ success: true, chunks_created: totalCreated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kb-ingest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
