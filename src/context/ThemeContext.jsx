/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { apiRequest } from '../lib/api.js'

const ThemeContext = createContext(null)

const PRESETS = {
  light: {
    background: '#f5f6ef',
    surface: '#ffffff',
    panel: '#edf3e6',
    primary: '#7ca36f',
    accent: '#d59a88',
    text: '#263127',
    muted: '#6c7869',
    star: '#f0bf45',
    nav: '#9ecf8a',
  },
  forest: {
    background: '#f7efe1',
    surface: '#fffaf4',
    panel: '#edf4eb',
    primary: '#5a6f57',
    accent: '#d59a88',
    text: '#40362d',
    muted: '#73675d',
    star: '#f2b63d',
    nav: '#5a6f57',
  },
  pastel: {
    background: '#fff4f7',
    surface: '#fffdfd',
    panel: '#f3ecff',
    primary: '#b493d6',
    accent: '#f6b8c8',
    text: '#4a4258',
    muted: '#857a95',
    star: '#ffc97d',
    nav: '#b8dca7',
  },
  dark: {
    background: '#171c1a',
    surface: '#222a26',
    panel: '#28332e',
    primary: '#9dc18f',
    accent: '#e29d84',
    text: '#f6f1e8',
    muted: '#b6b0a5',
    star: '#ffd45f',
    nav: '#86b970',
  },
}

const PRESET_LABELS = {
  light: 'Light',
  forest: 'Forest',
  pastel: 'Pastel',
  dark: 'Dark',
}

function clamp(value) {
  return Math.max(0, Math.min(255, value))
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const expanded = clean.length === 3 ? clean.split('').map((part) => `${part}${part}`).join('') : clean
  const value = Number.parseInt(expanded, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((part) => clamp(Math.round(part)).toString(16).padStart(2, '0')).join('')}`
}

function mix(first, second, amount) {
  const left = hexToRgb(first)
  const right = hexToRgb(second)
  return rgbToHex({
    r: left.r + (right.r - left.r) * amount,
    g: left.g + (right.g - left.g) * amount,
    b: left.b + (right.b - left.b) * amount,
  })
}

function alpha(hex, value) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${value})`
}

function resolveTheme(theme) {
  const preset = PRESETS[theme?.preset] ?? PRESETS.light
  return theme?.mode === 'custom' ? { ...preset, ...(theme.custom ?? {}) } : preset
}

function normalizeThemePayload(theme) {
  return {
    mode: theme?.mode === 'custom' ? 'custom' : 'preset',
    preset: theme?.preset ?? 'light',
    custom: resolveTheme(theme),
  }
}

function applyTheme(theme) {
  const root = document.documentElement
  const vars = {
    '--color-cream': theme.background,
    '--color-sand': mix(theme.background, theme.accent, 0.18),
    '--color-ink': theme.text,
    '--color-muted': theme.muted,
    '--color-sage-100': mix(theme.surface, theme.primary, 0.12),
    '--color-sage-200': mix(theme.surface, theme.primary, 0.22),
    '--color-sage-300': mix(theme.surface, theme.primary, 0.36),
    '--color-sage-400': mix(theme.surface, theme.primary, 0.54),
    '--color-sage-500': mix(theme.surface, theme.primary, 0.7),
    '--color-sage-600': theme.primary,
    '--color-sage-700': mix(theme.primary, theme.text, 0.22),
    '--color-rose-100': mix(theme.surface, theme.accent, 0.12),
    '--color-rose-200': mix(theme.surface, theme.accent, 0.24),
    '--color-rose-300': mix(theme.surface, theme.accent, 0.4),
    '--color-rose-500': theme.accent,
    '--color-star': theme.star,
    '--theme-surface': theme.surface,
    '--theme-panel': theme.panel,
    '--theme-panel-strong': mix(theme.panel, theme.primary, 0.08),
    '--theme-header': alpha(theme.background, 0.85),
    '--theme-shadow': alpha(theme.primary, 0.18),
    '--theme-nav-active': theme.nav ?? theme.primary,
    '--theme-wash-left': mix(theme.background, theme.accent, 0.45),
    '--theme-wash-right': mix(theme.background, theme.primary, 0.3),
    '--theme-wash-bottom': mix(theme.background, theme.surface, 0.4),
    '--theme-white-80': alpha(theme.surface, 0.82),
    '--theme-white-88': alpha(theme.surface, 0.88),
    '--theme-white-95': alpha(theme.surface, 0.95),
  }

  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value))
}

export function ThemeProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [themeState, setThemeState] = useState({
    mode: 'preset',
    preset: 'light',
    custom: PRESETS.light,
  })
  const [savedThemes, setSavedThemes] = useState([])
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    applyTheme(resolveTheme(themeState))
  }, [themeState])

  useEffect(() => {
    let active = true

    async function loadSettings() {
      if (!isAuthenticated) {
        setThemeState({
          mode: 'preset',
          preset: 'light',
          custom: PRESETS.light,
        })
        setSavedThemes([])
        return
      }

      try {
        const data = await apiRequest('/api/settings')
        if (active) {
          const nextTheme = {
            mode: data.theme.mode,
            preset: data.theme.preset,
            custom: { ...(PRESETS[data.theme.preset] ?? PRESETS.light), ...data.theme.custom },
          }
          setThemeState(nextTheme)
          setSavedThemes(data.savedThemes ?? [])
        }
      } catch {
        if (active) {
          setThemeState({
            mode: 'preset',
            preset: 'light',
            custom: PRESETS.light,
          })
          setSavedThemes([])
        }
      }
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [isAuthenticated])

  async function saveTheme(nextTheme, nextSavedThemes = savedThemes) {
    setThemeState(nextTheme)
    setSavedThemes(nextSavedThemes)

    if (!isAuthenticated) {
      return
    }

    await apiRequest('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        theme: normalizeThemePayload(nextTheme),
        savedThemes: nextSavedThemes,
      }),
    })
  }

  const value = {
    presets: PRESETS,
    presetLabels: PRESET_LABELS,
    themeState,
    savedThemes,
    resolvedTheme: resolveTheme(themeState),
    settingsOpen,
    openSettings: () => setSettingsOpen(true),
    closeSettings: () => setSettingsOpen(false),
    saveTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
