// Supabase > Edge Functions > Deploy a new function > Via Editor. Nomi: add-user
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
    const { data: me } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') throw new Error('Faqat admin xodim qo\'sha oladi')
    const b = await req.json()
    if (!b.email || !b.password || String(b.password).length < 6) throw new Error('Login va parol (kamida 6 belgi) kerak')
    const { data, error } = await admin.auth.admin.createUser({ email: b.email, password: b.password, email_confirm: true, user_metadata: { full_name: b.full_name } })
    if (error) throw new Error(error.message.includes('already') ? 'Bu login band' : error.message)
    const { error: e2 } = await admin.from('profiles').update({
      full_name: b.full_name, phone: b.phone, birth_date: b.birth_date || null, position: b.position,
      role: ['admin', 'manager', 'employee', 'driver'].includes(b.role) ? b.role : 'employee', branch_id: b.branch_id || null,
      shift_start: b.shift_start, shift_end: b.shift_end, off_days: b.off_days || [0],
    }).eq('id', data.user.id)
    if (e2) throw new Error(e2.message)
    return json({ ok: true })
  } catch (e) { return json({ error: (e as Error).message }, 400) }
})
