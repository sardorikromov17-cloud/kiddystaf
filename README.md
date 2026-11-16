# Kiddy Toys Group — xodimlar tizimi (PWA)

## Fayllar
- Saytga yuklanadi: index.html, manifest.json, sw.js, icon-192.png, icon-512.png, apple-touch-icon.png, logo-k.png, logo-kiddy.png
- Supabase'ga: schema_hammasi.sql, yangilanish_2.sql (SQL Editor), kiddy_add_user.ts va kiddy_tools.ts (Edge Functions)
- Bu fayllar (.sql, .ts, README) saytga yuklanmaydi.

## Birinchi marta ishga tushirish
1. Supabase: yangi loyiha. SQL Editor: schema_hammasi.sql -> Run. Keyin yangilanish_2.sql -> Run.
2. Authentication > Sign In / Providers > Email: "Confirm email" o'chirilsin.
3. Authentication > Users > Add user (Auto Confirm User yoqilgan) — o'zingiz uchun. SQL Editor:
   update profiles set role='admin' where id=(select id from auth.users where email='SIZNING_EMAIL');
4. Edge Functions: add-user (kiddy_add_user.ts) va tools (kiddy_tools.ts). Ikkalasida ham "Verify JWT" o'chirilsin.
5. Edge Functions > Secrets: TELEGRAM_BOT_TOKEN = BotFather tokeni (ixtiyoriy).
6. index.html boshidagi URL_ va KEY ga Supabase Project URL va publishable (anon) kalitni yozing.
7. GitHub Pages: public repo, sayt fayllarini yuklang, Settings > Pages > main / root.
8. Admin kiradi: Filial (joylashuv, ish vaqti, QR chop etish) > Xodimlar (+ Yangi xodim yoki Excel'dan import).
9. Xodimlar saytni telefonda ochib, bosh ekranga qo'shadi.

## 3-yangilanish
- Tartib: yangilanish_3.sql (SQL Editor) -> Edge Functions: add-user va tools qayta joylash (yangi kod), daily yangi funksiya -> saytni yangilash.
- daily uchun Secrets: CRON_SECRET (uzun tasodifiy matn). Cron: ?mode=morning&key=CRON_SECRET (04:30 UTC), ?mode=evening (14:30 UTC), ?mode=debts (haftada bir).
