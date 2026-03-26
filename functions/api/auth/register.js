import { buildAuthResponse, hashPassword } from '../../_lib/auth.js'
import { ensureSeedData } from '../../_lib/journal.js'
import { error } from '../../_lib/response.js'

export async function onRequestPost(context) {
  const { email, password } = await context.request.json()
  if (!email || !password) return error('Please enter an email and password.')
  if (password.length < 8) return error('Use at least 8 characters for your password.')

  const normalizedEmail = email.trim().toLowerCase()
  const existingUser = await context.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(normalizedEmail)
    .first()

  if (existingUser) return error('That email is already in use.')

  const userId = crypto.randomUUID()
  await context.env.DB.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
    .bind(userId, normalizedEmail, await hashPassword(password))
    .run()

  await ensureSeedData(context, userId)
  return buildAuthResponse(context, userId, normalizedEmail, 201)
}
