// Supabase > Edge Functions > Deploy a new function > Via Editor. Nomi: tools
// Secrets (Edge Functions > Secrets): TELEGRAM_BOT_TOKEN (BotFather bergan token)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) throw new Error('Tizimga kirilmagan')
    const { data: me } = await admin.from('profiles').select('role,branch_id').eq('id', user.id).single()
    const isAdmin = me?.role === 'admin'
    const isMgr = me?.role === 'manager'
    const b = await req.json()
    if (b.action === 'set_password') {
      if (!isAdmin) throw new Error('Faqat admin')
      if (!b.password || String(b.password).length < 6) throw new Error('Parol kamida 6 belgi')
      const { error } = await admin.auth.admin.updateUserById(b.user_id, { password: b.password })
      if (error) throw new Error(error.message)
      return json({ ok: true })
    }
    if (b.action === 'set_active') {
      if (!isAdmin) throw new Error('Faqat admin')
      if (b.user_id === user.id) throw new Error('O\'zingizni faolsizlantira olmaysiz')
      const { error } = await admin.auth.admin.updateUserById(b.user_id, { ban_duration: b.active ? 'none' : '876000h' })
      if (error) throw new Error(error.message)
      await admin.from('profiles').update({ active: !!b.active }).eq('id', b.user_id)
      return json({ ok: true })
    }
    if (b.action === 'notify') {
      const bot = Deno.env.get('TELEGRAM_BOT_TOKEN')
      if (!bot) return json({ ok: true, sent: 0 })
      let q = admin.from('profiles').select('telegram_id').not('telegram_id', 'is', null).eq('active', true)
      if (b.to === 'admins') q = q.eq('role', 'admin')
      else if (isMgr && String(b.to).startsWith('branch:') && Number(String(b.to).slice(7)) === me.branch_id) q = q.eq('branch_id', me.branch_id)
      else if (isMgr && b.to !== 'all' && !String(b.to).startsWith('branch:')) q = q.eq('id', b.to).eq('branch_id', me.branch_id)
      else if (!isAdmin) throw new Error('Ruxsat yo\'q')
      else if (b.to === 'all') { /* hamma */ }
      else if (String(b.to).startsWith('branch:')) q = q.eq('branch_id', Number(String(b.to).slice(7)))
      else q = q.eq('id', b.to)
      const { data } = await q
      let sent = 0
      for (const p of data || []) {
        const r = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: p.telegram_id, text: String(b.text).slice(0, 3000) }) })
        if (r.ok) sent++
      }
      return json({ ok: true, sent })
    }
    throw new Error('Noma\'lum amal')
  } catch (e) { return json({ error: (e as Error).message }, 400) }
})
