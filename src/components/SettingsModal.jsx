import { Paintbrush, Settings2, Sparkles, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext.jsx'

const FIELDS = [
  ['background', 'Background'],
  ['surface', 'Cards'],
  ['panel', 'Soft panels'],
  ['primary', 'Primary'],
  ['accent', 'Accent'],
  ['text', 'Text'],
  ['muted', 'Muted text'],
  ['star', 'Today star'],
]

function Preview({ theme }) {
  return (
    <div
      className="rounded-[28px] border p-4 shadow-sm"
      style={{
        background: `radial-gradient(circle at top left, ${theme.accent}55, transparent 28%), radial-gradient(circle at top right, ${theme.primary}44, transparent 28%), linear-gradient(180deg, ${theme.background}, ${theme.surface})`,
        borderColor: `${theme.primary}33`,
        color: theme.text,
      }}
    >
      <div className="flex items-center justify-between rounded-2xl p-3" style={{ backgroundColor: theme.surface }}>
        <div>
          <p className="font-display text-2xl">Preview</p>
          <p className="text-sm" style={{ color: theme.muted }}>How your journal will feel</p>
        </div>
        <Sparkles className="h-6 w-6" style={{ color: theme.star }} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl p-3" style={{ backgroundColor: theme.panel }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: theme.muted }}>Routine</p>
          <div className="mt-3 rounded-xl px-3 py-2" style={{ backgroundColor: theme.surface }}>
            Morning meds
          </div>
        </div>
        <div className="rounded-2xl p-3" style={{ backgroundColor: theme.panel }}>
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: theme.muted }}>Event</p>
          <div className="mt-3 rounded-xl px-3 py-2" style={{ backgroundColor: theme.accent, color: theme.text }}>
            Birthday reminder
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SettingsModal() {
  const { closeSettings, presetLabels, presets, resolvedTheme, saveTheme, settingsOpen, themeState } = useTheme()
  const [draft, setDraft] = useState(themeState)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (settingsOpen) {
      setDraft(themeState)
    }
  }, [settingsOpen, themeState])

  if (!settingsOpen) {
    return null
  }

  const previewTheme =
    draft.mode === 'custom' ? { ...(presets[draft.preset] ?? presets.light), ...draft.custom } : presets[draft.preset]

  async function handleSave() {
    setBusy(true)
    try {
      await saveTheme(draft)
      closeSettings()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8">
      <div className="max-h-full w-full max-w-5xl overflow-auto rounded-[32px] border border-white/40 bg-[color:var(--theme-surface)] p-6 shadow-[0_32px_100px_var(--theme-shadow)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-5xl leading-none text-[var(--color-ink)]">
              Theme settings
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Pick a ready-made look or tune every major color yourself.
            </p>
          </div>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-rose-100)] text-[var(--color-ink)] transition hover:bg-[var(--color-rose-200)]"
            onClick={closeSettings}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-[var(--color-sage-200)] bg-[var(--theme-panel)] p-5">
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-[var(--color-sage-600)]" />
                <p className="font-display text-3xl text-[var(--color-ink)]">Preset themes</p>
              </div>
              <div className="mt-4 grid gap-3">
                {Object.entries(presets).map(([key, preset]) => (
                  <button
                    className={`rounded-2xl border px-4 py-3 text-left transition ${draft.preset === key && draft.mode === 'preset' ? 'border-[var(--color-sage-500)] bg-[color:var(--theme-surface)] shadow-sm' : 'border-[var(--color-sage-200)] bg-white/70 hover:bg-[color:var(--theme-surface)]'}`}
                    key={key}
                    onClick={() =>
                      setDraft({
                        mode: 'preset',
                        preset: key,
                        custom: preset,
                      })
                    }
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-[var(--color-ink)]">{presetLabels[key] ?? key}</p>
                        <p className="text-sm text-[var(--color-muted)]">One-click look</p>
                      </div>
                      <div className="flex gap-2">
                        {[preset.background, preset.surface, preset.primary, preset.accent].map((color) => (
                          <span className="h-5 w-5 rounded-full border border-black/10" key={color} style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--color-rose-200)] bg-[color:var(--theme-panel)] p-5">
              <div className="flex items-center gap-3">
                <Paintbrush className="h-5 w-5 text-[var(--color-rose-500)]" />
                <p className="font-display text-3xl text-[var(--color-ink)]">Custom colors</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {FIELDS.map(([field, label]) => (
                  <label className="rounded-2xl bg-white/75 px-4 py-3" key={field}>
                    <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">{label}</span>
                    <div className="flex items-center gap-3">
                      <input
                        className="h-11 w-16 rounded-xl border border-[var(--color-sage-200)] bg-transparent"
                        onChange={(event) =>
                          setDraft((current) => ({
                            mode: 'custom',
                            preset: current.preset,
                            custom: {
                              ...(current.custom ?? resolvedTheme),
                              [field]: event.target.value,
                            },
                          }))
                        }
                        type="color"
                        value={(draft.custom ?? resolvedTheme)[field]}
                      />
                      <span className="text-sm text-[var(--color-muted)]">
                        {(draft.custom ?? resolvedTheme)[field]}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Preview theme={previewTheme} />
            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sage-600)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-sage-700)] disabled:opacity-70"
                disabled={busy}
                onClick={handleSave}
                type="button"
              >
                {busy ? 'Saving...' : 'Save theme'}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-sand)]"
                onClick={closeSettings}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
