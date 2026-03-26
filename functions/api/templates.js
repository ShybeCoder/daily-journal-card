import { requireUser } from '../_lib/auth.js'
import { getTemplates, saveTemplates } from '../_lib/journal.js'
import { json } from '../_lib/response.js'

export async function onRequestGet(context) {
  const session = await requireUser(context)
  if (session.response) return session.response
  return json(await getTemplates(context, session.user.id))
}

export async function onRequestPut(context) {
  const session = await requireUser(context)
  if (session.response) return session.response
  return json(await saveTemplates(context, session.user.id, await context.request.json()))
}
