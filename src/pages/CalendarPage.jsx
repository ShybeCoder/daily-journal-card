import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gift,
  NotebookPen,
  PartyPopper,
  Plus,
  Save,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  'w-full rounded-2xl border border-[var(--color-sage-200)] bg-white px-4 py-3 text-[15px] text-[var(--color-ink)] shadow-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-sage-500)] focus:outline-none focus:ring-4 focus:ring-[color:rgba(90,111,87,0.14)]'

function blankForm(date) {
  return {
    id: '',
    title: '',
    date,
    notes: '',
    category: 'event',
    repeatYearly: false,
  }
}

export default function CalendarPage() {
  const [monthDate, setMonthDate] = useState(parseDateKey(todayKey()))
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [calendar, setCalendar] = useState({ entries: [], eventsByDate: {} })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(blankForm(todayKey()))
  const [isOnline, setIsOnline] = useState(navigator.onLine)

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
  const eventsForSelectedDay = calendar.eventsByDate?.[selectedDate] ?? []

  async function reload(targetMonth = monthDate) {
    const data = await apiRequest(`/api/journal/calendar?month=${monthKey(targetMonth)}`)
    setCalendar(data)
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
        body: JSON.stringify(form),
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
      repeatYearly: Boolean(item.repeatYearly),
    })
    setSelectedDate(item.occurrenceDate)
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8dcc0,transparent_24%),radial-gradient(circle_at_top_right,#dde8da,transparent_28%),linear-gradient(180deg,#f7efe1_0%,#f3eadb_100%)]">
      <AppHeader subtitle="Browse past journal cards and keep birthdays and events on the calendar." title="Calendar View" />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {!isOnline ? <OfflineBanner /> : null}
        {error ? <div className="rounded-2xl border border-[var(--color-rose-300)] bg-[var(--color-rose-100)] px-4 py-3 text-sm text-[var(--color-ink)]">{error}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <section className="rounded-[32px] border border-white/50 bg-white/80 p-5 shadow-[0_24px_70px_rgba(91,111,87,0.14)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-display text-5xl leading-none text-[var(--color-ink)]">{monthLabel(monthDate)}</p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">Tap a day to see what happened there and open its journal card.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-sand)]" onClick={() => setMonthDate((current) => shiftMonth(current, -1))} type="button"><ChevronLeft className="h-4 w-4" />Previous</button>
                <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-sand)]" onClick={() => setMonthDate(parseDateKey(todayKey()))} type="button">This month</button>
                <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-sand)]" onClick={() => setMonthDate((current) => shiftMonth(current, 1))} type="button">Next<ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => <div key={label}>{label}</div>)}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2">
              {days.map((day) => {
                const selected = selectedDate === day.key
                const reminders = calendar.eventsByDate?.[day.key] ?? []
                return (
                  <button
                    className={`min-h-[106px] rounded-[24px] border p-3 text-left transition ${selected ? 'border-[var(--color-sage-500)] bg-[var(--color-sage-100)] shadow-sm' : day.isInMonth ? 'border-white/70 bg-white/88 hover:border-[var(--color-sage-300)]' : 'border-transparent bg-white/40 text-[var(--color-muted)]'}`}
                    key={day.key}
                    onClick={() => setSelectedDate(day.key)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-sm font-medium ${day.isToday ? 'text-[var(--color-sage-700)]' : 'text-[var(--color-ink)]'}`}>{day.dayNumber}</span>
                      {day.isToday ? <span className="rounded-full bg-[var(--color-rose-100)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted)]">Today</span> : null}
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sand)] px-2.5 py-1 text-[11px] text-[var(--color-ink)]">
                        <NotebookPen className="h-3.5 w-3.5" />
                        {entries.has(day.key) ? 'Journal saved' : 'Blank card'}
                      </div>
                      {reminders.length ? (
                        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-rose-100)] px-2.5 py-1 text-[11px] text-[var(--color-ink)]">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {reminders.length} reminder{reminders.length === 1 ? '' : 's'}
                        </div>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[32px] border border-white/50 bg-white/82 p-5 shadow-[0_24px_70px_rgba(91,111,87,0.14)] backdrop-blur sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-4xl leading-none text-[var(--color-ink)]">{formatLongDate(selectedDate)}</p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">Open the journal card or add something special to this day.</p>
                </div>
                <Link className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sage-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-sage-700)]" to={selectedDate === todayKey() ? '/today' : `/journal/${selectedDate}`}>
                  <NotebookPen className="h-4 w-4" />
                  Open card
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {eventsForSelectedDay.length ? eventsForSelectedDay.map((item) => (
                  <div className="rounded-[24px] border border-[var(--color-rose-200)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(252,235,229,0.84))] p-4 shadow-sm" key={`${item.id}-${item.occurrenceDate}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[var(--color-ink)]">
                          {item.category === 'birthday' ? <Gift className="h-5 w-5 text-[var(--color-rose-500)]" /> : <PartyPopper className="h-5 w-5 text-[var(--color-sage-600)]" />}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--color-ink)]">{item.title}</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                            {item.category === 'birthday' ? 'Birthday' : 'Event'}
                            {item.repeatYearly ? ' • repeats yearly' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="rounded-full bg-white px-3 py-2 text-xs font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-sand)]" onClick={() => startEditing(item)} type="button">Edit</button>
                        <button className="rounded-full bg-[var(--color-rose-100)] px-3 py-2 text-xs font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-rose-200)]" onClick={() => handleDelete(item.id)} type="button">Delete</button>
                      </div>
                    </div>
                    {item.notes ? <p className="mt-3 text-sm text-[var(--color-muted)]">{item.notes}</p> : null}
                  </div>
                )) : <div className="rounded-[24px] border border-dashed border-[var(--color-sage-200)] bg-white/75 p-5 text-sm text-[var(--color-muted)]">Nothing is set on this date yet. Add a birthday, celebration, appointment, or reminder here.</div>}
              </div>
            </div>

            <div className="rounded-[32px] border border-white/50 bg-white/82 p-5 shadow-[0_24px_70px_rgba(91,111,87,0.14)] backdrop-blur sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-sage-100)] text-[var(--color-sage-700)]">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-4xl leading-none text-[var(--color-ink)]">{form.id ? 'Edit reminder' : 'Add to calendar'}</p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">Birthdays can repeat every year, and any event you set here will appear on the matching journal card.</p>
                </div>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">Title</span>
                  <input className={INPUT} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Mom's birthday, dentist, movie night..." value={form.title} />
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
                          repeatYearly: event.target.value === 'birthday' ? true : current.repeatYearly,
                        }))
                      }
                      value={form.category}
                    >
                      <option value="event">Event</option>
                      <option value="birthday">Birthday</option>
                    </select>
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">Notes</span>
                  <textarea className={`${INPUT} min-h-[120px] resize-y`} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} value={form.notes} />
                </label>
                <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-sand)] px-4 py-3 text-sm text-[var(--color-ink)]">
                  <input checked={form.repeatYearly} className="h-5 w-5 rounded border-[var(--color-sage-300)] text-[var(--color-sage-600)] focus:ring-[var(--color-sage-400)]" onChange={(event) => setForm((current) => ({ ...current, repeatYearly: event.target.checked }))} type="checkbox" />
                  Repeat this every year
                </label>
                <div className="flex flex-wrap gap-3">
                  <button className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sage-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-sage-700)] disabled:opacity-70" disabled={busy || loading} type="submit">
                    <Save className="h-4 w-4" />
                    {busy ? 'Saving...' : form.id ? 'Save changes' : 'Add reminder'}
                  </button>
                  {form.id ? <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-sand)]" onClick={() => setForm(blankForm(selectedDate))} type="button">Cancel edit</button> : null}
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
