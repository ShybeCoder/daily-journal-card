import {
  ArrowLeft,
  ArrowRight,
  CalendarHeart,
  CalendarPlus2,
  Plus,
  Star,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader.jsx'
import OfflineBanner from '../components/OfflineBanner.jsx'
import TimeField from '../components/TimeField.jsx'
import { apiRequest } from '../lib/api.js'
import { formatLongDate, parseDateKey, todayKey } from '../lib/dates.js'

const INPUT =
  'w-full rounded-2xl border border-[var(--color-sage-200)] bg-[color:var(--theme-surface)] px-4 py-3 text-[15px] text-[var(--color-ink)] shadow-sm placeholder:text-[var(--color-muted)] focus:border-[var(--color-sage-500)] focus:outline-none focus:ring-4 focus:ring-[color:rgba(90,111,87,0.14)]'
const AREA = `${INPUT} min-h-[132px] resize-y`
const FOOD_FIELDS = [
  ['breakfast', 'Breakfast'],
  ['morningSnack', 'Morning snack'],
  ['lunch', 'Lunch'],
  ['afternoonSnack', 'Afternoon snack'],
  ['dinner', 'Dinner'],
  ['eveningSnack', 'Evening snack'],
]

function withTrailingBlankTask(tasks) {
  const next = Array.isArray(tasks) ? tasks.filter((task) => task.label || task.checked) : []
  if (!next.length || next[next.length - 1].label) {
    next.push({ id: `task-${next.length + 1}`, label: '', checked: false })
  }
  return next
}

function Section({ children, title, tone = 'sage', className = '' }) {
  const toneClass =
    tone === 'rose'
      ? 'border-[var(--color-rose-200)] bg-[linear-gradient(180deg,var(--theme-white-95),color-mix(in srgb, var(--color-rose-100) 65%, var(--theme-surface)))]'
      : 'border-[var(--color-sage-200)] bg-[linear-gradient(180deg,var(--theme-white-95),color-mix(in srgb, var(--color-sage-100) 60%, var(--theme-surface)))]'
  return (
    <section className={`rounded-[28px] border p-5 shadow-sm ${toneClass} ${className}`}>
      <h2 className="mb-4 font-display text-[2rem] leading-none text-[var(--color-ink)]">{title}</h2>
      {children}
    </section>
  )
}

function nutritionTotals(foodLog) {
  const totals = { calories: 0, carbs: 0, protein: 0, fats: 0 }
  Object.values(foodLog).forEach((meal) => {
    ;['calories', 'carbs', 'protein', 'fats'].forEach((key) => {
      totals[key] += Number.parseFloat(meal[key]) || 0
    })
  })
  return totals
}

function taskLabel(task) {
  if (task.behavior === 'interval') return `Every ${task.interval_days} days`
  if (task.behavior === 'weekly') return 'Every 7 days'
  if (task.behavior === 'monthly') return 'Monthly'
  return 'Daily'
}

function TemplateEditor({ items, onAdd, onChange, onRemove, onSave, saving, taskMode = false }) {
  return (
    <div className="mt-5 rounded-[24px] border border-[var(--color-sage-200)] bg-[color:var(--theme-surface)] p-4">
      <div className="space-y-3">
        {items.map((item, index) => (
          <div className="grid gap-3 lg:grid-cols-[1fr_170px_130px_44px]" key={item.id}>
            <input className={INPUT} onChange={(event) => onChange(index, 'label', event.target.value)} value={item.label} />
            {taskMode ? (
              <>
                <select className={INPUT} onChange={(event) => onChange(index, 'behavior', event.target.value)} value={item.behavior}>
                  <option value="daily">Daily task</option>
                  <option value="weekly">Every 7 days</option>
                  <option value="monthly">Monthly task</option>
                  <option value="interval">Every ___ days</option>
                </select>
                <input
                  className={INPUT}
                  disabled={item.behavior !== 'interval'}
                  min="1"
                  onChange={(event) => onChange(index, 'intervalDays', event.target.value)}
                  placeholder="Days"
                  type="number"
                  value={item.behavior === 'interval' ? item.intervalDays : ''}
                />
              </>
            ) : (
              <>
                <div />
                <div />
              </>
            )}
            <button className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-rose-100)] text-[var(--color-ink)] transition hover:bg-[var(--color-rose-200)]" onClick={() => onRemove(index)} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="rounded-full bg-[var(--color-sand)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white" onClick={onAdd} type="button">
          Add item
        </button>
        <button className="rounded-full bg-[var(--color-sage-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-sage-700)] disabled:opacity-70" disabled={saving} onClick={onSave} type="button">
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
        data.todayTasks = withTrailingBlankTask(data.todayTasks)
        setJournal(data)
        setRoutineDraft(data.routines.map(({ id, label }) => ({ id, label })))
        setTodoDraft(
          data.todos.map(({ id, label, behavior, interval_days }) => ({
            id,
            label,
            behavior,
            intervalDays: interval_days || 7,
          })),
        )
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
            todayTasks: journal.todayTasks.filter((task) => task.label || task.checked),
          }),
        })
        setSaveState('saved')
      } catch (saveError) {
        setSaveState('error')
        setError(saveError.message)
      }
    }, 650)

    return () => window.clearTimeout(timeout)
  }, [dateKey, isOnline, journal])

  const totals = useMemo(() => nutritionTotals(journal?.entry.foodLog ?? {}), [journal?.entry.foodLog])

  function updateEntry(field, value) {
    setJournal((current) => ({ ...current, entry: { ...current.entry, [field]: value } }))
  }

  function updateFood(slot, field, value) {
    setJournal((current) => ({
      ...current,
      entry: {
        ...current.entry,
        foodLog: {
          ...current.entry.foodLog,
          [slot]: {
            ...current.entry.foodLog[slot],
            [field]: value,
          },
        },
      },
    }))
  }

  function toggleList(name, id) {
    setJournal((current) => ({
      ...current,
      [name]: current[name].map((item) => (item.id === id ? { ...item, isDone: !item.isDone } : item)),
    }))
  }

  function updateTodayTask(index, field, value) {
    setJournal((current) => {
      const nextTasks = current.todayTasks.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      ))
      return {
        ...current,
        todayTasks: withTrailingBlankTask(nextTasks),
      }
    })
  }

  function updateDraft(setter, index, field, value) {
    setter((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))
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
      refreshed.todayTasks = withTrailingBlankTask(refreshed.todayTasks)
      setJournal(refreshed)
      if (kind === 'routine') setShowRoutineEditor(false)
      if (kind === 'todo') setShowTodoEditor(false)
      skipSaveRef.current = true
      setSaveState('saved')
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
          <div className="rounded-[28px] border border-[var(--color-rose-300)] bg-[color:var(--theme-surface)] p-6 text-[var(--color-ink)] shadow-sm">
            {error || 'This day could not be opened right now.'}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--theme-wash-left),transparent_24%),radial-gradient(circle_at_top_right,var(--theme-wash-right),transparent_28%),linear-gradient(180deg,var(--color-cream)_0%,var(--theme-wash-bottom)_100%)]">
      <AppHeader subtitle="A private journal card with routines, tasks, and reminders." title="Daily Journal Card" />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {!isOnline ? <OfflineBanner /> : null}
        {error ? <div className="rounded-2xl border border-[var(--color-rose-300)] bg-[var(--color-rose-100)] px-4 py-3 text-sm text-[var(--color-ink)]">{error}</div> : null}

        <section className="rounded-[32px] border border-white/50 bg-[var(--theme-white-80)] p-5 shadow-[0_24px_70px_var(--theme-shadow)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Link className="inline-flex items-center gap-2 rounded-full bg-[var(--color-sand)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white" to="/calendar"><ArrowLeft className="h-4 w-4" />Back to calendar</Link>
              <button className="inline-flex items-center gap-2 rounded-full bg-[color:var(--theme-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white" onClick={() => shiftDate(-1)} type="button"><ArrowLeft className="h-4 w-4" />Previous day</button>
              <button className="inline-flex items-center gap-2 rounded-full bg-[color:var(--theme-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white" onClick={() => shiftDate(1)} type="button">Next day<ArrowRight className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-[var(--color-sage-100)] px-4 py-2 text-sm text-[var(--color-ink)]">{saveState === 'saving' ? 'Saving...' : saveState === 'error' ? 'Save paused' : 'Saved'}</div>
              <div className="rounded-full bg-[var(--color-rose-100)] px-4 py-2 text-sm text-[var(--color-ink)]">{formatLongDate(dateKey)}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[28px] border border-[var(--color-sage-200)] bg-[linear-gradient(180deg,var(--theme-white-95),color-mix(in srgb, var(--color-sage-100) 60%, var(--theme-surface)))] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-5xl leading-none text-[var(--color-ink)]">{dateKey === todayKey() ? 'Today' : 'Journal card'}</p>
                  <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">Your card saves as you write, so you can move through the day without stopping to think about saving.</p>
                </div>
                <div className="hidden h-16 w-16 items-center justify-center rounded-[24px] bg-[radial-gradient(circle_at_top,var(--color-rose-100),transparent_55%),var(--color-sage-500)] text-white shadow-sm sm:flex">
                  <Star className="h-7 w-7" style={{ color: 'var(--color-star)' }} />
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--color-rose-200)] bg-[linear-gradient(180deg,var(--theme-white-95),color-mix(in srgb, var(--color-rose-100) 65%, var(--theme-surface)))] p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[var(--color-ink)]">
                <CalendarHeart className="h-5 w-5 text-[var(--color-rose-500)]" />
                <p className="font-display text-3xl leading-none">On this day</p>
              </div>
              {journal.events.length ? (
                <div className="mt-4 space-y-3">
                  {journal.events.map((event) => (
                    <div className="rounded-2xl border border-white/70 bg-[color:var(--theme-surface)] px-4 py-3" key={event.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-[var(--color-ink)]">{event.title}</p>
                        <span className="rounded-full bg-[var(--color-rose-100)] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                          {event.kind === 'reminder'
                            ? 'Reminder'
                            : event.category === 'birthday'
                              ? 'Birthday'
                              : event.category === 'appointment'
                                ? 'Appointment'
                                : 'Event'}
                        </span>
                      </div>
                      {event.notes ? <p className="mt-2 text-sm text-[var(--color-muted)]">{event.notes}</p> : null}
                    </div>
                  ))}
                </div>
              ) : <p className="mt-4 text-sm text-[var(--color-muted)]">No birthdays, events, or reminders are showing on this day yet.</p>}
              <Link className="mt-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--theme-surface)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-white" to="/calendar"><CalendarPlus2 className="h-4 w-4" />Manage calendar</Link>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6">
            <Section title="Food">
              <div className="grid gap-4 xl:grid-cols-2">
                {FOOD_FIELDS.map(([slot, label]) => (
                  <div className="rounded-[24px] border border-[var(--color-sage-200)] bg-[color:var(--theme-surface)] p-4 shadow-sm" key={slot}>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">{label}</span>
                      <input className={INPUT} onChange={(event) => updateFood(slot, 'name', event.target.value)} placeholder="What did you eat?" value={journal.entry.foodLog[slot].name} />
                    </label>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {[
                        ['calories', 'Calories'],
                        ['carbs', 'Carbs'],
                        ['protein', 'Protein'],
                        ['fats', 'Fats'],
                      ].map(([field, fieldLabel]) => (
                        <label className="block" key={field}>
                          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">{fieldLabel}</span>
                          <input className={INPUT} inputMode="decimal" onChange={(event) => updateFood(slot, field, event.target.value)} value={journal.entry.foodLog[slot][field]} />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-[24px] border border-[var(--color-rose-200)] bg-[var(--color-rose-100)] p-4">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">Daily totals</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  {[
                    ['Calories', totals.calories],
                    ['Carbs', totals.carbs],
                    ['Protein', totals.protein],
                    ['Fats', totals.fats],
                  ].map(([label, value]) => (
                    <div className="rounded-2xl bg-[color:var(--theme-surface)] px-4 py-3 text-[var(--color-ink)]" key={label}>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">{label}</p>
                      <p className="mt-2 text-xl font-medium">{Number.isInteger(value) ? value : value.toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Water / 12 oz">
              <div className="flex flex-wrap gap-3">
                {Array.from({ length: 10 }, (_, index) => (index + 1) * 12).map((ounces, index) => (
                  <button
                    aria-label={`${ounces} ounces of water`}
                    className={`flex min-h-14 min-w-18 items-center justify-center rounded-2xl border px-4 text-sm font-medium transition ${journal.entry.waterCount >= index + 1 ? 'border-[var(--color-sage-600)] bg-[var(--color-sage-600)] text-white shadow-sm' : 'border-[var(--color-sage-200)] bg-[color:var(--theme-surface)] text-[var(--color-ink)] hover:border-[var(--color-sage-400)]'}`}
                    key={ounces}
                    onClick={() => updateEntry('waterCount', journal.entry.waterCount === index + 1 ? index : index + 1)}
                    type="button"
                  >
                    {ounces}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-[var(--color-muted)]">{journal.entry.waterCount * 12} ounces logged today.</p>
            </Section>

            {[
              ['lookingForwardTo', 'Looking Forward To', 'rose', 4],
              ['affirmations', 'Affirmations', 'rose', 5],
              ['gratitude', 'Gratitude List', 'sage', 5],
              ['accomplishments', 'Accomplishments', 'rose', 8],
              ['selfCare', 'Self Care', 'sage', 4],
              ['ailments', 'Ailments', 'rose', 4],
              ['keepInMind', 'Keep In Mind', 'sage', 6],
            ].map(([field, label, tone, rows]) => (
              <Section className={field === 'affirmations' || field === 'gratitude' || field === 'selfCare' || field === 'ailments' ? 'lg:col-span-1' : ''} key={field} title={label} tone={tone}>
                <textarea className={`${AREA} ${field === 'accomplishments' ? 'min-h-[220px]' : field === 'keepInMind' ? 'min-h-[180px]' : ''}`} onChange={(event) => updateEntry(field, event.target.value)} rows={rows} value={journal.entry[field]} />
              </Section>
            ))}
          </div>

          <div className="space-y-6">
            <Section title="Routine">
              <div className="grid gap-4 sm:grid-cols-2">
                <TimeField label="Bedtime" onChange={(value) => updateEntry('bedtime', value)} value={journal.entry.bedtime} />
                <TimeField label="Wake up" onChange={(value) => updateEntry('wakeUpTime', value)} value={journal.entry.wakeUpTime} />
              </div>

              <div className="mt-5 space-y-3">
                {journal.routines.length ? journal.routines.map((item) => (
                  <label className="flex items-center gap-3 rounded-2xl bg-[color:var(--theme-surface)] px-4 py-3 shadow-sm" key={item.id}>
                    <input checked={item.isDone} className="h-5 w-5 rounded border-[var(--color-sage-300)] text-[var(--color-sage-600)] focus:ring-[var(--color-sage-400)]" onChange={() => toggleList('routines', item.id)} type="checkbox" />
                    <span className="text-sm text-[var(--color-ink)]">{item.label}</span>
                  </label>
                )) : <p className="rounded-2xl bg-[color:var(--theme-surface)] px-4 py-3 text-sm text-[var(--color-muted)]">No saved routine yet. Add one below.</p>}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button className="rounded-full bg-[var(--color-sage-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-sage-700)]" onClick={() => setShowRoutineEditor((current) => !current)} type="button">
                  {showRoutineEditor ? 'Hide routine editor' : 'Edit routine'}
                </button>
              </div>

              {showRoutineEditor ? (
                <TemplateEditor
                  items={routineDraft}
                  onAdd={() => setRoutineDraft((current) => [...current, { id: crypto.randomUUID(), label: '' }])}
                  onChange={(index, field, value) => updateDraft(setRoutineDraft, index, field, value)}
                  onRemove={(index) => setRoutineDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  onSave={() => saveTemplates('routine')}
                  saving={templateBusy}
                />
              ) : null}
            </Section>

            <Section title="To Do" tone="rose">
              <div className="space-y-3">
                {journal.todos.length ? journal.todos.map((item) => (
                  <label className="flex items-center gap-3 rounded-2xl bg-[color:var(--theme-surface)] px-4 py-3 shadow-sm" key={item.id}>
                    <input checked={item.isDone} className="h-5 w-5 rounded border-[var(--color-sage-300)] text-[var(--color-sage-600)] focus:ring-[var(--color-sage-400)]" onChange={() => toggleList('todos', item.id)} type="checkbox" />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="text-sm text-[var(--color-ink)]">{item.label}</span>
                      <span className="rounded-full bg-[var(--color-rose-100)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted)]">{taskLabel(item)}</span>
                    </div>
                  </label>
                )) : <p className="rounded-2xl bg-[color:var(--theme-surface)] px-4 py-3 text-sm text-[var(--color-muted)]">No saved tasks are due today.</p>}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button className="rounded-full bg-[var(--color-sage-600)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-sage-700)]" onClick={() => setShowTodoEditor((current) => !current)} type="button">
                  {showTodoEditor ? 'Hide task editor' : 'Edit saved tasks'}
                </button>
              </div>

              {showTodoEditor ? (
                <TemplateEditor
                  items={todoDraft}
                  onAdd={() => setTodoDraft((current) => [...current, { id: crypto.randomUUID(), label: '', behavior: 'daily', intervalDays: 7 }])}
                  onChange={(index, field, value) => updateDraft(setTodoDraft, index, field, value)}
                  onRemove={(index) => setTodoDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  onSave={() => saveTemplates('todo')}
                  saving={templateBusy}
                  taskMode
                />
              ) : null}

              <div className="mt-6 border-t border-[var(--color-rose-200)] pt-6">
                <div>
                  <p className="font-display text-3xl leading-none text-[var(--color-ink)]">Today only</p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">New blank lines appear as you type so this section stays light.</p>
                </div>

                <div className="mt-4 space-y-3">
                  {journal.todayTasks.map((item, index) => (
                    <div className="grid items-center gap-3 rounded-2xl bg-[color:var(--theme-surface)] px-4 py-3 shadow-sm sm:grid-cols-[24px_1fr]" key={item.id}>
                      <input checked={item.checked} className="h-5 w-5 rounded border-[var(--color-sage-300)] text-[var(--color-sage-600)] focus:ring-[var(--color-sage-400)]" onChange={() => updateTodayTask(index, 'checked', !item.checked)} type="checkbox" />
                      <input className="w-full border-none bg-transparent p-0 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-0" onChange={(event) => updateTodayTask(index, 'label', event.target.value)} placeholder="Write a one-time task for today" value={item.label} />
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
