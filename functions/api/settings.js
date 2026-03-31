import { requireUser } from '../_lib/auth.js'
import { json } from '../_lib/response.js'

const DEFAULT_THEME = {
  mode: 'preset',
  preset: 'light',
  custom: {},
}

function normalizeThemeColors(custom = {}) {
  return {
    background: typeof custom.background === 'string' ? custom.background : '#f5f6ef',
    surface: typeof custom.surface === 'string' ? custom.surface : '#ffffff',
    panel: typeof custom.panel === 'string' ? custom.panel : '#edf3e6',
    primary: typeof custom.primary === 'string' ? custom.primary : '#7ca36f',
    accent: typeof custom.accent === 'string' ? custom.accent : '#d59a88',
    text: typeof custom.text === 'string' ? custom.text : '#263127',
    muted: typeof custom.muted === 'string' ? custom.muted : '#6c7869',
    star: typeof custom.star === 'string' ? custom.star : '#f0bf45',
    nav: typeof custom.nav === 'string' ? custom.nav : '#9ecf8a',
  }
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
    preset: typeof payload.preset === 'string' && payload.preset.trim() ? payload.preset : 'light',
    custom: normalizeThemeColors(custom),
  }
}

function normalizeSavedThemes(payload = []) {
  return (Array.isArray(payload) ? payload : [])
    .slice(0, 24)
    .map((item) => {
      const theme = normalizeTheme(item?.theme ?? {})
      const name = typeof item?.name === 'string' ? item.name.trim().slice(0, 40) : ''

      if (!name) {
        return null
      }

      return {
        id: typeof item?.id === 'string' && item.id.trim() ? item.id : crypto.randomUUID(),
        name,
        theme: {
          mode: theme.mode,
          preset: theme.preset,
          custom: normalizeThemeColors(theme.custom),
        },
      }
    })
    .filter(Boolean)
}

export async function onRequestGet(context) {
  const session = await requireUser(context)
  if (session.response) return session.response

  const row = await context.env.DB.prepare(
    'SELECT theme_mode, theme_preset, theme_config, custom_themes FROM user_settings WHERE user_id = ?',
  )
    .bind(session.user.id)
    .first()

  if (!row) {
    return json({ theme: DEFAULT_THEME, savedThemes: [] })
  }

  return json({
    theme: {
      mode: row.theme_mode,
      preset: row.theme_preset,
      custom: safeJson(row.theme_config, {}),
    },
    savedThemes: normalizeSavedThemes(safeJson(row.custom_themes, [])),
  })
}

export async function onRequestPut(context) {
  const session = await requireUser(context)
  if (session.response) return session.response

  const body = await context.request.json()
  const theme = normalizeTheme(body.theme)
  const savedThemes = normalizeSavedThemes(body.savedThemes)
  const now = new Date().toISOString()

  await context.env.DB.prepare(
    `INSERT INTO user_settings (user_id, theme_mode, theme_preset, theme_config, custom_themes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       theme_mode = excluded.theme_mode,
       theme_preset = excluded.theme_preset,
       theme_config = excluded.theme_config,
       custom_themes = excluded.custom_themes,
       updated_at = excluded.updated_at`,
  )
    .bind(
      session.user.id,
      theme.mode,
      theme.preset,
      JSON.stringify(theme.custom),
      JSON.stringify(savedThemes),
      now,
      now,
    )
    .run()

  return json({ theme, savedThemes })
}
