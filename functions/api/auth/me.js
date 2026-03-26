import { getSessionUser } from '../../_lib/auth.js'
import { error, json } from '../../_lib/response.js'

export async function onRequestGet(context) {
  const session = await getSessionUser(context)
  if (!session) return error('No active session', 401)
  return json({ user: session.user })
}
