INSERT INTO public.prospects (email, first_name, full_name, phone_number, source, registration_status) VALUES
('smakhawukana@gmail.com','Vuma','Vuma Makhawukana Salvah','27767630809','xlsx_import_2026_07','Expired_Member'),
('alicetebello07@gmail.com','Pitso','Pitso Tebello Alice','27716332416','xlsx_import_2026_07','Expired_Member'),
('bishoplalamani@gmail.com','Lalamani','Lalamani Solomon Fhulufhedzani','27072190271','xlsx_import_2026_07','Expired_Member'),
('nellytshabalala10@gmail.com','Vanto','Vanto Neliswa Carthline','27620772593','xlsx_import_2026_07','Expired_Member'),
('motlaletsona29@gmail.com','Ngubeni','Ngubeni Motlaletsona Alina','27733327335','xlsx_import_2026_07','Expired_Member'),
('khabo.thwala@gmail.com','Thwala','Thwala Khabonina Lorraine','27834143527','xlsx_import_2026_07','Expired_Member'),
('haroldbillet@gmail.com','Harold','Harold Billet','27073601662','xlsx_import_2026_07','Expired_Member'),
('maboyakaikie@gmail.com','Christian','Christian Maboya','27710292088','xlsx_import_2026_07','Expired_Member'),
('mngomezululawrence@gmail.com','Fano','Fano Laurence Mngomezulu','27799580911','xlsx_import_2026_07','Expired_Member'),
('nkosisiphiwe7@gmail.com','Siphiwe','Siphiwe Nkosi','27659603065','xlsx_import_2026_07','Expired_Member'),
('vantomakubongweoscar@gmail.com','Vanto','Vanto Makubongwe Oscar','27828641934','xlsx_import_2026_07','Expired_Member'),
('dixieemm@gmail.com','Dixie','Dixie Moatswi','27734606164','xlsx_import_2026_07','Expired_Member'),
('mnyaluzae@gmail.com','Luvuyo','Luvuyo Mnyaluza','27738671134','xlsx_import_2026_07','Expired_Member'),
('ksmolose@gmail.com','Molose','Molose Kenaleone Suzan','27827117657','xlsx_import_2026_07','Expired_Member'),
('nchoe.martha@gmail.com','Molale','Molale Martha Dossy','27063421171','xlsx_import_2026_07','Expired_Member'),
('morwadisello491@gmail.com','Morwadi','Morwadi Sello','27726663473','xlsx_import_2026_07','Expired_Member'),
('maggy.seerane@gmail.com','Maggy','Maggy Seerane','27637901405','xlsx_import_2026_07','Expired_Member'),
('brianvariawa@gmail.com','Bryan','Bryan Variawa','27606695254','xlsx_import_2026_07','Expired_Member'),
('angelzideholdings@gmail.com','Ntshayintshayi','Ntshayintshayi Nothando Angel','27715631281','xlsx_import_2026_07','Expired_Member'),
('makhotsostoffels@gmail.com','Makhotso','Makhotso Stoffels','27787190679','xlsx_import_2026_07','Expired_Member'),
('slmosotho@gmail.com','Mosotho','Mosotho Samuel M','27825479231','xlsx_import_2026_07','Expired_Member'),
('zolamzame@gmail.com','Zola','Zola Mzame','27790738179','xlsx_import_2026_07','Expired_Member'),
('xhakazazandile0@gmail.com','Zandile','Zandile Xhakaza','27719964022','xlsx_import_2026_07','Expired_Member'),
('bev.florence007@gmail.com','Beverly','Beverly Florence','27845156081','xlsx_import_2026_07','Expired_Member'),
('ramaru.7@gmail.com','Ramaru','Ramaru Sikheto Caiphus','27826880572','xlsx_import_2026_07','Expired_Member'),
('bmoloi137@gmail.com','Moloi','Moloi Billy Tsoledi','27786672398','xlsx_import_2026_07','Expired_Member'),
('kpmswel@gmail.com','Kenneth','Kenneth Msweli','27826371239','xlsx_import_2026_07','Expired_Member'),
('lucymogopodi41@gmail.com','Lucy','Lucy Mogopodi','27633163432','xlsx_import_2026_07','Expired_Member'),
('mohalalelwatau@gmail.com','Mohalalelwa','Mohalalelwa Tau','27604126602','xlsx_import_2026_07','Expired_Member'),
('jezreellaleti@gmail.com','opi','opi gloria pauline','254792222110','xlsx_import_2026_07','Expired_Member'),
('dualieve1@gmail.com','Cherylynn','Cherylynn Pienaar','27791012363','xlsx_import_2026_07','Expired_Member'),
('pheli.1975ec@gmail.com','Colleen','Colleen Mabanga','27682967512','xlsx_import_2026_07','Expired_Member'),
('mfuravelapi@gmail.com','Velaphi','Velaphi Nomfuneko','27685542137','xlsx_import_2026_07','Expired_Member'),
('vumakhanyisa.ke@gmail.com','Khanyisa','Khanyisa Vuma Euglana','27730305909','xlsx_import_2026_07','Expired_Member'),
('vumaeuge@gmail.com','VUMA','VUMA Eugene','27792964207','xlsx_import_2026_07','Expired_Member'),
('prayer073@gmail.com','Prayer','Prayer Prayer Kubayi','27839299788','xlsx_import_2026_07','Expired_Member'),
('rethabilekokozela@gmail.com','Kokozela','Kokozela Rozleen Rethabile','27603244230','xlsx_import_2026_07','Expired_Member'),
('vantovant@gmail.com','Vanto','Vanto Test','','xlsx_import_2026_07','Expired_Member')
ON CONFLICT (email) DO UPDATE SET first_name = COALESCE(NULLIF(EXCLUDED.first_name,''), prospects.first_name), full_name = COALESCE(NULLIF(EXCLUDED.full_name,''), prospects.full_name), phone_number = COALESCE(NULLIF(EXCLUDED.phone_number,''), prospects.phone_number), unsubscribed = false;

INSERT INTO public.tags (user_id, name, color)
SELECT 'c89702d5-178a-4c59-bd11-41e3532e1c23', 'Restart_July_2026', '#F59E0B'
WHERE NOT EXISTS (SELECT 1 FROM public.tags WHERE user_id='c89702d5-178a-4c59-bd11-41e3532e1c23' AND name='Restart_July_2026');

INSERT INTO public.prospect_tags (prospect_id, tag_id)
SELECT p.id, t.id
FROM public.prospects p
CROSS JOIN public.tags t
WHERE p.source = 'xlsx_import_2026_07'
  AND t.name = 'Restart_July_2026'
ON CONFLICT DO NOTHING;

INSERT INTO public.segments (user_id, name, description, filters)
VALUES (
  'c89702d5-178a-4c59-bd11-41e3532e1c23',
  'Restart July 2026 Recipients',
  'Expired members imported for July restart broadcast',
  '{"match":"all","groups":[{"match":"all","type":"include","conditions":[{"field":"tag","operator":"has","value":"Restart_July_2026"}]}]}'::jsonb
);

UPDATE public.broadcasts
SET segment_id = (SELECT id FROM public.segments WHERE name = 'Restart July 2026 Recipients' ORDER BY created_at DESC LIMIT 1),
    status = 'scheduled',
    scheduled_at = now() - interval '30 seconds'
WHERE id = '5b050b1e-f273-4722-a2e2-586c25d32810';