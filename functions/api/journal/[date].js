import { requireUser } from '../../_lib/auth.js'
import { isDateKey, loadJournalDay, saveJournalDay } from '../../_lib/journal.js'
import { error, json } from '../../_lib/response.js'

export async function onRequestGet(context) {
  const session = await requireUser(context)
  if (session.response) return session.response
  if (!isDateKey(context.params.date)) return error('Please use a real calendar date.')
  return json(await loadJournalDay(context, session.user.id, context.params.date))
}

export async function onRequestPut(context) {
  const session = await requireUser(context)
  if (session.response) return session.response
  if (!isDateKey(context.params.date)) return error('Please use a real calendar date.')
  await saveJournalDay(context, session.user.id, context.params.date, await context.request.json())
  return json({ success: true })
}
