import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

export function todayKey() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function parseDateKey(dateKey) {
  return parseISO(`${dateKey}T12:00:00`)
}

export function formatLongDate(dateKey) {
  return format(parseDateKey(dateKey), 'EEEE, MMMM d, yyyy')
}

export function buildMonthGrid(monthDate) {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 0 })

  return eachDayOfInterval({ start, end }).map((day) => ({
    key: format(day, 'yyyy-MM-dd'),
    dayNumber: format(day, 'd'),
    isInMonth: isSameMonth(day, monthDate),
    isToday: format(day, 'yyyy-MM-dd') === todayKey(),
  }))
}

export function monthLabel(monthDate) {
  return format(monthDate, 'MMMM yyyy')
}

export function monthKey(monthDate) {
  return format(monthDate, 'yyyy-MM')
}

export function shiftMonth(monthDate, amount) {
  return addMonths(monthDate, amount)
}
