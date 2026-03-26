import { requireUser } from '../../_lib/auth.js'
import { isMonthKey, mapCalendarEvent, monthBounds } from '../../_lib/journal.js'
import { error, json } from '../../_lib/response.js'

export async function onRequestGet(context) {
  const session = await requireUser(context)
  if (session.response) return session.response

  const month = new URL(context.request.url).searchParams.get('month') ?? ''
  if (!isMonthKey(month)) return error('Please choose a real month.')

  const { start, end } = monthBounds(month)
  const [entries, exactEvents, yearlyEvents] = await Promise.all([
    context.env.DB.prepare(
      `SELECT entry_date FROM journal_entries
       WHERE user_id = ? AND entry_date BETWEEN ? AND ?
       ORDER BY entry_date ASC`,
    ).bind(session.user.id, start, end).all(),
    context.env.DB.prepare(
      `SELECT id, title, notes, event_date, category, repeat_yearly
       FROM calendar_events
       WHERE user_id = ? AND event_date BETWEEN ? AND ?`,
    ).bind(session.user.id, start, end).all(),
    context.env.DB.prepare(
      `SELECT id, title, notes, event_date, category, repeat_yearly
       FROM calendar_events
       WHERE user_id = ? AND repeat_yearly = 1 AND substr(event_date, 6, 2) = ?`,
    ).bind(session.user.id, month.slice(5, 7)).all(),
  ])

  const events = [...exactEvents.results, ...yearlyEvents.results]
    .map((row) => mapCalendarEvent(row, month))
    .sort((left, right) => left.occurrenceDate.localeCompare(right.occurrenceDate) || left.title.localeCompare(right.title))

  const eventsByDate = events.reduce((all, item) => {
    all[item.occurrenceDate] = [...(all[item.occurrenceDate] ?? []), item]
    return all
  }, {})

  return json({
    month,
    entries: entries.results.map((row) => row.entry_date),
    eventsByDate,
  })
}
