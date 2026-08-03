# Add owner check to gmail-sync and gmail-send

Category: permissions / edge function hardening.

Both functions use the service-role client, so they bypass RLS. Today they load an `inbox_accounts` row by `account_id` and act on it without checking that the caller owns that mailbox. Fix: resolve the caller from the `Authorization` JWT and return 403 unless `account.user_id` matches.

Verified before planning:
- `gmail-sync` and `gmail-send` are absent from `supabase/config.toml`, so `verify_jwt` defaults to true — a valid user JWT is always present.
- All three call sites (`src/hooks/useInboxAccounts.ts`, `src/app/dashboard/settings/page.tsx`, `src/components/inbox/ReplyComposer.tsx`) use `supabase.functions.invoke`, which forwards the user's JWT — so no client changes needed.
- `gmail-sync` already has a `getRequestUser` helper (used by the `discover_accounts` branch). `gmail-send` does not and needs one added.

Nothing else changes: no behavior, response shape, or gateway logic is touched.

## Diff

`supabase/functions/gmail-sync/index.ts` — after the account fetch (currently line ~276):

```diff
   if (accountErr || !account) {
     return json({ error: "account_not_found", detail: accountErr?.message }, 404);
   }
 
+  // Ownership check: the caller must own this mailbox.
+  const requestUser = await getRequestUser(req, supabase);
+  if (!requestUser) return json({ error: "authentication_required" }, 401);
+  if (requestUser.id !== account.user_id) return json({ error: "forbidden" }, 403);
+
   let connectionKey: string;
```

`supabase/functions/gmail-send/index.ts` — add the helper above `Deno.serve`:

```diff
+async function getRequestUser(req: Request, supabase: any) {
+  const authHeader = req.headers.get("Authorization") || "";
+  const token = authHeader.replace(/^Bearer\s+/i, "");
+  if (!token) return null;
+  const { data, error } = await supabase.auth.getUser(token);
+  if (error) return null;
+  return data.user || null;
+}
+
 Deno.serve(async (req) => {
```

and after the account fetch (currently line ~133):

```diff
   const { data: account } = await supabase.from("inbox_accounts").select("*").eq("id", account_id).maybeSingle();
   if (!account) return json({ error: "account_not_found" }, 404);
 
+  // Ownership check: the caller must own this mailbox.
+  const sender = await getRequestUser(req, supabase);
+  if (!sender) return json({ error: "authentication_required" }, 401);
+  if (sender.id !== account.user_id) return json({ error: "forbidden" }, 403);
+
   let connectionKey: string;
```

## Note

If any server-side scheduler (cron / pg_net) invokes `gmail-sync` with a service-role key rather than a user JWT, that path would start returning 401. I have not confirmed such a caller exists; on approval I will check for one before deploying and, if found, exempt service-role calls explicitly rather than weakening the user check.
