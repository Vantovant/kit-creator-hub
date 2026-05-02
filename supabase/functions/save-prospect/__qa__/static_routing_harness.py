"""
STATIC QA HARNESS — Premium + Elite Bridge Routing
Read-only DB checks + in-memory routing simulation.
NO inserts, NO edge calls, NO Resend, NO sequence activation.
"""
import json, re, subprocess, sys

# ─────────────────────────────────────────────────────────────────────────────
# PROPOSED ROUTING — mirrors the additions that would be made to save-prospect
# (NOT yet shipped to the live edge function — used here for dry simulation only)
# ─────────────────────────────────────────────────────────────────────────────
PROPOSED_ALLOWED_SOURCES_ADDITIONS = {
    "alt_premium_bridge_section","hpr_premium_bridge_section","hrt_premium_bridge_section",
    "ice_premium_bridge_section","mls_premium_bridge_section","lft_premium_bridge_section",
    "bty_elite_bridge_section","air_elite_bridge_section","hpy_elite_bridge_section",
    "brn_elite_bridge_section","pft_elite_bridge_section","terra_elite_bridge_section",
}

EXPECTED_SEQ = {
    "alt_premium_bridge_section": ("6c644e0c-bba1-4906-8683-b1318f6b63a9","Premium_Respiratory_Bridge"),
    "hpr_premium_bridge_section": ("47ea2586-81e3-4b6f-8ca8-ca0beaa27aa1","Premium_Detox_Immune_Bridge"),
    "hrt_premium_bridge_section": ("67ae03f4-bbfb-4650-b2d9-54ee194273ce","Premium_Cardio_Bridge"),
    "ice_premium_bridge_section": ("651e15c8-ac5c-4d2e-890e-bca01593e425","Premium_Digestive_Bridge"),
    "mls_premium_bridge_section": ("651e15c8-ac5c-4d2e-890e-bca01593e425","Premium_Digestive_Bridge"),
    "lft_premium_bridge_section": ("48b02f66-caf0-4f4b-b4de-3aad57fabb3c","Premium_Cellular_Bridge"),
    "bty_elite_bridge_section":   ("68aab669-b8d3-4b2e-ba8e-7a25d36f0dd5","Elite_Beauty_Bridge"),
    "air_elite_bridge_section":   ("e1128694-18c8-4093-9364-216f801b7243","Elite_Respiratory_Immune_Bridge"),
    "hpy_elite_bridge_section":   ("de459cb2-2c4a-4c97-9851-e2d367244d4d","Elite_Mood_Energy_Bridge"),
    "brn_elite_bridge_section":   ("d0988d2d-5840-4f30-b89d-37c27c5e0afb","Elite_Cognitive_Bridge"),
    "pft_elite_bridge_section":   ("5874d98f-69e0-465a-8f48-9ec0564894a1","Elite_Lifestyle_Bridge"),
    "terra_elite_bridge_section": ("5874d98f-69e0-465a-8f48-9ec0564894a1","Elite_Lifestyle_Bridge"),
}

EXPECTED_SLUG = {
    "alt_premium_bridge_section": ["alt"],
    "hpr_premium_bridge_section": ["hpr"],
    "hrt_premium_bridge_section": ["hrt"],
    "ice_premium_bridge_section": ["ice","mls"],
    "mls_premium_bridge_section": ["ice","mls"],
    "lft_premium_bridge_section": ["lft"],
    "bty_elite_bridge_section":   ["bty"],
    "air_elite_bridge_section":   ["air"],
    "hpy_elite_bridge_section":   ["hpy"],
    "brn_elite_bridge_section":   ["brn"],
    "pft_elite_bridge_section":   ["pft","terra-pendant"],
    "terra_elite_bridge_section": ["pft","terra-pendant"],
}

# Existing live save-prospect allowlist (from inspecting source) — Premium/Elite NOT included
LIVE_ALLOWED_SOURCES = {
    "welcome_form","website_embed","csv_import","sequence_form","vantoos_beta_form",
    "nrm_bridge","nrm_bridge_section","rlx_bridge","rlx_bridge_section",
    "nrm_gut_bridge","nrm_gut_bridge_section",
    "grw_bridge_section","gts_bridge_section","sld_bridge_section","stp_bridge_section",
    "pwr-lemon_bridge_section","pwr-apricot_bridge_section",
}
LIVE_CLUSTER_MAP = {
    "grw_bridge_section":"462db47a-7d6e-47f1-92d2-640e13683cbd",
    "gts_bridge_section":"d9f83f1f-eb64-47fd-ae87-26c65821e4c9",
    "pwr-lemon_bridge_section":"d9f83f1f-eb64-47fd-ae87-26c65821e4c9",
    "pwr-apricot_bridge_section":"d9f83f1f-eb64-47fd-ae87-26c65821e4c9",
    "sld_bridge_section":"5738da89-3a6e-45e9-8db9-4aadb48e507f",
    "stp_bridge_section":"5738da89-3a6e-45e9-8db9-4aadb48e507f",
}

BANNED = ["cure","treat ","diagnose","disease","guarantee","hormone","libido","sexual",
          "blood pressure","cholesterol","cardiac","anxiety","depression","weight loss",
          "weight-loss","slimming","fat burn","fat-burn"," emf","scalar","frequency healing",
          "medical device","drops","lozenge"]
PRICE_TOKENS = [r"\bR\s?\d{2,}\b", r"\bZAR\b", r"member price"]
GENERIC_WELCOME_SUBJ = "Welcome to Vanto Zazi Mail!"

# ─────────────────────────────────────────────────────────────────────────────
# DRY ROUTING SIMULATOR (mirrors save-prospect logic, with proposed additions)
# ─────────────────────────────────────────────────────────────────────────────
def simulate_resolver(source, sequence_id=None, *, use_proposed=True):
    allowed = LIVE_ALLOWED_SOURCES | (PROPOSED_ALLOWED_SOURCES_ADDITIONS if use_proposed else set())
    cluster_map = dict(LIVE_CLUSTER_MAP)
    if use_proposed:
        for src,(sid,_) in EXPECTED_SEQ.items():
            cluster_map[src] = sid
    sanitized = source if source in allowed else "welcome_form"
    resolved = sequence_id if (sequence_id and isinstance(sequence_id,str)) else cluster_map.get(sanitized)
    return {"sanitized_source": sanitized, "resolved_sequence_id": resolved,
            "suppress_generic_welcome": resolved is not None,
            "trigger_subscribe_automation": resolved is None}

def sanitize_ref(rc):
    if not rc or not isinstance(rc,str): return ""
    return re.sub(r"[^a-zA-Z0-9\-_]","", rc.strip()[:80])

def render_substitution(content, ref_code):
    return content.replace("{{ref_code}}", sanitize_ref(ref_code))

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def psql(q):
    r = subprocess.run(["psql","-At","-F","|","-c",q], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"psql failed: {r.stderr}")
    return [line for line in r.stdout.strip().split("\n") if line]

results = []
def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS" if ok else "FAIL") + f"  {name}" + (f"  — {detail}" if detail else ""))

# ─────────────────────────────────────────────────────────────────────────────
# PRE-FLIGHT (kill-switch belt-and-braces)
# ─────────────────────────────────────────────────────────────────────────────
print("\n=== PRE-FLIGHT KILL-SWITCH ASSERTIONS ===")
ids_csv = ",".join(f"'{sid}'" for sid,_ in set(EXPECTED_SEQ.values()))
rows = psql(f"SELECT COUNT(*) FROM email_sequences WHERE id IN ({ids_csv}) AND status='active';")
check("PRE-FLIGHT: 0 bridge sequences are active", rows[0]=="0", f"got {rows[0]}")
rows = psql(f"SELECT COUNT(*) FROM automation_queue WHERE automation_id IN ({ids_csv});")
check("PRE-FLIGHT: 0 automation_queue rows for bridge IDs", rows[0]=="0", f"got {rows[0]}")
rows = psql(f"SELECT COUNT(*) FROM zazi_outbound_sends WHERE sequence_id IN ({ids_csv});")
check("PRE-FLIGHT: 0 zazi_outbound_sends rows for bridge IDs", rows[0]=="0", f"got {rows[0]}")

# Confirm live save-prospect has NOT been modified to include Premium/Elite sources
import pathlib
sp = pathlib.Path("supabase/functions/save-prospect/index.ts").read_text()
live_has_any = any(src in sp for src in PROPOSED_ALLOWED_SOURCES_ADDITIONS)
check("HOLD: live save-prospect has NOT been modified with Premium/Elite sources", not live_has_any)

# ─────────────────────────────────────────────────────────────────────────────
# A. SOURCE-TO-SEQUENCE MAPPING (dry simulation)
# ─────────────────────────────────────────────────────────────────────────────
print("\n=== A. SOURCE-TO-SEQUENCE MAPPING (DRY) ===")
for src,(expected_id,expected_name) in EXPECTED_SEQ.items():
    test_email = f"qa+{src.split('_')[0]}@bridge.test"
    res = simulate_resolver(src)
    ok = res["resolved_sequence_id"] == expected_id and res["sanitized_source"] == src
    check(f"A: {src} → {expected_name}", ok, f"got seq={res['resolved_sequence_id']} src={res['sanitized_source']} email={test_email}")

# DB existence check
print("\n=== A2. DB SEQUENCE EXISTENCE (read-only) ===")
rows = psql(f"SELECT id,name,status FROM email_sequences WHERE id IN ({ids_csv}) ORDER BY name;")
db_map = {r.split("|")[0]: r.split("|") for r in rows}
for src,(expected_id,expected_name) in EXPECTED_SEQ.items():
    if expected_id in db_map:
        _,name,status = db_map[expected_id]
        check(f"A2: DB row exists for {expected_name}", name==expected_name and status=="inactive",
              f"name={name} status={status}")
    else:
        check(f"A2: DB row exists for {expected_name}", False, "missing")

# ─────────────────────────────────────────────────────────────────────────────
# B. CONTROL CASES
# ─────────────────────────────────────────────────────────────────────────────
print("\n=== B. CONTROL CASES (DRY) ===")
res = simulate_resolver("unknown_source_xyz")
check("B: unknown_source_xyz → no bridge sequence",
      res["resolved_sequence_id"] is None and res["sanitized_source"]=="welcome_form",
      f"got {res}")
res = simulate_resolver("")
check("B: empty source → no bridge sequence",
      res["resolved_sequence_id"] is None and res["sanitized_source"]=="welcome_form",
      f"got {res}")

# ─────────────────────────────────────────────────────────────────────────────
# C. GENERIC WELCOME SUPPRESSION
# ─────────────────────────────────────────────────────────────────────────────
print("\n=== C. GENERIC WELCOME SUPPRESSION (DRY) ===")
for src in EXPECTED_SEQ:
    res = simulate_resolver(src)
    check(f"C: {src} suppresses generic welcome",
          res["suppress_generic_welcome"] and not res["trigger_subscribe_automation"])
res = simulate_resolver("unknown_source_xyz")
check("C: unknown source does NOT suppress generic welcome / DOES trigger subscribe",
      not res["suppress_generic_welcome"] and res["trigger_subscribe_automation"])
res = simulate_resolver("")
check("C: empty source does NOT suppress generic welcome / DOES trigger subscribe",
      not res["suppress_generic_welcome"] and res["trigger_subscribe_automation"])

# ─────────────────────────────────────────────────────────────────────────────
# D/E/F/G. DEEP BODY INSPECTION (read-only DB pull of steps JSONB)
# ─────────────────────────────────────────────────────────────────────────────
print("\n=== D/E/F/G. EMAIL BODY INSPECTION (read-only) ===")
rows = psql(f"SELECT id, name, steps::text FROM email_sequences WHERE id IN ({ids_csv});")
seq_steps = {}
for r in rows:
    sid,name,steps_json = r.split("|",2)
    seq_steps[sid] = (name, json.loads(steps_json))

# Track unique sequences (ICE+MLS share, PFT+TERRA share)
unique_sids = set(sid for sid,_ in EXPECTED_SEQ.values())

# G1. No generic welcome subject inside any bridge step
for sid in unique_sids:
    name, steps = seq_steps[sid]
    has_generic = any(s.get("type")=="send_email" and GENERIC_WELCOME_SUBJ in (s.get("subject") or "") for s in steps)
    check(f"G: {name} contains no generic welcome subject", not has_generic)

# G2. No member prices / banned claims / customer-visible MISSING_PDF / preview domains
for sid in unique_sids:
    name, steps = seq_steps[sid]
    visible_text = ""
    for s in steps:
        if s.get("type")=="send_email":
            body = s.get("content","")
            # Strip HTML comments (where MISSING_PDF marker lives) for customer-visible scan
            visible = re.sub(r"<!--.*?-->","", body, flags=re.DOTALL)
            visible_text += " " + visible + " " + (s.get("subject") or "")
    low = visible_text.lower()
    banned_hits = [b for b in BANNED if b in low]
    check(f"G: {name} has no banned claims (customer-visible)", not banned_hits, f"hits={banned_hits}")
    price_hits = []
    for pat in PRICE_TOKENS:
        if re.search(pat, visible_text, flags=re.I): price_hits.append(pat)
    check(f"G: {name} has no member prices (customer-visible)", not price_hits, f"hits={price_hits}")
    check(f"G: {name} has no customer-visible MISSING_PDF text",
          "MISSING_PDF" not in visible_text)
    preview_hits = re.findall(r"https?://[^\s\"'>]*lovable\.app[^\s\"'>]*", visible_text)
    check(f"G: {name} has no preview-domain URLs", not preview_hits, f"hits={preview_hits}")

# D. Day 8 link verification — Day 8 = 5th send_email in the 11-step skeleton
print("\n=== D. DAY 8 LINK VERIFICATION ===")
for src,(sid,name) in EXPECTED_SEQ.items():
    expected_slugs = EXPECTED_SLUG[src]
    _, steps = seq_steps[sid]
    sends = [s for s in steps if s.get("type")=="send_email"]
    day8 = sends[4] if len(sends)>=5 else None
    if not day8:
        check(f"D: {name} Day 8 step exists", False); continue
    body = day8.get("content","")
    for slug in expected_slugs:
        url = f"https://onlinecourseformlm.com/shop/{slug}?ref={{{{ref_code}}}}"
        check(f"D: {name} Day 8 contains {slug} link with ref token", url in body)
    # No bare hosts / no preview / no extra query params
    for url in re.findall(r"https?://[^\s\"'>]+", body):
        if "/shop/" in url:
            ok_host = url.startswith("https://onlinecourseformlm.com/shop/")
            ok_query = url.endswith("?ref={{ref_code}}")
            check(f"D: {name} Day 8 link well-formed: {url[:80]}", ok_host and ok_query)

# E. TERRA slug verification — across ALL 10 sequences
print("\n=== E. TERRA SLUG VERIFICATION ===")
deny = re.compile(r"/shop/terra(?!-pendant)\b")  # matches /shop/terra but NOT /shop/terra-pendant
for sid in unique_sids:
    name, steps = seq_steps[sid]
    full = json.dumps(steps)
    bad = deny.findall(full)
    check(f"E: {name} contains zero /shop/terra (without -pendant)", not bad, f"hits={bad}")
# Positive TERRA presence in Lifestyle bridge
lifestyle_sid = "5874d98f-69e0-465a-8f48-9ec0564894a1"
_, lstyle = seq_steps[lifestyle_sid]
lstyle_text = json.dumps(lstyle)
check("E: Elite_Lifestyle_Bridge contains /shop/terra-pendant?ref={{ref_code}}",
      "/shop/terra-pendant?ref={{ref_code}}" in lstyle_text)
check("E: Elite_Lifestyle_Bridge refers to TERRA as wearable wellness accessory",
      "wearable wellness accessory" in lstyle_text)
terra_banned = ["EMF","scalar","frequency healing","medical device"]
hits = [t for t in terra_banned if t.lower() in lstyle_text.lower()]
check("E: Elite_Lifestyle_Bridge TERRA copy has no banned device terms", not hits, f"hits={hits}")

# F. Ref code preservation + dry render
print("\n=== F. REF_CODE SUBSTITUTION ===")
sample_body = seq_steps[lifestyle_sid][1][8]["content"]  # Day 8 step (index 8 in 11-step array)
check("F: stored Day 8 body preserves literal {{ref_code}}", "{{ref_code}}" in sample_body)
rendered = render_substitution(sample_body, "QA-REF-001")
check("F: dry-render with QA-REF-001 produces ?ref=QA-REF-001", "?ref=QA-REF-001" in rendered)
check("F: dry-render leaves zero {{ref_code}} tokens", "{{ref_code}}" not in rendered)
# Empty / malicious sanitiser
check("F: sanitiser strips angle brackets and quotes",
      sanitize_ref("<script>'\"alert") == "scriptalert")
check("F: sanitiser caps at 80 chars", len(sanitize_ref("a"*200)) == 80)
check("F: empty ref renders ?ref= (well-formed)", "?ref=" in render_substitution(sample_body, ""))

# ─────────────────────────────────────────────────────────────────────────────
# POST-FLIGHT — re-confirm nothing was disturbed
# ─────────────────────────────────────────────────────────────────────────────
print("\n=== POST-FLIGHT KILL-SWITCH RE-ASSERTIONS ===")
rows = psql(f"SELECT COUNT(*) FROM email_sequences WHERE id IN ({ids_csv}) AND status='active';")
check("POST: still 0 active bridge sequences", rows[0]=="0", f"got {rows[0]}")
rows = psql(f"SELECT COUNT(*) FROM automation_queue WHERE automation_id IN ({ids_csv});")
check("POST: still 0 automation_queue rows for bridge IDs", rows[0]=="0", f"got {rows[0]}")
rows = psql(f"SELECT COUNT(*) FROM zazi_outbound_sends WHERE sequence_id IN ({ids_csv});")
check("POST: still 0 zazi_outbound_sends rows for bridge IDs", rows[0]=="0", f"got {rows[0]}")
# QA test emails must NOT exist in prospects
rows = psql("SELECT COUNT(*) FROM prospects WHERE email LIKE 'qa+%@bridge.test';")
check("POST: 0 QA test leads inserted into prospects", rows[0]=="0", f"got {rows[0]}")

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
total = len(results); failed = sum(1 for _,ok,_ in results if not ok)
print(f"\n{'='*60}\nTOTAL: {total}  PASSED: {total-failed}  FAILED: {failed}\n{'='*60}")
sys.exit(0 if failed==0 else 1)
