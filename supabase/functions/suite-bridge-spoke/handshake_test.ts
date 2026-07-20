import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const APP_KEY = "zazi_email";
const enc = new TextEncoder();

async function hmac(secret: string, msg: string) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("signed ping returns pong", async () => {
  const secret = Deno.env.get("SUITE_BRIDGE_SECRET")!;
  const url = "https://wwuenmmocxtwwgylngui.supabase.co/functions/v1/suite-bridge-spoke";
  const body = JSON.stringify({ kind: "ping" });
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const sig = await hmac(secret, `${ts}.${nonce}.${APP_KEY}.${body}`);
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bridge-app": "vantoos",
      "x-bridge-timestamp": ts,
      "x-bridge-nonce": nonce,
      "x-bridge-signature": sig,
    },
    body,
  });
  const txt = await r.text();
  console.log("status", r.status, "body", txt);
  assertEquals(r.status, 200);
  const j = JSON.parse(txt);
  assertEquals(j.kind, "pong");
});
