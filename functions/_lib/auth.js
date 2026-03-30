import bcrypt from 'bcryptjs'
import { error, json } from './response.js'

const SESSION_COOKIE = 'daily_journal_card_session'
const PASSKEY_CHALLENGE_COOKIE = 'daily_journal_card_passkey_challenge'
const SESSION_LENGTH_MS = 1000 * 60 * 60 * 24 * 14
const PASSKEY_CHALLENGE_LENGTH_MS = 1000 * 60 * 10

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

function cookieFor(name, value, request, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${name}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

export function normalizeEmail(email = '') {
  return email.trim().toLowerCase()
}

export function normalizeSecurityAnswer(answer = '') {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ')
}

function buildUserPayload(row) {
  return {
    id: row.id,
    email: row.email,
    securityQuestionKey: row.security_question_key ?? '',
    hasRecoveryQuestion: Boolean(row.security_question_key),
    passkeyCount: Number(row.passkey_count ?? 0),
  }
}

export function getRelyingParty(context) {
  const url = new URL(context.request.url)

  return {
    origin: url.origin,
    rpID: url.hostname,
    rpName: 'Daily Journal Card',
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export async function hashSecurityAnswer(answer) {
  return bcrypt.hash(normalizeSecurityAnswer(answer), 12)
}

export async function verifySecurityAnswer(answer, hash) {
  return bcrypt.compare(normalizeSecurityAnswer(answer), hash)
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

export async function getUserById(context, userId) {
  const row = await context.env.DB.prepare(
    `SELECT
      users.id,
      users.email,
      users.security_question_key,
      (
        SELECT COUNT(*)
        FROM passkeys
        WHERE passkeys.user_id = users.id
      ) AS passkey_count
     FROM users
     WHERE users.id = ?`,
  )
    .bind(userId)
    .first()

  return row ? buildUserPayload(row) : null
}

export async function getSessionUser(context) {
  const token = parseCookies(context.request)[SESSION_COOKIE]
  if (!token) return null

  const row = await context.env.DB.prepare(
    `SELECT sessions.user_id, sessions.expires_at
     FROM sessions
     WHERE sessions.token = ?`,
  )
    .bind(token)
    .first()

  if (!row) return null

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await context.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
    return null
  }

  const user = await getUserById(context, row.user_id)
  if (!user) {
    await context.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
    return null
  }

  return { token, user }
}

export async function requireUser(context) {
  const session = await getSessionUser(context)
  if (!session) {
    return { response: error('Your session expired, please log in again', 401) }
  }
  return session
}

export async function buildAuthResponse(context, userId, status = 200, extraHeaders) {
  const token = await createSession(context, userId)
  const user = await getUserById(context, userId)
  const headers = new Headers(extraHeaders ?? {})
  headers.append(
    'Set-Cookie',
    cookieFor(SESSION_COOKIE, token, context.request, Math.floor(SESSION_LENGTH_MS / 1000)),
  )

  return json(
    { user },
    {
      status,
      headers,
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
        'Set-Cookie': cookieFor(SESSION_COOKIE, '', context.request, 0),
      },
    },
  )
}

export async function storePasskeyChallenge(
  context,
  { challenge, purpose, userId = null, email = '' },
) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + PASSKEY_CHALLENGE_LENGTH_MS).toISOString()

  await context.env.DB.prepare(
    `INSERT INTO auth_challenges (id, user_id, email, purpose, challenge, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, userId, email, purpose, challenge, expiresAt, now)
    .run()

  const headers = new Headers()
  headers.append(
    'Set-Cookie',
    cookieFor(PASSKEY_CHALLENGE_COOKIE, id, context.request, Math.floor(PASSKEY_CHALLENGE_LENGTH_MS / 1000)),
  )

  return { id, headers }
}

export async function getPasskeyChallenge(context, purpose) {
  const challengeId = parseCookies(context.request)[PASSKEY_CHALLENGE_COOKIE]
  if (!challengeId) {
    return null
  }

  const challenge = await context.env.DB.prepare(
    'SELECT * FROM auth_challenges WHERE id = ?',
  )
    .bind(challengeId)
    .first()

  if (!challenge) {
    return null
  }

  if (challenge.purpose !== purpose || new Date(challenge.expires_at).getTime() < Date.now()) {
    await context.env.DB.prepare('DELETE FROM auth_challenges WHERE id = ?').bind(challengeId).run()
    return null
  }

  return challenge
}

export async function clearPasskeyChallenge(context, challengeId = null) {
  const pendingId = challengeId ?? parseCookies(context.request)[PASSKEY_CHALLENGE_COOKIE]

  if (pendingId) {
    await context.env.DB.prepare('DELETE FROM auth_challenges WHERE id = ?').bind(pendingId).run()
  }

  const headers = new Headers()
  headers.append('Set-Cookie', cookieFor(PASSKEY_CHALLENGE_COOKIE, '', context.request, 0))
  return headers
}
