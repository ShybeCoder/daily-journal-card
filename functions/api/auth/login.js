import { buildAuthResponse, normalizeEmail, verifyPassword } from '../../_lib/auth.js'
import { error } from '../../_lib/response.js'

export async function onRequestPost(context) {
  const { email, password } = await context.request.json()
  if (!email || !password) return error('Please enter an email and password.')

  const normalizedEmail = normalizeEmail(email)
  const user = await context.env.DB.prepare(
    'SELECT id, email, password_hash FROM users WHERE email = ?',
  )
    .bind(normalizedEmail)
    .first()

  if (!user) return error("That email/password combination didn't work", 401)
  if (!(await verifyPassword(password, user.password_hash))) {
    return error("That email/password combination didn't work", 401)
  }

  return buildAuthResponse(context, user.id)
}
