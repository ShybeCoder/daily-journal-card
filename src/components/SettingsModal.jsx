import {
  Fingerprint,
  Paintbrush,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { SECURITY_QUESTIONS } from '../../shared/securityQuestions.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import PasswordField from './PasswordField.jsx'

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
      <div
        className="flex items-center justify-between rounded-2xl p-3"
        style={{ backgroundColor: theme.surface }}
      >
        <div>
          <p className="font-display text-2xl">Preview</p>
          <p className="text-sm" style={{ color: theme.muted }}>
            How your journal will feel
          </p>
        </div>
        <Sparkles className="h-6 w-6" style={{ color: theme.star }} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl p-3" style={{ backgroundColor: theme.panel }}>
          <p
            className="text-xs uppercase tracking-[0.18em]"
            style={{ color: theme.muted }}
          >
            Routine
          </p>
          <div
            className="mt-3 rounded-xl px-3 py-2"
            style={{ backgroundColor: theme.surface }}
          >
            Morning meds
          </div>
        </div>
        <div className="rounded-2xl p-3" style={{ backgroundColor: theme.panel }}>
          <p
            className="text-xs uppercase tracking-[0.18em]"
            style={{ color: theme.muted }}
          >
            Event
          </p>
          <div
            className="mt-3 rounded-xl px-3 py-2"
            style={{ backgroundColor: theme.accent, color: theme.text }}
          >
            Birthday reminder
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionMessage({ error, message }) {
  if (!error && !message) {
    return null
  }

  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm ${
        error
          ? 'border border-[var(--color-rose-300)] bg-[var(--color-rose-100)] text-[var(--color-ink)]'
          : 'border border-[var(--color-sage-200)] bg-white/80 text-[var(--color-ink)]'
      }`}
    >
      {error || message}
    </div>
  )
}

export default function SettingsModal() {
  const {
    changePassword,
    listPasskeys,
    registerPasskey,
    updateRecoveryQuestion,
    user,
  } = useAuth()
  const {
    closeSettings,
    presetLabels,
    presets,
    resolvedTheme,
    saveTheme,
    settingsOpen,
    themeState,
  } = useTheme()

  const [draft, setDraft] = useState(themeState)
  const [themeBusy, setThemeBusy] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [recoveryForm, setRecoveryForm] = useState({
    securityQuestionKey: SECURITY_QUESTIONS[0].key,
    securityAnswer: '',
  })
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [passkeys, setPasskeys] = useState([])
  const [passkeyBusy, setPasskeyBusy] = useState(false)
  const [passkeyError, setPasskeyError] = useState('')
  const [passkeyMessage, setPasskeyMessage] = useState('')

  useEffect(() => {
    if (!settingsOpen) {
      return
    }

    setDraft(themeState)
    setPasswordForm({ newPassword: '', confirmPassword: '' })
    setPasswordError('')
    setPasswordMessage('')
    setRecoveryError('')
    setRecoveryMessage('')
    setPasskeyError('')
    setPasskeyMessage('')
    setRecoveryForm({
      securityQuestionKey: user?.securityQuestionKey || SECURITY_QUESTIONS[0].key,
      securityAnswer: '',
    })

    let active = true

    async function loadPasskeys() {
      try {
        const data = await listPasskeys()
        if (active) {
          setPasskeys(data.passkeys)
        }
      } catch (loadError) {
        if (active) {
          setPasskeyError(loadError.message)
        }
      }
    }

    loadPasskeys()

    return () => {
      active = false
    }
  }, [listPasskeys, settingsOpen, themeState, user?.securityQuestionKey])

  const previewTheme = useMemo(
    () =>
      draft.mode === 'custom'
        ? { ...(presets[draft.preset] ?? presets.light), ...draft.custom }
        : presets[draft.preset],
    [draft, presets],
  )

  if (!settingsOpen) {
    return null
  }

  async function handleThemeSave() {
    setThemeBusy(true)
    try {
      await saveTheme(draft)
      closeSettings()
    } finally {
      setThemeBusy(false)
    }
  }

  async function handlePasswordSave() {
    setPasswordBusy(true)
    setPasswordError('')
    setPasswordMessage('')

    try {
      const data = await changePassword(passwordForm)
      setPasswordForm({ newPassword: '', confirmPassword: '' })
      setPasswordMessage(data.message || 'Your password has been updated.')
    } catch (saveError) {
      setPasswordError(saveError.message)
    } finally {
      setPasswordBusy(false)
    }
  }

  async function handleRecoverySave() {
    setRecoveryBusy(true)
    setRecoveryError('')
    setRecoveryMessage('')

    try {
      const data = await updateRecoveryQuestion(recoveryForm)
      setRecoveryForm((current) => ({ ...current, securityAnswer: '' }))
      setRecoveryMessage(data.message || 'Your recovery question has been updated.')
    } catch (saveError) {
      setRecoveryError(saveError.message)
    } finally {
      setRecoveryBusy(false)
    }
  }

  async function handlePasskeySave() {
    setPasskeyBusy(true)
    setPasskeyError('')
    setPasskeyMessage('')

    try {
      const data = await registerPasskey()
      const refreshed = await listPasskeys()
      setPasskeys(refreshed.passkeys)
      setPasskeyMessage(data.message || 'Passkey added.')
    } catch (saveError) {
      setPasskeyError(saveError.message)
    } finally {
      setPasskeyBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8">
      <div className="max-h-full w-full max-w-6xl overflow-auto rounded-[32px] border border-white/40 bg-[color:var(--theme-surface)] p-6 shadow-[0_32px_100px_var(--theme-shadow)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-5xl leading-none text-[var(--color-ink)]">
              Settings
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Change your look, update your password, and set up account recovery tools.
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
                <ShieldCheck className="h-5 w-5 text-[var(--color-sage-600)]" />
                <p className="font-display text-3xl text-[var(--color-ink)]">
                  Password reset
                </p>
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Pick a new password here whenever you want to change it.
              </p>
              <div className="mt-4 space-y-4">
                <PasswordField
                  autoComplete="new-password"
                  label="New password"
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                  onToggle={() => setShowPassword((current) => !current)}
                  placeholder="At least 8 characters"
                  value={passwordForm.newPassword}
                  visible={showPassword}
                />
                <PasswordField
                  autoComplete="new-password"
                  label="Confirm new password"
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  onToggle={() => setShowPassword((current) => !current)}
                  placeholder="Type it again"
                  value={passwordForm.confirmPassword}
                  visible={showPassword}
                />
                <SectionMessage error={passwordError} message={passwordMessage} />
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sage-600)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-sage-700)] disabled:opacity-70"
                  disabled={passwordBusy}
                  onClick={handlePasswordSave}
                  type="button"
                >
                  {passwordBusy ? 'Saving...' : 'Update password'}
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--color-sage-200)] bg-[var(--theme-panel)] p-5">
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-[var(--color-sage-600)]" />
                <p className="font-display text-3xl text-[var(--color-ink)]">
                  Recovery question
                </p>
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                This is what the forgot-password button will ask if you ever get locked out.
              </p>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
                    Security question
                  </span>
                  <select
                    className="w-full rounded-2xl border border-[var(--color-sage-200)] bg-white px-4 py-3 text-base text-[var(--color-ink)] focus:border-[var(--color-sage-500)] focus:outline-none focus:ring-4 focus:ring-[color:rgba(90,111,87,0.15)]"
                    onChange={(event) =>
                      setRecoveryForm((current) => ({
                        ...current,
                        securityQuestionKey: event.target.value,
                      }))
                    }
                    value={recoveryForm.securityQuestionKey}
                  >
                    {SECURITY_QUESTIONS.map((question) => (
                      <option key={question.key} value={question.key}>
                        {question.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
                    Answer
                  </span>
                  <input
                    className="w-full rounded-2xl border border-[var(--color-sage-200)] bg-white px-4 py-3 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-sage-500)] focus:outline-none focus:ring-4 focus:ring-[color:rgba(90,111,87,0.15)]"
                    onChange={(event) =>
                      setRecoveryForm((current) => ({
                        ...current,
                        securityAnswer: event.target.value,
                      }))
                    }
                    placeholder={
                      user?.hasRecoveryQuestion
                        ? 'Enter a new answer to update it'
                        : 'Your answer'
                    }
                    type="text"
                    value={recoveryForm.securityAnswer}
                  />
                </label>
                <SectionMessage error={recoveryError} message={recoveryMessage} />
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-sand)] disabled:opacity-70"
                  disabled={recoveryBusy}
                  onClick={handleRecoverySave}
                  type="button"
                >
                  {recoveryBusy
                    ? 'Saving...'
                    : user?.hasRecoveryQuestion
                      ? 'Update question'
                      : 'Save question'}
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--color-rose-200)] bg-[color:var(--theme-panel)] p-5">
              <div className="flex items-center gap-3">
                <Fingerprint className="h-5 w-5 text-[var(--color-rose-500)]" />
                <p className="font-display text-3xl text-[var(--color-ink)]">
                  Passkeys
                </p>
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Add face, fingerprint, or device unlock as an optional way to sign in.
              </p>
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-white/75 px-4 py-3 text-sm text-[var(--color-ink)]">
                  {passkeys.length
                    ? `Saved passkeys: ${passkeys.length}`
                    : 'No passkeys saved yet.'}
                </div>
                {passkeys.length ? (
                  <div className="grid gap-3">
                    {passkeys.map((passkey) => (
                      <div
                        className="rounded-2xl bg-white/75 px-4 py-3 text-sm text-[var(--color-ink)]"
                        key={passkey.id}
                      >
                        Added{' '}
                        {new Date(passkey.createdAt).toLocaleDateString(undefined, {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    ))}
                  </div>
                ) : null}
                <SectionMessage error={passkeyError} message={passkeyMessage} />
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-rose-500)] px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-95 disabled:opacity-70"
                  disabled={passkeyBusy}
                  onClick={handlePasskeySave}
                  type="button"
                >
                  {passkeyBusy ? 'Waiting for your device...' : 'Add passkey'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Preview theme={previewTheme} />

            <div className="rounded-[28px] border border-[var(--color-sage-200)] bg-[var(--theme-panel)] p-5">
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-[var(--color-sage-600)]" />
                <p className="font-display text-3xl text-[var(--color-ink)]">
                  Preset themes
                </p>
              </div>
              <div className="mt-4 grid gap-3">
                {Object.entries(presets).map(([key, preset]) => (
                  <button
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      draft.preset === key && draft.mode === 'preset'
                        ? 'border-[var(--color-sage-500)] bg-[color:var(--theme-surface)] shadow-sm'
                        : 'border-[var(--color-sage-200)] bg-white/70 hover:bg-[color:var(--theme-surface)]'
                    }`}
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
                        <p className="font-medium text-[var(--color-ink)]">
                          {presetLabels[key] ?? key}
                        </p>
                        <p className="text-sm text-[var(--color-muted)]">
                          One-click look
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {[
                          preset.background,
                          preset.surface,
                          preset.primary,
                          preset.accent,
                        ].map((color) => (
                          <span
                            className="h-5 w-5 rounded-full border border-black/10"
                            key={color}
                            style={{ backgroundColor: color }}
                          />
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
                <p className="font-display text-3xl text-[var(--color-ink)]">
                  Custom colors
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {FIELDS.map(([field, label]) => (
                  <label className="rounded-2xl bg-white/75 px-4 py-3" key={field}>
                    <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
                      {label}
                    </span>
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

            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sage-600)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-sage-700)] disabled:opacity-70"
                disabled={themeBusy}
                onClick={handleThemeSave}
                type="button"
              >
                {themeBusy ? 'Saving...' : 'Save theme'}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-sand)]"
                onClick={closeSettings}
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
