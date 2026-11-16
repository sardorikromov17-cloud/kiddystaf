// Supabase > Edge Functions > Deploy a new function > Via Editor. Nomi: daily  (Verify JWT: o'chirilsin)
// Secrets: TELEGRAM_BOT_TOKEN, CRON_SECRET (o'zingiz o'ylab topgan uzun matn)
// Cron: ?mode=morning (ertalab), ?mode=evening (kechqurun), ?mode=debts (qarz eslatmasi) + &key=CRON_SECRET
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
Deno.serve(async (req) => {
  const u = new URL(req.url)
  if (u.searchParams.get('key') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 })
  const mode = u.searchParams.get('mode') || 'morning'
  const bot = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!bot) return new Response('bot token yo\'q')
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const send = (id: string, text: string) => fetch(`https://api.telegram.org/bot${bot}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: id, text }) })
  const now = new Date(Date.now() + 5 * 3600e3) // Toshkent
  const today = now.toISOString().slice(0, 10), dow = now.getUTCDay(), nowMin = now.getUTCHours() * 60 + now.getUTCMinutes()
  const tm = (ts: string) => { const d = new Date(new Date(ts).getTime() + 5 * 3600e3); return d.getUTCHours() * 60 + d.getUTCMinutes() }
  const sm = (t: string) => { const [h, m] = t.split(':'); return +h * 60 + +m }
  const { data: people } = await db.from('profiles').select('*').eq('active', true).neq('role', 'admin')
  const { data: staff } = await db.from('profiles').select('telegram_id,role,branch_id').in('role', ['admin', 'manager']).eq('active', true).not('telegram_id', 'is', null)
  const notify = async (text: string, branch: number | null) => { for (const a of staff || []) if (a.role === 'admin' || a.branch_id === branch) await send(a.telegram_id, text) }
  const dd = today.slice(8) + '.' + today.slice(5, 7)
  if (mode === 'debts') {
    const { data: tx } = await db.from('transactions').select('user_id,amount')
    const bal: Record<string, number> = {}; (tx || []).forEach((x) => bal[x.user_id] = (bal[x.user_id] || 0) + Number(x.amount))
    const debtors = (people || []).filter((p) => (bal[p.id] || 0) < 0)
    for (const p of debtors) if (p.telegram_id) await send(p.telegram_id, `Hisobingizda qarz bor: ${Math.abs(bal[p.id]).toLocaleString('ru')} so'm.`)
    for (const a of (staff || []).filter((x) => x.role === 'admin')) await send(a.telegram_id, '💳 Qarzdorlar:\n' + (debtors.map((p) => `${p.full_name}: ${Math.abs(bal[p.id]).toLocaleString('ru')}`).join('\n') || 'yo\'q'))
    return new Response('ok')
  }
  const start = new Date(today + 'T00:00:00+05:00').toISOString()
  const { data: att } = await db.from('attendance').select('user_id,kind,created_at').gte('created_at', start).order('created_at')
  const { data: lv } = await db.from('leaves').select('user_id').eq('status', 'approved').lte('from_date', today).gte('to_date', today)
  const onLeave = new Set((lv || []).map((x) => x.user_id))
  const branches = new Set((people || []).map((p) => p.branch_id))
  for (const br of branches) {
    const grp = (people || []).filter((p) => p.branch_id === br)
    const late: string[] = [], absent: string[] = [], working: string[] = [], noOut: string[] = []
    for (const p of grp) {
      if ((p.off_days || [p.off_day]).includes(dow) || onLeave.has(p.id)) continue
      const ins = (att || []).filter((x) => x.user_id === p.id && x.kind === 'in'), outs = (att || []).filter((x) => x.user_id === p.id && x.kind === 'out')
      const ss = sm(p.shift_start || '08:00'), se = sm(p.shift_end || '19:00')
      if (ins.length) {
        working.push(p.full_name)
        const l = tm(ins[0].created_at) - ss; if (l > 5) late.push(`${p.full_name} (${l} daq)`)
        if (!outs.length && nowMin > se + 30) noOut.push(p.full_name)
      } else if (nowMin > ss + 10) {
        absent.push(p.full_name)
        if (mode === 'morning' && p.telegram_id) await send(p.telegram_id, 'Siz hali ishga kelmadingiz. Ilovada KELDIM ni bosing yoki ruxsat so\'rang.')
      }
    }
    const text = mode === 'evening'
      ? `🌙 ${dd}: "Ketdim" bosilmagan: ${noOut.join(', ') || 'yo\'q'}`
      : `📋 ${dd} davomat\n✅ Ishda: ${working.length}\n⏰ Kechikkan: ${late.join(', ') || 'yo\'q'}\n❌ Kelmagan: ${absent.join(', ') || 'yo\'q'}`
    await notify(text, br)
  }
  return new Response('ok')
})
