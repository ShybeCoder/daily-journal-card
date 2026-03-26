import { Clock3 } from 'lucide-react'
import { useEffect, useState } from 'react'

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1)
const MINUTES = ['00', '10', '20', '30', '40', '50']

function partsFromValue(value) {
  if (!value) {
    return { hour: '8', minute: '00', period: 'AM' }
  }

  const [rawHour, minute] = value.split(':')
  const hourNumber = Number.parseInt(rawHour, 10)
  const period = hourNumber >= 12 ? 'PM' : 'AM'
  const displayHour = hourNumber % 12 || 12
  const roundedIndex = Math.round(Number.parseInt(minute, 10) / 10)
  const safeMinute = MINUTES[Math.min(5, roundedIndex)] ?? '00'

  return {
    hour: String(displayHour),
    minute: safeMinute,
    period,
  }
}

function valueFromParts({ hour, minute, period }) {
  let hourNumber = Number.parseInt(hour, 10) % 12
  if (period === 'PM') {
    hourNumber += 12
  }
  return `${String(hourNumber).padStart(2, '0')}:${minute}`
}

function displayValue(value) {
  if (!value) return 'Set time'
  const { hour, minute, period } = partsFromValue(value)
  return `${hour}:${minute} ${period}`
}

export default function TimeField({ label, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [parts, setParts] = useState(partsFromValue(value))

  useEffect(() => {
    setParts(partsFromValue(value))
  }, [value])

  function apply(nextParts) {
    setParts(nextParts)
    onChange(valueFromParts(nextParts))
  }

  return (
    <div className="relative">
      <span className="mb-2 block text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </span>
      <button
        className="flex w-full items-center justify-between rounded-2xl border border-[var(--color-sage-200)] bg-[color:var(--theme-surface)] px-4 py-3 text-left text-[15px] text-[var(--color-ink)] shadow-sm transition hover:border-[var(--color-sage-400)]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{displayValue(value)}</span>
        <Clock3 className="h-4 w-4 text-[var(--color-muted)]" />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-[24px] border border-[var(--color-sage-200)] bg-[color:var(--theme-panel-strong)] p-4 shadow-[0_24px_70px_var(--theme-shadow)]">
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="rounded-2xl border border-[var(--color-sage-200)] bg-white px-4 py-3 text-slate-900 shadow-sm" onChange={(event) => apply({ ...parts, hour: event.target.value })} value={parts.hour}>
              {HOURS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
            </select>
            <select className="rounded-2xl border border-[var(--color-sage-200)] bg-white px-4 py-3 text-slate-900 shadow-sm" onChange={(event) => apply({ ...parts, minute: event.target.value })} value={parts.minute}>
              {MINUTES.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
            </select>
            <select className="rounded-2xl border border-[var(--color-sage-200)] bg-white px-4 py-3 text-slate-900 shadow-sm" onChange={(event) => apply({ ...parts, period: event.target.value })} value={parts.period}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <button className="rounded-full bg-[var(--color-sage-600)] px-4 py-2 text-sm font-medium text-white" onClick={() => setOpen(false)} type="button">
              Done
            </button>
            <button
              className="rounded-full bg-[var(--color-rose-100)] px-4 py-2 text-sm font-medium text-[var(--color-ink)]"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              type="button"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
