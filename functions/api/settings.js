import { requireUser } from '../_lib/auth.js'
import { json } from '../_lib/response.js'

const DEFAULT_THEME = {
  mode: 'preset',
  preset: 'pastel',
  custom: {},
}

function safeJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function normalizeTheme(payload = {}) {
  const custom = payload.custom && typeof payload.custom === 'object' ? payload.custom : {}
  return {
    mode: payload.mode === 'custom' ? 'custom' : 'preset',
    preset: typeof payload.preset === 'string' && payload.preset.trim() ? payload.preset : 'pastel',
    custom: {
      background: typeof custom.background === 'string' ? custom.background : '#f7efe1',
      surface: typeof custom.surface === 'string' ? custom.surface : '#fffaf4',
      panel: typeof custom.panel === 'string' ? custom.panel : '#edf4eb',
      primary: typeof custom.primary === 'string' ? custom.primary : '#5a6f57',
      accent: typeof custom.accent === 'string' ? custom.accent : '#d59a88',
      text: typeof custom.text === 'string' ? custom.text : '#40362d',
      muted: typeof custom.muted === 'string' ? custom.muted : '#73675d',
      star: typeof custom.star === 'string' ? custom.star : '#f2b63d',
    },
  }
}

export async function onRequestGet(context) {
  const session = await requireUser(context)
  if (session.response) return session.response

  const row = await context.env.DB.prepare(
    'SELECT theme_mode, theme_preset, theme_config FROM user_settings WHERE user_id = ?',
  )
    .bind(session.user.id)
    .first()

  if (!row) {
    return json({ theme: DEFAULT_THEME })
  }

  return json({
    theme: {
      mode: row.theme_mode,
      preset: row.theme_preset,
      custom: safeJson(row.theme_config, {}),
    },
  })
}

export async function onRequestPut(context) {
  const session = await requireUser(context)
  if (session.response) return session.response

  const theme = normalizeTheme((await context.request.json()).theme)
  const now = new Date().toISOString()

  await context.env.DB.prepare(
    `INSERT INTO user_settings (user_id, theme_mode, theme_preset, theme_config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       theme_mode = excluded.theme_mode,
       theme_preset = excluded.theme_preset,
       theme_config = excluded.theme_config,
       updated_at = excluded.updated_at`,
  )
    .bind(
      session.user.id,
      theme.mode,
      theme.preset,
      JSON.stringify(theme.custom),
      now,
      now,
    )
    .run()

  return json({ theme })
}
