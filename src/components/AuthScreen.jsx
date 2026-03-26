import { LockKeyhole, NotebookPen, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const INPUT_CLASS =
  'w-full rounded-2xl border border-[var(--color-sage-200)] bg-white px-4 py-3 text-base text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-sage-500)] focus:outline-none focus:ring-4 focus:ring-[color:rgba(90,111,87,0.15)]'

export default function AuthScreen() {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      if (mode === 'login') {
        await login(form)
      } else {
        await register(form)
      }

      navigate('/today', { replace: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8d9bc,transparent_28%),radial-gradient(circle_at_top_right,#dae6d6,transparent_30%),linear-gradient(180deg,#f7efe1_0%,#f3ead8_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:gap-10 lg:px-8">
        <section className="flex-1 pb-10 lg:pb-0">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/50 bg-white/70 px-4 py-2 text-sm text-[var(--color-muted)] shadow-sm backdrop-blur">
            <NotebookPen className="h-4 w-4 text-[var(--color-sage-600)]" />
            Private, synced, and ready every day
          </div>
          <h1 className="mt-8 max-w-xl font-display text-6xl leading-[0.92] text-[var(--color-ink)] sm:text-7xl">
            A softer way to keep up with your day.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--color-muted)]">
            Your journal card opens straight to today, keeps your routines and
            saved task lists ready, and brings birthdays and events onto the
            card when they matter.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Meals
              </p>
              <p className="mt-3 text-sm text-[var(--color-ink)]">
                Breakfast, lunch, dinner, water, and the little care notes that
                keep the day grounded.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Routines
              </p>
              <p className="mt-3 text-sm text-[var(--color-ink)]">
                Save your usual checklist once, then adjust it whenever life
                shifts.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/50 bg-white/80 p-5 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Calendar
              </p>
              <p className="mt-3 text-sm text-[var(--color-ink)]">
                See past cards, keep birthdays and events on the calendar, and
                have them show up on the right day.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full max-w-xl">
          <div className="rounded-[32px] border border-white/50 bg-white/86 p-6 shadow-[0_30px_90px_rgba(76,69,58,0.18)] backdrop-blur sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-4xl text-[var(--color-ink)]">
                  Daily Journal Card
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  Sign in to open today&apos;s card.
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_top,#f9e4cb,transparent_60%),var(--color-sage-500)] text-white shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-8 inline-flex rounded-full bg-[var(--color-sand)] p-1">
              <button
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === 'login'
                    ? 'bg-white text-[var(--color-ink)] shadow-sm'
                    : 'text-[var(--color-muted)]'
                }`}
                onClick={() => setMode('login')}
                type="button"
              >
                Log in
              </button>
              <button
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === 'register'
                    ? 'bg-white text-[var(--color-ink)] shadow-sm'
                    : 'text-[var(--color-muted)]'
                }`}
                onClick={() => setMode('register')}
                type="button"
              >
                Create account
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
                  Email
                </span>
                <input
                  className={INPUT_CLASS}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="you@example.com"
                  type="email"
                  value={form.email}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--color-ink)]">
                  Password
                </span>
                <input
                  className={INPUT_CLASS}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="At least 8 characters"
                  type="password"
                  value={form.password}
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-[var(--color-rose-300)] bg-[var(--color-rose-100)] px-4 py-3 text-sm text-[var(--color-ink)]">
                  {error}
                </div>
              ) : null}

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-sage-600)] px-4 py-3 text-base font-medium text-white transition hover:bg-[var(--color-sage-700)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={busy}
                type="submit"
              >
                <LockKeyhole className="h-4 w-4" />
                {busy
                  ? 'Opening your journal...'
                  : mode === 'login'
                    ? 'Log in'
                    : 'Create account'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
