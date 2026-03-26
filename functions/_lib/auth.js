import bcrypt from 'bcryptjs'
import { error, json } from './response.js'

const SESSION_COOKIE = 'daily_journal_card_session'
const SESSION_LENGTH_MS = 1000 * 60 * 60 * 24 * 14

function parseCookies(request) {
  const header = request.headers.get('Cookie') ?? ''
  return header.split(';').reduce((cookies, part) => {
    const [name, ...valueParts] = part.trim().split('=')
    if (!name) return cookies
    cookies[name] = decodeURIComponent(valueParts.join('='))
    return cookies
  }, {})
}

function createToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function cookieFor(token, request, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export async function createSession(context, userId) {
  const token = createToken()
  const expiresAt = new Date(Date.now() + SESSION_LENGTH_MS).toISOString()
  await context.env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
  )
    .bind(token, userId, expiresAt)
    .run()
  return token
}

export async function getSessionUser(context) {
  const token = parseCookies(context.request)[SESSION_COOKIE]
  if (!token) return null

  const row = await context.env.DB.prepare(
    `SELECT users.id, users.email, sessions.expires_at
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?`,
  )
    .bind(token)
    .first()

  if (!row) return null

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await context.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
    return null
  }

  return { token, user: { id: row.id, email: row.email } }
}

export async function requireUser(context) {
  const session = await getSessionUser(context)
  if (!session) {
    return { response: error('Your session expired, please log in again', 401) }
  }
  return session
}

export async function buildAuthResponse(context, userId, email, status = 200) {
  const token = await createSession(context, userId)
  return json(
    { user: { id: userId, email } },
    {
      status,
      headers: {
        'Set-Cookie': cookieFor(token, context.request, Math.floor(SESSION_LENGTH_MS / 1000)),
      },
    },
  )
}

export async function logoutResponse(context) {
  const token = parseCookies(context.request)[SESSION_COOKIE]
  if (token) {
    await context.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  }
  return json(
    { success: true },
    {
      headers: {
        'Set-Cookie': cookieFor('', context.request, 0),
      },
    },
  )
}
