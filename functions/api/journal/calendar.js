import { requireUser } from '../../_lib/auth.js'
import { hasMeaningfulJournalRow, isMonthKey, mapCalendarEvents, monthBounds } from '../../_lib/journal.js'
import { error, json } from '../../_lib/response.js'

export async function onRequestGet(context) {
  const session = await requireUser(context)
  if (session.response) return session.response

  const month = new URL(context.request.url).searchParams.get('month') ?? ''
  if (!isMonthKey(month)) return error('Please choose a real month.')

  const { start, end } = monthBounds(month)
  const [entries, eventRows] = await Promise.all([
    context.env.DB.prepare(
      `SELECT *
       FROM journal_entries
       WHERE user_id = ? AND entry_date BETWEEN ? AND ?
       ORDER BY entry_date ASC`,
    ).bind(session.user.id, start, end).all(),
    context.env.DB.prepare(
      `SELECT id, title, notes, event_date, category, repeat_mode, reminders
       FROM calendar_events
       WHERE user_id = ?`,
    ).bind(session.user.id).all(),
  ])
  const events = mapCalendarEvents(eventRows.results, month)

  const eventsByDate = events.reduce((all, item) => {
    all[item.occurrenceDate] = [...(all[item.occurrenceDate] ?? []), item]
    return all
  }, {})

  return json({
    month,
    entries: entries.results.filter(hasMeaningfulJournalRow).map((row) => row.entry_date),
    eventsByDate,
  })
}
