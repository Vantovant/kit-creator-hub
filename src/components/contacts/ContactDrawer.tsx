import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Save, Trash2, Sparkles, AlertTriangle, Loader2, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
const toast = {
  success: (msg: string) => console.log("✓", msg),
  error: (msg: string) => { console.error("✗", msg); if (typeof window !== "undefined") window.alert(msg); },
};

type Stage = { id: string; name: string; sort_order: number };
type Tag = { id: string; name: string };

const LEAD_TYPES = ["prospect", "registered", "buyer", "vip", "expired"] as const;
const TEMPS = ["hot", "warm", "cold"] as const;
const SOURCES = ["unknown", "facebook", "twilio", "maytapi", "manual", "google", "email"] as const;
const CONFS = ["confirmed", "guessed", "unknown"] as const;

export function ContactDrawer({
  prospectId,
  onClose,
  onSaved,
}: {
  prospectId: string | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const [record, setRecord] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [activities, setActivities] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!prospectId) return;
    setLoading(true);
    (async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const { data: r } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        setIsAdmin(!!r);
      }
      const [pRes, sRes, tagsRes, actRes] = await Promise.all([
        supabase.from("prospects").select("*").eq("id", prospectId).single(),
        supabase.from("pipeline_stages").select("id,name,sort_order").order("sort_order"),
        supabase.from("prospect_tags").select("tag_id, tags(id,name)").eq("prospect_id", prospectId),
        supabase.from("contact_activities").select("*").eq("prospect_id", prospectId).order("created_at", { ascending: false }).limit(50),
      ]);
      setRecord(pRes.data);
      setStages((sRes.data as Stage[]) || []);
      setTags(((tagsRes.data as any[]) || []).map((r) => ({ id: r.tags?.id, name: r.tags?.name })).filter((t) => t.id));
      setActivities(actRes.data || []);
      setDirty(false);
      setLoading(false);
    })();
  }, [prospectId]);

  const patch = (updates: Partial<any>) => {
    setRecord((r: any) => ({ ...r, ...updates }));
    setDirty(true);
  };

  const nameMismatch = useMemo(
    () => !!record?.whatsapp_display_name && !!record?.full_name && record.whatsapp_display_name !== record.full_name,
    [record],
  );

  const validate = (): string | null => {
    if (!record) return "No record";
    if (!record.full_name?.trim()) return "Full name is required";
    if (!record.email && !record.phone_raw && !record.phone_number) return "Email or phone required";
    if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) return "Invalid email";
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    const updates = {
      full_name: record.full_name?.trim(),
      first_name: record.first_name?.trim() || null,
      last_name: record.last_name?.trim() || null,
      whatsapp_display_name: record.whatsapp_display_name?.trim() || null,
      email: record.email?.toLowerCase().trim() || null,
      phone_raw: record.phone_raw?.trim() || null,
      contact_source: record.contact_source || null,
      contact_confidence: record.contact_confidence || null,
      name_needs_confirmation: !!record.name_needs_confirmation,
      lead_type: record.lead_type || null,
      lead_temperature: record.lead_temperature || null,
      stage_id: record.stage_id || null,
      assigned_to: record.assigned_to || null,
      additional_notes: record.additional_notes || null,
    };
    const { error } = await supabase.from("prospects").update(updates).eq("id", prospectId!);
    if (error) { toast.error(error.message); setSaving(false); return; }
    setDirty(false);
    toast.success("Contact saved");
    onSaved?.(prospectId!);
    // Fire-and-forget hub push
    supabase.functions.invoke("contact-hub-push", { body: { prospect_id: prospectId } })
      .then(({ data, error }) => {
        if (error) return;
        const d: any = data;
        if (d?.ok) toast.success(d.conflict ? "Hub conflict resolved (remote applied)" : "Synced to hub");
        else if (d?.error === "bridge_not_configured") { /* silent */ }
      })
      .catch(() => { /* silent */ });
    setSaving(false);
  };

  const addTag = async () => {
    const name = tagInput.trim();
    if (!name || !prospectId) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { toast.error("Sign in required"); return; }
    const existing = await supabase.from("tags").select("id,name").eq("name", name).maybeSingle();
    let tagId = existing.data?.id;
    if (!tagId) {
      const ins = await supabase.from("tags").insert({ name, user_id: user.id }).select("id,name").single();
      if (ins.error) { toast.error(ins.error.message); return; }
      tagId = ins.data.id;
    }
    const link = await supabase.from("prospect_tags").insert({ prospect_id: prospectId, tag_id: tagId });
    if (link.error && !String(link.error.message).includes("duplicate")) { toast.error(link.error.message); return; }
    setTags((t) => [...t, { id: tagId!, name }]);
    setTagInput("");
  };

  const removeTag = async (tagId: string) => {
    await supabase.from("prospect_tags").delete().eq("prospect_id", prospectId!).eq("tag_id", tagId);
    setTags((t) => t.filter((x) => x.id !== tagId));
  };

  const doDelete = async () => {
    if (!isAdmin) { toast.error("Admin only"); return; }
    const { error } = await supabase.from("prospects").delete().eq("id", prospectId!);
    if (error) { toast.error(error.message); return; }
    toast.success("Contact deleted");
    onClose();
  };

  if (!prospectId) return null;

  const body = (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => (dirty ? confirm("Discard unsaved changes?") && onClose() : onClose())} />
      <aside className="relative w-full sm:w-[448px] max-w-full h-full bg-background border-l shadow-xl overflow-y-auto animate-in slide-in-from-right duration-200">
        {loading || !record ? (
          <div className="p-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading…</div>
        ) : (
          <>
            {/* 1. Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-5 py-4 flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold shrink-0">
                {(record.full_name || record.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold truncate">{record.full_name || "Unnamed"}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {record.phone_normalized && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{record.phone_normalized}</span>}
                  {record.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{record.email}</span>}
                </div>
              </div>
              <button onClick={() => (dirty ? confirm("Discard unsaved changes?") && onClose() : onClose())} className="p-1 rounded hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>

            {nameMismatch && (
              <div className="mx-5 mt-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="font-medium">Name mismatch</p>
                  <p className="text-muted-foreground">WhatsApp shows "{record.whatsapp_display_name}" but contact is "{record.full_name}". Confirm with the person before you send.</p>
                </div>
              </div>
            )}

            <div className="p-5 space-y-6">
              {/* 2. Core identity */}
              <Section title="Core identity">
                <Field label="Full name" required>
                  <Input value={record.full_name || ""} onChange={(e) => patch({ full_name: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phone (raw)">
                    <Input value={record.phone_raw || record.phone_number || ""} onChange={(e) => patch({ phone_raw: e.target.value })} placeholder="+27…" />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={record.email || ""} onChange={(e) => patch({ email: e.target.value })} />
                  </Field>
                </div>
                {record.phone_normalized && (
                  <p className="text-[11px] text-muted-foreground">Normalized: {record.phone_normalized}</p>
                )}
              </Section>

              {/* 3. Identity bridge */}
              <Section title="Identity bridge">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First name"><Input value={record.first_name || ""} onChange={(e) => patch({ first_name: e.target.value })} /></Field>
                  <Field label="Last name"><Input value={record.last_name || ""} onChange={(e) => patch({ last_name: e.target.value })} /></Field>
                </div>
                <Field label="WhatsApp display name">
                  <Input value={record.whatsapp_display_name || ""} onChange={(e) => patch({ whatsapp_display_name: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Source"><Select value={record.contact_source || ""} onChange={(v) => patch({ contact_source: v })} options={SOURCES} /></Field>
                  <Field label="Confidence"><Select value={record.contact_confidence || ""} onChange={(v) => patch({ contact_confidence: v })} options={CONFS} /></Field>
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={!!record.name_needs_confirmation} onChange={(e) => patch({ name_needs_confirmation: e.target.checked })} />
                  Ask composer to confirm the person's name
                </label>
              </Section>

              {/* 4. Classification */}
              <Section title="Classification">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Lead type"><Select value={record.lead_type || ""} onChange={(v) => patch({ lead_type: v })} options={LEAD_TYPES} /></Field>
                  <Field label="Temperature"><Select value={record.lead_temperature || ""} onChange={(v) => patch({ lead_temperature: v })} options={TEMPS} /></Field>
                </div>
              </Section>

              {/* 5. Pipeline & ownership */}
              <Section title="Pipeline & ownership">
                <Field label="Stage">
                  <select
                    value={record.stage_id || ""}
                    onChange={(e) => patch({ stage_id: e.target.value || null })}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label={`Assigned to${isAdmin ? "" : " (admin only)"}`}>
                  <Input
                    value={record.assigned_to || ""}
                    onChange={(e) => patch({ assigned_to: e.target.value })}
                    disabled={!isAdmin}
                    placeholder="user id / handle"
                  />
                </Field>
              </Section>

              {/* 6. Notes & tags */}
              <Section title="Notes & tags">
                <Textarea rows={3} value={record.additional_notes || ""} onChange={(e) => patch({ additional_notes: e.target.value })} placeholder="Freeform notes…" />
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <Badge key={t.id} variant="secondary" className="text-xs gap-1">
                      {t.name}
                      <button onClick={() => removeTag(t.id)} className="hover:text-destructive">×</button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Add tag…" />
                  <button onClick={addTag} className="px-3 py-1 text-xs rounded border hover:bg-accent">Add</button>
                </div>
              </Section>

              {/* 7. Activity timeline */}
              <Section title="Activity (last 50)">
                {activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                ) : (
                  <ul className="space-y-1 max-h-64 overflow-y-auto">
                    {activities.map((a) => (
                      <li key={a.id} className="text-xs border-l-2 border-primary/40 pl-2 py-1">
                        <span className="font-medium capitalize">{a.activity_type}</span>
                        <span className="ml-2 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                        {a.notes && <p className="text-muted-foreground truncate">{a.notes}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>

            {/* 8. Footer */}
            <div className="sticky bottom-0 bg-background border-t px-5 py-3 flex gap-2 items-center">
              <button
                onClick={save}
                disabled={saving || !dirty}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={!isAdmin}
                title={isAdmin ? "" : "Admin only"}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3" /> {record.hub_contact_id ? `hub v${record.hub_version ?? "?"}` : "local only"}
              </div>
            </div>

            {confirmDelete && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={() => setConfirmDelete(false)}>
                <div className="bg-background border rounded-lg p-6 max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
                  <h3 className="font-semibold">Delete contact?</h3>
                  <p className="text-sm text-muted-foreground">This permanently removes {record.full_name || record.email}. Their activity history is retained.</p>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-sm rounded hover:bg-accent">Cancel</button>
                    <button onClick={doDelete} className="px-3 py-1.5 text-sm rounded bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(body, document.body) : null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}{required && <span className="text-destructive">*</span>}</Label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm capitalize">
      <option value="">—</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
