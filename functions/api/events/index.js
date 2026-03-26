import { requireUser } from '../../_lib/auth.js'
import { isDateKey } from '../../_lib/journal.js'
import { error, json } from '../../_lib/response.js'

function normalizePayload(payload = {}) {
  return {
    title: typeof payload.title === 'string' ? payload.title.trim().slice(0, 160) : '',
    date: typeof payload.date === 'string' ? payload.date.trim() : '',
    notes: typeof payload.notes === 'string' ? payload.notes.slice(0, 2000) : '',
    category: payload.category === 'birthday' ? 'birthday' : 'event',
    repeatYearly: Boolean(payload.repeatYearly),
  }
}

export async function onRequestPost(context) {
  const session = await requireUser(context)
  if (session.response) return session.response

  const payload = normalizePayload(await context.request.json())
  if (!payload.title) return error('Please give this reminder a title.')
  if (!isDateKey(payload.date)) return error('Please choose a real calendar date.')

  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  await context.env.DB.prepare(
    `INSERT INTO calendar_events
      (id, user_id, title, notes, event_date, category, repeat_yearly, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      session.user.id,
      payload.title,
      payload.notes,
      payload.date,
      payload.category,
      payload.repeatYearly ? 1 : 0,
      now,
      now,
    )
    .run()

  return json({ success: true, id })
}
