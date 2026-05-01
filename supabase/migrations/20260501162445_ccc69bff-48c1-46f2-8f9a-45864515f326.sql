DO $$
DECLARE
  energy_day8 jsonb;
  detox_day8  jsonb;
BEGIN
  energy_day8 := jsonb_build_object(
    'type', 'send_email',
    'subject', 'One more option (only if you want it)',
    'from_name', 'Vanto Zazi',
    'content',
'<p>Hey {{first_name}},</p>
<p>Some readers add a small APLGO lozenge to their daily routine alongside the guide. Plant-based blends, not medication — each one designed to support a specific area of wellness.</p>
<p>If you''re curious, here are the options:</p>
<p style="margin: 16px 0;">
  <a href="https://onlinecourseformlm.com/shop/stp?ref={{ref_code}}" style="display:inline-block; background:#1a3a8a; color:#fff; padding:12px 22px; border-radius:8px; text-decoration:none; font-weight:600;">🌿 STP — comfort and circulation support</a>
</p>
<p style="margin: 16px 0;">
  <a href="https://onlinecourseformlm.com/shop/pwr-lemon?ref={{ref_code}}" style="display:inline-block; background:#1a3a8a; color:#fff; padding:12px 22px; border-radius:8px; text-decoration:none; font-weight:600;">🌿 PWR Lemon — men''s energy, vigor, and stamina support</a>
</p>
<p style="margin: 16px 0;">
  <a href="https://onlinecourseformlm.com/shop/pwr-apricot?ref={{ref_code}}" style="display:inline-block; background:#1a3a8a; color:#fff; padding:12px 22px; border-radius:8px; text-decoration:none; font-weight:600;">🌿 PWR Apricot — women''s vitality, balance, and overall wellness support</a>
</p>
<p>If not, no problem — keep using the guide. Either way, <strong>look after yourself</strong>.</p>
<p>— Vanto</p>'
  );

  detox_day8 := jsonb_build_object(
    'type', 'send_email',
    'subject', 'One more option (only if you want it)',
    'from_name', 'Vanto Zazi',
    'content',
'<p>Hey {{first_name}},</p>
<p>Some readers add a small APLGO lozenge to their daily routine alongside the guide. Plant-based blends, not medication — each one designed to support a specific area of wellness.</p>
<p>If you''re curious, here is the option:</p>
<p style="margin: 16px 0;">
  <a href="https://onlinecourseformlm.com/shop/sld?ref={{ref_code}}" style="display:inline-block; background:#1a3a8a; color:#fff; padding:12px 22px; border-radius:8px; text-decoration:none; font-weight:600;">🌿 SLD — joint comfort and flexibility support</a>
</p>
<p>If not, no problem — keep using the guide. Either way, <strong>look after yourself</strong>.</p>
<p>— Vanto</p>'
  );

  UPDATE email_sequences
    SET steps = jsonb_set(steps, '{8}', energy_day8, false),
        updated_at = now()
    WHERE id = 'd9f83f1f-eb64-47fd-ae87-26c65821e4c9';

  UPDATE email_sequences
    SET steps = jsonb_set(steps, '{8}', detox_day8, false),
        updated_at = now()
    WHERE id = '5738da89-3a6e-45e9-8db9-4aadb48e507f';
END $$;