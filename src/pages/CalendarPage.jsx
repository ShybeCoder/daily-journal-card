import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gift,
  NotebookPen,
  PartyPopper,
  Plus,
  Save,
  Star,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader.jsx'
import OfflineBanner from '../components/OfflineBanner.jsx'
import { apiRequest } from '../lib/api.js'
import {
  buildMonthGrid,
  formatLongDate,
  monthKey,
  monthLabel,
  parseDateKey,
  shiftMonth,
  todayKey,
} from '../lib/dates.js'

const INPUT =
  'w-full rounded-2xl border border-[var(--color-sage-200)] bg-[color:var(--theme-surface)] px-4 py-3 text-[15px] text-[var(--color-ink)] shadow-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-sage-500)] focus:outline-none focus:ring-4 focus:ring-[color:rgba(90,111,87,0.14)]'

function blankForm(date) {
  return {
    id: '',
    title: '',
    date,
    notes: '',
    category: 'event',
    repeatMode: 'none',
    reminders: [],
    reminderDraft: '7',
  }
}

function categoryLabel(category) {
  if (category === 'birthday') return 'birthday'
  if (category === 'appointment') return 'appointment'
  return 'event'
}

function repeatLabel(mode) {
  if (mode === 'weekly') return 'Repeats weekly'
  if (mode === 'monthly') return 'Repeats monthly'
  if (mode === 'yearly') return 'Repeats yearly'
  return 'One time'
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const [monthDate, setMonthDate] = useState(parseDateKey(todayKey()))
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [calendar, setCalendar] = useState({ entries: [], eventsByDate: {} })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(blankForm(todayKey()))
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const lastTapRef = useRef({ key: '', time: 0 })

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    async function loadCalendar() {
      try {
        const data = await apiRequest(`/api/journal/calendar?month=${monthKey(monthDate)}`)
        if (active) setCalendar(data)
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadCalendar()
    return () => {
      active = false
    }
  }, [monthDate])

  useEffect(() => {
    setForm((current) => (current.id ? current : { ...current, date: selectedDate }))
  }, [selectedDate])

  const days = buildMonthGrid(monthDate)
  const entries = new Set(calendar.entries ?? [])
  const eventsForSelectedDay = useMemo(
    () => calendar.eventsByDate?.[selectedDate] ?? [],
    [calendar.eventsByDate, selectedDate],
  )

  async function reload(targetMonth = monthDate) {
    setCalendar(await apiRequest(`/api/journal/calendar?month=${monthKey(targetMonth)}`))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isOnline) {
      setError("You're offline right now. Your calendar will save when you reconnect.")
      return
    }

    setBusy(true)
    setError('')

    try {
      const targetMonth = parseDateKey(form.date)
      await apiRequest(form.id ? `/api/events/${form.id}` : '/api/events', {
        method: form.id ? 'PUT' : 'POST',
        body: JSON.stringify({
          title: form.title,
          date: form.date,
          notes: form.notes,
          category: form.category,
          repeatMode: form.category === 'birthday' ? 'yearly' : form.repeatMode,
          reminders: form.reminders,
        }),
      })
      setMonthDate(targetMonth)
      setSelectedDate(form.date)
      setForm(blankForm(form.date))
      await reload(targetMonth)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id) {
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/api/events/${id}`, { method: 'DELETE' })
      setForm(blankForm(selectedDate))
      await reload()
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setBusy(false)
    }
  }

  function startEditing(item) {
    setForm({
      id: item.id,
      title: item.title,
      date: item.occurrenceDate,
      notes: item.notes,
      category: item.category,
      repeatMode: item.repeatMode,
      reminders: item.reminders ?? [],
      reminderDraft: '7',
    })
    setSelectedDate(item.occurrenceDate)
  }

  function addReminderOffset() {
    const days = Number.parseInt(form.reminderDraft, 10)
    if (!Number.isInteger(days) || days <= 0) {
      return
    }
    setForm((current) => ({
      ...current,
      reminders: [...new Set([...current.reminders, days])].sort((left, right) => left - right),
      reminderDraft: current.reminderDraft,
    }))
  }

  function openDay(dayKey) {
    navigate(dayKey === todayKey() ? '/today' : `/journal/${dayKey}`)
  }

  function handleDayTouch(dayKey) {
    const now = Date.now()
    if (lastTapRef.current.key === dayKey && now - lastTapRef.current.time < 320) {
      lastTapRef.current = { key: '', time: 0 }
      openDay(dayKey)
      return
    }

    lastTapRef.current = { key: dayKey, time: now }
  }

  const primaryAction = form.id ? 'Save changes' : `Add ${categoryLabel(form.category)}`

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--theme-wash-left),transparent_24%),radial-gradient(circle_at_top_right,var(--theme-wash-right),transparent_28%),linear-gradient(180deg,var(--color-cream)_0%,var(--theme-wash-bottom)_100%)]">
      <AppHeader subtitle="Browse past journal cards and keep birthdays, events, appointments, and reminders on the calendar." title="Calendar View" />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {!isOnline ? <OfflineBanner /> : null}
        {error ? <div className="rounded-2xl border border-[var(--color-rose-300)] bg-[var(--color-rose-100)] px-4 py-3 text-sm text-[var(--color-ink)]">{error}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <section className="rounded-[32px] border border-white/50 bg-[var(--theme-white-80)] p-5 shadow-[0_24px_70px_var(--theme-shadow)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-display text-5xl leading-none text-[var(--color-ink)]">{monthLabel(monthDate)}</p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">Tap a day to see that card, add a date, or check what is coming up.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-full bg-[color:var(--theme-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white" onClick={() => setMonthDate((current) => shiftMonth(current, -1))} type="button"><ChevronLeft className="h-4 w-4" />Previous</button>
                <button className="inline-flex items-center gap-2 rounded-full bg-[color:var(--theme-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white" onClick={() => setMonthDate(parseDateKey(todayKey()))} type="button">This month</button>
                <button className="inline-flex items-center gap-2 rounded-full bg-[color:var(--theme-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white" onClick={() => setMonthDate((current) => shiftMonth(current, 1))} type="button">Next<ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)] sm:gap-2 sm:text-xs sm:tracking-[0.18em]">
              {[
                ['Sun', 'S'],
                ['Mon', 'M'],
                ['Tue', 'T'],
                ['Wed', 'W'],
                ['Thu', 'T'],
                ['Fri', 'F'],
                ['Sat', 'S'],
              ].map(([fullLabel, shortLabel]) => (
                <div key={fullLabel}>
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{fullLabel}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-2">
              {days.map((day) => {
                const selected = selectedDate === day.key
                const reminders = calendar.eventsByDate?.[day.key] ?? []
                return (
                  <button
                    className={`min-h-[80px] rounded-[18px] border p-2 text-left transition sm:min-h-[106px] sm:rounded-[24px] sm:p-3 ${selected ? 'border-[var(--color-sage-500)] bg-[var(--color-sage-100)] shadow-sm' : day.isInMonth ? 'border-white/70 bg-[var(--theme-white-88)] hover:border-[var(--color-sage-300)]' : 'border-transparent bg-white/30 text-[var(--color-muted)]'}`}
                    key={day.key}
                    onClick={() => setSelectedDate(day.key)}
                    onDoubleClick={() => openDay(day.key)}
                    onTouchEnd={() => handleDayTouch(day.key)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-[var(--color-ink)] sm:text-sm">{day.dayNumber}</span>
                      {day.isToday ? <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: 'var(--color-star)' }} /> : null}
                    </div>
                    <div className="mt-2 space-y-1.5 sm:mt-4 sm:space-y-2">
                      {entries.has(day.key) ? (
                        <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[var(--color-sand)] px-2 py-1 text-[10px] text-[var(--color-ink)] sm:gap-2 sm:px-2.5 sm:text-[11px]">
                          <NotebookPen className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                          <span className="truncate">Journal saved</span>
                        </div>
                      ) : null}
                      {reminders.length ? (
                        <div className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[var(--color-rose-100)] px-2 py-1 text-[10px] text-[var(--color-ink)] sm:gap-2 sm:px-2.5 sm:text-[11px]">
                          <CalendarDays className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                          <span className="truncate">{reminders.length} item{reminders.length === 1 ? '' : 's'}</span>
                        </div>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[32px] border border-white/50 bg-[var(--theme-white-80)] p-5 shadow-[0_24px_70px_var(--theme-shadow)] backdrop-blur sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-4xl leading-none text-[var(--color-ink)]">{formatLongDate(selectedDate)}</p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">Open the journal card or review what lives on this date.</p>
                </div>
                <Link className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sage-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-sage-700)]" to={selectedDate === todayKey() ? '/today' : `/journal/${selectedDate}`}>
                  <NotebookPen className="h-4 w-4" />
                  Open card
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {eventsForSelectedDay.length ? eventsForSelectedDay.map((item) => (
                  <div className="rounded-[24px] border border-[var(--color-rose-200)] bg-[linear-gradient(180deg,var(--theme-white-95),color-mix(in srgb, var(--color-rose-100) 60%, var(--theme-surface)))] p-4 shadow-sm" key={`${item.id}-${item.occurrenceDate}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--theme-surface)] text-[var(--color-ink)]">
                          {item.category === 'birthday' ? <Gift className="h-5 w-5 text-[var(--color-rose-500)]" /> : <PartyPopper className="h-5 w-5 text-[var(--color-sage-600)]" />}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--color-ink)]">{item.title}</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            {item.category === 'birthday' ? 'Birthday' : item.category === 'appointment' ? 'Appointment' : 'Event'}
                            {' • '}
                            {repeatLabel(item.repeatMode)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="rounded-full bg-[color:var(--theme-surface)] px-3 py-2 text-xs font-medium text-[var(--color-ink)] transition hover:bg-white" onClick={() => startEditing(item)} type="button">Edit</button>
                        <button className="rounded-full bg-[var(--color-rose-100)] px-3 py-2 text-xs font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-rose-200)]" onClick={() => handleDelete(item.id)} type="button">Delete</button>
                      </div>
                    </div>
                    {item.reminders?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.reminders.map((days) => (
                          <span className="rounded-full bg-[color:var(--theme-surface)] px-3 py-1 text-xs text-[var(--color-muted)]" key={days}>
                            Reminder {days} day{days === 1 ? '' : 's'} before
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {item.notes ? <p className="mt-3 text-sm text-[var(--color-muted)]">{item.notes}</p> : null}
                  </div>
                )) : <div className="rounded-[24px] border border-dashed border-[var(--color-sage-200)] bg-[color:var(--theme-surface)] p-5 text-sm text-[var(--color-muted)]">Nothing is set on this date yet. Add an event, birthday, or appointment here.</div>}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/50 bg-[var(--theme-white-80)] p-5 shadow-[0_24px_70px_var(--theme-shadow)] backdrop-blur sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-sage-100)] text-[var(--color-sage-700)]">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-4xl leading-none text-[var(--color-ink)]">{form.id ? 'Edit date' : 'Add to calendar'}</p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">Events show on the actual day, and reminders can pop up ahead of time on your journal card.</p>
                </div>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">Title</span>
                  <input className={INPUT} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Mom's birthday, doctor, movie night..." value={form.title} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">Date</span>
                    <input className={INPUT} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} type="date" value={form.date} />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">Type</span>
                    <select
                      className={INPUT}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          category: event.target.value,
                          repeatMode: event.target.value === 'birthday' ? 'yearly' : current.repeatMode === 'yearly' ? 'none' : current.repeatMode,
                        }))
                      }
                      value={form.category}
                    >
                      <option value="event">Event</option>
                      <option value="birthday">Birthday</option>
                      <option value="appointment">Appointment</option>
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">Repeat</span>
                  <select
                    className={INPUT}
                    disabled={form.category === 'birthday'}
                    onChange={(event) => setForm((current) => ({ ...current, repeatMode: event.target.value }))}
                    value={form.category === 'birthday' ? 'yearly' : form.repeatMode}
                  >
                    <option value="none">Do not repeat</option>
                    <option value="weekly">Repeat weekly</option>
                    <option value="monthly">Repeat monthly</option>
                    <option value="yearly">Repeat yearly</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">Notes</span>
                  <textarea className={`${INPUT} min-h-[120px] resize-y`} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} value={form.notes} />
                </label>

                <div className="rounded-[24px] border border-[var(--color-sage-200)] bg-[var(--theme-panel)] p-4">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">Advance reminders</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input className={INPUT} min="1" onChange={(event) => setForm((current) => ({ ...current, reminderDraft: event.target.value }))} placeholder="How many days before?" type="number" value={form.reminderDraft} />
                    <button className="rounded-full bg-[var(--color-rose-100)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-rose-200)]" onClick={addReminderOffset} type="button">
                      Add reminder
                    </button>
                  </div>
                  {form.reminders.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {form.reminders.map((days) => (
                        <button className="inline-flex items-center gap-2 rounded-full bg-[color:var(--theme-surface)] px-3 py-1 text-xs text-[var(--color-ink)]" key={days} onClick={() => setForm((current) => ({ ...current, reminders: current.reminders.filter((item) => item !== days) }))} type="button">
                          {days} day{days === 1 ? '' : 's'} before
                          <X className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  ) : <p className="mt-3 text-sm text-[var(--color-muted)]">No reminder offsets added yet.</p>}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sage-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-sage-700)] disabled:opacity-70" disabled={busy || loading} type="submit">
                    <Save className="h-4 w-4" />
                    {busy ? 'Saving...' : primaryAction}
                  </button>
                  {form.id ? <button className="inline-flex items-center gap-2 rounded-full bg-[color:var(--theme-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white" onClick={() => setForm(blankForm(selectedDate))} type="button">Cancel edit</button> : null}
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
