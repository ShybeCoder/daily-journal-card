import { requireUser } from '../../_lib/auth.js'
import { formatPasskey } from '../../_lib/passkeys.js'
import { json } from '../../_lib/response.js'

export async function onRequestGet(context) {
  const session = await requireUser(context)
  if (session.response) {
    return session.response
  }

  const rows =
    (await context.env.DB.prepare(
      `SELECT id, transports, created_at
       FROM passkeys
       WHERE user_id = ?
       ORDER BY created_at DESC`,
    )
      .bind(session.user.id)
      .all()).results ?? []

  return json({
    passkeys: rows.map(formatPasskey),
  })
}
