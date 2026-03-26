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

export async function onRequestPut(context) {
  const session = await requireUser(context)
  if (session.response) return session.response

  const payload = normalizePayload(await context.request.json())
  if (!payload.title) return error('Please give this reminder a title.')
  if (!isDateKey(payload.date)) return error('Please choose a real calendar date.')

  const result = await context.env.DB.prepare(
    `UPDATE calendar_events
     SET title = ?, notes = ?, event_date = ?, category = ?, repeat_yearly = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
  )
    .bind(
      payload.title,
      payload.notes,
      payload.date,
      payload.category,
      payload.repeatYearly ? 1 : 0,
      new Date().toISOString(),
      context.params.id,
      session.user.id,
    )
    .run()

  if (!result.meta.changes) return error('That reminder could not be found.', 404)
  return json({ success: true })
}

export async function onRequestDelete(context) {
  const session = await requireUser(context)
  if (session.response) return session.response

  const result = await context.env.DB.prepare(
    'DELETE FROM calendar_events WHERE id = ? AND user_id = ?',
  )
    .bind(context.params.id, session.user.id)
    .run()

  if (!result.meta.changes) return error('That reminder could not be found.', 404)
  return json({ success: true })
}
