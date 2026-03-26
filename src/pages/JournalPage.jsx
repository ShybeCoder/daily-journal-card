import {
  ArrowLeft,
  ArrowRight,
  CalendarHeart,
  CalendarPlus2,
  Check,
  Plus,
  Save,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader.jsx'
import OfflineBanner from '../components/OfflineBanner.jsx'
import { apiRequest } from '../lib/api.js'
import { formatLongDate, parseDateKey, todayKey } from '../lib/dates.js'

const INPUT =
  'w-full rounded-2xl border border-[var(--color-sage-200)] bg-white px-4 py-3 text-[15px] text-[var(--color-ink)] shadow-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-sage-500)] focus:outline-none focus:ring-4 focus:ring-[color:rgba(90,111,87,0.14)]'
const AREA = `${INPUT} min-h-[132px] resize-y`
const MEALS = ['breakfast', 'lunch', 'dinner']
const TEXT_BLOCKS = [
  ['lookingForwardTo', 'Looking Forward To', 'rose', 4, false],
  ['affirmations', 'Affirmations', 'rose', 5, false],
  ['gratitude', 'Gratitude List', 'sage', 5, false],
  ['accomplishments', 'Accomplishments', 'rose', 8, true],
  ['selfCare', 'Self Care', 'sage', 4, false],
  ['ailments', 'Ailments', 'rose', 4, false],
  ['keepInMind', 'Keep In Mind', 'sage', 6, true],
]

function blankTask(index) {
  return { id: `slot-${index + 1}`, label: '', checked: false }
}

function withMinimumTasks(tasks) {
  const next = Array.isArray(tasks) ? [...tasks] : []
  while (next.length < 6) next.push(blankTask(next.length))
  return next
}

function Section({ children, title, tone = 'sage', className = '' }) {
  const toneClass =
    tone === 'rose'
      ? 'border-[var(--color-rose-200)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(252,235,229,0.86))]'
      : 'border-[var(--color-sage-200)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(233,241,233,0.75))]'
  return (
    <section className={`rounded-[28px] border p-5 shadow-sm ${toneClass} ${className}`}>
      <h2 className="mb-4 font-display text-[2rem] leading-none text-[var(--color-ink)]">
        {title}
      </h2>
      {children}
    </section>
  )
}

function CheckRow({ badge, checked, label, onChange }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
      <input
        checked={checked}
        className="h-5 w-5 rounded border-[var(--color-sage-300)] text-[var(--color-sage-600)] focus:ring-[var(--color-sage-400)]"
        onChange={onChange}
        type="checkbox"
      />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <span className="text-sm text-[var(--color-ink)]">{label}</span>
        {badge ? (
          <span className="rounded-full bg-[var(--color-rose-100)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">
            {badge}
          </span>
        ) : null}
      </div>
    </label>
  )
}

function TemplateEditor({ items, onAdd, onChange, onRemove, onSave, saving, withMode = false }) {
  return (
    <div className="mt-5 rounded-[24px] border border-[var(--color-sage-200)] bg-white/85 p-4">
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            className={withMode ? 'grid gap-3 md:grid-cols-[1fr_160px_44px]' : 'flex items-center gap-3'}
            key={item.id}
          >
            <input className={INPUT} onChange={(event) => onChange(index, 'label', event.target.value)} value={item.label} />
            {withMode ? (
              <select className={INPUT} onChange={(event) => onChange(index, 'behavior', event.target.value)} value={item.behavior}>
                <option value="persistent">Keep until changed</option>
                <option value="daily">Daily task</option>
                <option value="weekly">Weekly task</option>
                <option value="monthly">Monthly task</option>
              </select>
            ) : null}
            <button
              aria-label="Remove item"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-rose-100)] text-[var(--color-ink)] transition hover:bg-[var(--color-rose-200)]"
              onClick={() => onRemove(index)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sand)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white" onClick={onAdd} type="button">
          <Plus className="h-4 w-4" />
          Add item
        </button>
        <button className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sage-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-sage-700)] disabled:opacity-70" disabled={saving} onClick={onSave} type="button">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save for future days'}
        </button>
      </div>
    </div>
  )
}

export default function JournalPage() {
  const navigate = useNavigate()
  const { date } = useParams()
  const dateKey = date ?? todayKey()
  const [journal, setJournal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState('idle')
  const [showRoutineEditor, setShowRoutineEditor] = useState(false)
  const [showTodoEditor, setShowTodoEditor] = useState(false)
  const [routineDraft, setRoutineDraft] = useState([])
  const [todoDraft, setTodoDraft] = useState([])
  const [templateBusy, setTemplateBusy] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const skipSaveRef = useRef(true)

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

    async function loadDay() {
      try {
        const data = await apiRequest(`/api/journal/${dateKey}`)
        if (!active) return
        data.todayTasks = withMinimumTasks(data.todayTasks)
        setJournal(data)
        setRoutineDraft(data.routines.map(({ id, label }) => ({ id, label })))
        setTodoDraft(data.todos.map(({ id, label, behavior }) => ({ id, label, behavior })))
        skipSaveRef.current = true
        setSaveState('saved')
      } catch (loadError) {
        if (active) setError(loadError.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDay()
    return () => {
      active = false
    }
  }, [dateKey])

  useEffect(() => {
    if (!journal) return undefined
    if (skipSaveRef.current) {
      skipSaveRef.current = false
      return undefined
    }
    if (!isOnline) {
      setSaveState('error')
      return undefined
    }
    setSaveState('saving')
    const timeout = window.setTimeout(async () => {
      try {
        await apiRequest(`/api/journal/${dateKey}`, {
          method: 'PUT',
          body: JSON.stringify({
            entry: journal.entry,
            routines: journal.routines,
            todos: journal.todos,
            todayTasks: journal.todayTasks,
          }),
        })
        setSaveState('saved')
      } catch (saveError) {
        setSaveState('error')
        setError(saveError.message)
      }
    }, 700)
    return () => window.clearTimeout(timeout)
  }, [dateKey, isOnline, journal])

  function updateEntry(field, value) {
    setJournal((current) => ({ ...current, entry: { ...current.entry, [field]: value } }))
  }

  function toggleList(name, id) {
    setJournal((current) => ({
      ...current,
      [name]: current[name].map((item) => (item.id === id ? { ...item, isDone: !item.isDone } : item)),
    }))
  }

  function updateTodayTask(id, field, value) {
    setJournal((current) => ({
      ...current,
      todayTasks: current.todayTasks.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))
  }

  function addTodayTask() {
    setJournal((current) => ({
      ...current,
      todayTasks: [...current.todayTasks, { id: crypto.randomUUID(), label: '', checked: false }],
    }))
  }

  function changeDraft(setter, index, field, value) {
    setter((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))
  }

  function removeDraft(setter, index) {
    setter((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function saveTemplates(kind) {
    setTemplateBusy(true)
    setError('')
    try {
      await apiRequest('/api/templates', {
        method: 'PUT',
        body: JSON.stringify({ routines: routineDraft, todos: todoDraft }),
      })
      const refreshed = await apiRequest(`/api/journal/${dateKey}`)
      refreshed.todayTasks = withMinimumTasks(refreshed.todayTasks)
      skipSaveRef.current = true
      setJournal(refreshed)
      setSaveState('saved')
      if (kind === 'routine') setShowRoutineEditor(false)
      if (kind === 'todo') setShowTodoEditor(false)
    } catch (templateError) {
      setError(templateError.message)
    } finally {
      setTemplateBusy(false)
    }
  }

  function shiftDate(amount) {
    const next = parseDateKey(dateKey)
    next.setDate(next.getDate() + amount)
    navigate(`/journal/${next.toISOString().slice(0, 10)}`)
  }

  if (loading) {
    return <div className="min-h-screen bg-[var(--color-cream)]"><AppHeader subtitle="Loading today's journal card." title="Daily Journal Card" /></div>
  }

  if (!journal) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)]">
        <AppHeader subtitle="We hit a snag while opening this day." title="Daily Journal Card" />
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-[var(--color-rose-300)] bg-white p-6 text-[var(--color-ink)] shadow-sm">
            {error || 'This day could not be opened right now.'}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f8dcc0,transparent_24%),radial-gradient(circle_at_top_right,#dde8da,transparent_28%),linear-gradient(180deg,#f7efe1_0%,#f3eadb_100%)]">
      <AppHeader subtitle="A private journal card with routines, tasks, and reminders." title="Daily Journal Card" />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {!isOnline ? <OfflineBanner /> : null}
        {error ? <div className="rounded-2xl border border-[var(--color-rose-300)] bg-[var(--color-rose-100)] px-4 py-3 text-sm text-[var(--color-ink)]">{error}</div> : null}

        <section className="rounded-[32px] border border-white/50 bg-white/78 p-5 shadow-[0_24px_70px_rgba(91,111,87,0.14)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Link className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sand)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white" to="/calendar"><ArrowLeft className="h-4 w-4" />Back to calendar</Link>
              <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-sand)]" onClick={() => shiftDate(-1)} type="button"><ArrowLeft className="h-4 w-4" />Previous day</button>
              <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-sand)]" onClick={() => shiftDate(1)} type="button">Next day<ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-[var(--color-sage-100)] px-4 py-2 text-sm text-[var(--color-ink)]">{saveState === 'saving' ? 'Saving...' : saveState === 'error' ? 'Save paused' : 'Saved'}</div>
              <div className="rounded-full bg-[var(--color-rose-100)] px-4 py-2 text-sm text-[var(--color-ink)]">{formatLongDate(dateKey)}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[28px] border border-[var(--color-sage-200)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(240,247,239,0.85))] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-5xl leading-none text-[var(--color-ink)]">{dateKey === todayKey() ? 'Today' : 'Journal card'}</p>
                  <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">Your card saves as you write, so you can move through the day without stopping to think about saving.</p>
                </div>
                <div className="hidden h-16 w-16 items-center justify-center rounded-[24px] bg-[radial-gradient(circle_at_top,#f9e3cb,transparent_55%),var(--color-sage-500)] text-white shadow-sm sm:flex">
                  <Sparkles className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--color-rose-200)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(252,235,229,0.84))] p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[var(--color-ink)]">
                <CalendarHeart className="h-5 w-5 text-[var(--color-rose-500)]" />
                <p className="font-display text-3xl leading-none">On this day</p>
              </div>
              {journal.events.length ? (
                <div className="mt-4 space-y-3">
                  {journal.events.map((event) => (
                    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3" key={event.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-[var(--color-ink)]">{event.title}</p>
                        <span className="rounded-full bg-[var(--color-rose-100)] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">{event.category === 'birthday' ? 'Birthday' : 'Event'}</span>
                      </div>
                      {event.notes ? <p className="mt-2 text-sm text-[var(--color-muted)]">{event.notes}</p> : null}
                    </div>
                  ))}
                </div>
              ) : <p className="mt-4 text-sm text-[var(--color-muted)]">No birthdays or events are tucked into this date yet.</p>}
              <Link className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-sand)]" to="/calendar"><CalendarPlus2 className="h-4 w-4" />Manage calendar</Link>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6">
            <Section title="Food">
              <div className="grid gap-4 md:grid-cols-3">
                {MEALS.map((field) => (
                  <label className="block" key={field}>
                    <span className="mb-2 block text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">{field}</span>
                    <input className={INPUT} onChange={(event) => updateEntry(field, event.target.value)} value={journal.entry[field]} />
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Water / 12 oz">
              <div className="flex flex-wrap gap-3">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                  <button
                    aria-label={`${value * 12} ounces of water`}
                    className={`flex h-14 min-w-14 items-center justify-center rounded-2xl border text-sm font-medium transition ${journal.entry.waterCount >= value ? 'border-[var(--color-sage-600)] bg-[var(--color-sage-600)] text-white shadow-sm' : 'border-[var(--color-sage-200)] bg-white text-[var(--color-ink)] hover:border-[var(--color-sage-400)]'}`}
                    key={value}
                    onClick={() => updateEntry('waterCount', journal.entry.waterCount === value ? value - 1 : value)}
                    type="button"
                  >
                    {journal.entry.waterCount >= value ? <Check className="h-5 w-5" /> : value}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-[var(--color-muted)]">{journal.entry.waterCount * 12} ounces logged today.</p>
            </Section>

            <div className="grid gap-6 lg:grid-cols-2">
              {TEXT_BLOCKS.slice(0, 3).map(([field, label, tone, rows]) => (
                <Section key={field} title={label} tone={tone}>
                  <textarea className={AREA} onChange={(event) => updateEntry(field, event.target.value)} rows={rows} value={journal.entry[field]} />
                </Section>
              ))}
            </div>

            {TEXT_BLOCKS.slice(3, 4).map(([field, label, tone]) => (
              <Section key={field} title={label} tone={tone}>
                <textarea className={`${AREA} min-h-[220px]`} onChange={(event) => updateEntry(field, event.target.value)} rows={8} value={journal.entry[field]} />
              </Section>
            ))}

            <div className="grid gap-6 lg:grid-cols-2">
              {TEXT_BLOCKS.slice(4, 6).map(([field, label, tone, rows]) => (
                <Section key={field} title={label} tone={tone}>
                  <textarea className={AREA} onChange={(event) => updateEntry(field, event.target.value)} rows={rows} value={journal.entry[field]} />
                </Section>
              ))}
            </div>

            {TEXT_BLOCKS.slice(6).map(([field, label, tone]) => (
              <Section key={field} title={label} tone={tone}>
                <textarea className={`${AREA} min-h-[180px]`} onChange={(event) => updateEntry(field, event.target.value)} rows={6} value={journal.entry[field]} />
              </Section>
            ))}
          </div>

          <div className="space-y-6">
            <Section title="Routine">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['bedtime', 'Bedtime'],
                  ['wakeUpTime', 'Wake up'],
                ].map(([field, label]) => (
                  <label className="block" key={field}>
                    <span className="mb-2 block text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">{label}</span>
                    <input className={INPUT} onChange={(event) => updateEntry(field, event.target.value)} type="time" value={journal.entry[field]} />
                  </label>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {journal.routines.length ? journal.routines.map((item) => (
                  <CheckRow checked={item.isDone} key={item.id} label={item.label} onChange={() => toggleList('routines', item.id)} />
                )) : <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-[var(--color-muted)]">No saved routine yet. Add one below.</p>}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sage-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-sage-700)]" onClick={() => setShowRoutineEditor((current) => !current)} type="button">
                  <Save className="h-4 w-4" />
                  {showRoutineEditor ? 'Hide routine editor' : 'Edit routine'}
                </button>
              </div>

              {showRoutineEditor ? (
                <TemplateEditor
                  items={routineDraft}
                  onAdd={() => setRoutineDraft((current) => [...current, { id: crypto.randomUUID(), label: '' }])}
                  onChange={(index, field, value) => changeDraft(setRoutineDraft, index, field, value)}
                  onRemove={(index) => removeDraft(setRoutineDraft, index)}
                  onSave={() => saveTemplates('routine')}
                  saving={templateBusy}
                />
              ) : null}
            </Section>

            <Section title="To Do" tone="rose">
              <div className="space-y-3">
                {journal.todos.length ? journal.todos.map((item) => (
                  <CheckRow badge={item.behavior} checked={item.isDone} key={item.id} label={item.label} onChange={() => toggleList('todos', item.id)} />
                )) : <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-[var(--color-muted)]">No saved tasks yet. Add a few below.</p>}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sage-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-sage-700)]" onClick={() => setShowTodoEditor((current) => !current)} type="button">
                  <Save className="h-4 w-4" />
                  {showTodoEditor ? 'Hide task editor' : 'Edit saved tasks'}
                </button>
              </div>

              {showTodoEditor ? (
                <TemplateEditor
                  items={todoDraft}
                  onAdd={() => setTodoDraft((current) => [...current, { id: crypto.randomUUID(), label: '', behavior: 'daily' }])}
                  onChange={(index, field, value) => changeDraft(setTodoDraft, index, field, value)}
                  onRemove={(index) => removeDraft(setTodoDraft, index)}
                  onSave={() => saveTemplates('todo')}
                  saving={templateBusy}
                  withMode
                />
              ) : null}

              <div className="mt-6 border-t border-[var(--color-rose-200)] pt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-3xl leading-none text-[var(--color-ink)]">Today only</p>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">These lines clear back to blank tomorrow.</p>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-sand)]" onClick={addTodayTask} type="button">
                    <Plus className="h-4 w-4" />
                    Add line
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {journal.todayTasks.map((item) => (
                    <div className="grid items-center gap-3 rounded-2xl bg-white/85 px-4 py-3 shadow-sm sm:grid-cols-[24px_1fr]" key={item.id}>
                      <input checked={item.checked} className="h-5 w-5 rounded border-[var(--color-sage-300)] text-[var(--color-sage-600)] focus:ring-[var(--color-sage-400)]" onChange={() => updateTodayTask(item.id, 'checked', !item.checked)} type="checkbox" />
                      <input className="w-full border-none bg-transparent p-0 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-0" onChange={(event) => updateTodayTask(item.id, 'label', event.target.value)} placeholder="Write a one-time task for today" value={item.label} />
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          </div>
        </div>
      </main>
    </div>
  )
}
