const LEGACY_STARTER_ROUTINES = [
  'Breakfast',
  'Morning Meds',
  'Brush Teeth',
  'Nasal Spray',
  'Wash Face',
  'PT Exercises',
  'First Journal',
  'Lunch',
  'Middle Journal',
  'Afternoon Med',
  'Dinner',
  'Evening Meds',
  'Feed Trouble',
  'Brush Teeth',
  'Nasal Spray',
  'Last Journal',
]

const LEGACY_STARTER_TODOS = [
  { label: 'Trouble Water', behavior: 'daily', intervalDays: 0 },
  { label: 'Litter Box', behavior: 'daily', intervalDays: 0 },
  { label: 'Spray Bugs', behavior: 'daily', intervalDays: 0 },
  { label: 'Laundry', behavior: 'weekly', intervalDays: 0 },
  { label: 'Trash', behavior: 'weekly', intervalDays: 0 },
  { label: 'Dishes', behavior: 'daily', intervalDays: 0 },
]

const FOOD_SLOTS = [
  'breakfast',
  'morningSnack',
  'lunch',
  'afternoonSnack',
  'dinner',
  'eveningSnack',
]

function safeJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function trimText(value, max = 5000) {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function dateFromKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`)
}

function keyFromDate(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(dateKey, amount) {
  const date = dateFromKey(dateKey)
  date.setDate(date.getDate() + amount)
  return keyFromDate(date)
}

function dayDiff(first, second) {
  return Math.floor((dateFromKey(first).getTime() - dateFromKey(second).getTime()) / 86400000)
}

function monthEnd(monthKey) {
  const date = new Date(`${monthKey}-01T12:00:00`)
  date.setMonth(date.getMonth() + 1, 0)
  return keyFromDate(date)
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function occurrenceForMonth(baseDate, monthKey) {
  const [baseYear, baseMonth, baseDay] = baseDate.split('-').map(Number)
  const [year, month] = monthKey.split('-').map(Number)
  if (year < baseYear || (year === baseYear && month < baseMonth)) {
    return null
  }
  const day = Math.min(baseDay, lastDayOfMonth(year, month))
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function occurrenceForYear(baseDate, year) {
  const [baseYear, month, day] = baseDate.split('-').map(Number)
  if (year < baseYear) {
    return null
  }
  const actualDay = Math.min(day, lastDayOfMonth(year, month))
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${actualDay.toString().padStart(2, '0')}`
}

function defaultFoodLog() {
  return FOOD_SLOTS.reduce((all, slot) => {
    all[slot] = { name: '', calories: '', carbs: '', protein: '', fats: '' }
    return all
  }, {})
}

function defaultEntry() {
  return {
    foodLog: defaultFoodLog(),
    lookingForwardTo: '',
    affirmations: '',
    gratitude: '',
    accomplishments: '',
    selfCare: '',
    ailments: '',
    keepInMind: '',
    wakeUpTime: '',
    bedtime: '',
    waterCount: 0,
  }
}

function normalizeFoodLog(value, legacy = {}) {
  const source = value && typeof value === 'object' ? value : {}
  const next = defaultFoodLog()

  FOOD_SLOTS.forEach((slot) => {
    const current = source[slot] && typeof source[slot] === 'object' ? source[slot] : {}
    next[slot] = {
      name: trimText(current.name ?? legacy[slot] ?? '', 160),
      calories: trimText(current.calories ?? '', 12),
      carbs: trimText(current.carbs ?? '', 12),
      protein: trimText(current.protein ?? '', 12),
      fats: trimText(current.fats ?? '', 12),
    }
  })

  return next
}

function normalizeTodayTasks(value) {
  const tasks = (Array.isArray(value) ? value : []).slice(0, 24).map((task, index) => ({
    id: typeof task?.id === 'string' && task.id.trim() ? task.id : `task-${index + 1}`,
    label: trimText(task?.label ?? '', 160),
    status: normalizeCheckStatus(task?.status ?? task?.checked),
  }))

  const saved = tasks.filter((task) => task.label || task.status)
  if (!saved.length || saved[saved.length - 1].label) {
    saved.push({ id: `task-${saved.length + 1}`, label: '', status: null })
  }

  return saved
}

function normalizeEntryList(value) {
  const parsed = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? safeJson(value, null)
      : null

  const source = Array.isArray(parsed)
    ? parsed
    : typeof value === 'string'
      ? trimText(value)
          .split(/\n+/)
          .map((item) => item.trim())
      : []

  return source
    .map((item) => trimText(typeof item === 'string' ? item : item?.text ?? '', 500).trim())
    .filter(Boolean)
    .slice(0, 40)
}

function serializeEntryList(value) {
  return JSON.stringify(normalizeEntryList(value))
}

function normalizeEntry(entry = {}) {
  return {
    foodLog: normalizeFoodLog(entry.foodLog),
    lookingForwardTo: normalizeEntryList(entry.lookingForwardTo),
    affirmations: normalizeEntryList(entry.affirmations),
    gratitude: normalizeEntryList(entry.gratitude),
    accomplishments: normalizeEntryList(entry.accomplishments),
    selfCare: normalizeEntryList(entry.selfCare),
    ailments: normalizeEntryList(entry.ailments),
    keepInMind: trimText(entry.keepInMind),
    wakeUpTime: trimText(entry.wakeUpTime, 20),
    bedtime: trimText(entry.bedtime, 20),
    waterCount: Math.max(0, Math.min(10, Number.parseInt(entry.waterCount, 10) || 0)),
  }
}

function normalizeCheckStatus(value) {
  if (value === true || value === 'done') return 'done'
  if (value === 'skipped') return 'skipped'
  return null
}

function normalizeChecks(source, ids) {
  const values = source && typeof source === 'object' ? source : {}
  return ids.reduce((all, id) => {
    const status = normalizeCheckStatus(values[id])
    if (status) {
      all[id] = status
    }
    return all
  }, {})
}

function normalizeReminders(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .map((days) => Number.parseInt(days, 10))
    .filter((days) => Number.isInteger(days) && days > 0 && days <= 365))]
    .sort((left, right) => left - right)
}

function matchesLegacyRoutines(rows) {
  return (
    rows.length === LEGACY_STARTER_ROUTINES.length &&
    rows.every((row, index) => row.label === LEGACY_STARTER_ROUTINES[index])
  )
}

function matchesLegacyTodos(rows) {
  return (
    rows.length === LEGACY_STARTER_TODOS.length &&
    rows.every((row, index) => (
      row.label === LEGACY_STARTER_TODOS[index].label &&
      row.behavior === LEGACY_STARTER_TODOS[index].behavior &&
      Number(row.interval_days ?? 0) === LEGACY_STARTER_TODOS[index].intervalDays
    ))
  )
}

function occursOnDate(event, dateKey) {
  if (event.repeat_mode === 'weekly') {
    return dateKey >= event.event_date && dayDiff(dateKey, event.event_date) % 7 === 0
  }

  if (event.repeat_mode === 'monthly') {
    return occurrenceForMonth(event.event_date, dateKey.slice(0, 7)) === dateKey
  }

  if (event.repeat_mode === 'yearly') {
    return occurrenceForYear(event.event_date, Number.parseInt(dateKey.slice(0, 4), 10)) === dateKey
  }

  return event.event_date === dateKey
}

function scheduledTaskDate(todo, baseDate, dateKey) {
  if (!baseDate || dateKey < baseDate) {
    return false
  }

  if (todo.behavior === 'weekly') {
    return dayDiff(dateKey, baseDate) % 7 === 0
  }

  if (todo.behavior === 'monthly') {
    return occurrenceForMonth(baseDate, dateKey.slice(0, 7)) === dateKey
  }

  const intervalDays = Math.max(1, todo.interval_days || 0)
  return dayDiff(dateKey, baseDate) % intervalDays === 0
}

function taskState(todo, history, currentChecks, dateKey) {
  const currentStatus = normalizeCheckStatus(currentChecks[todo.id])

  if (todo.behavior === 'daily') {
    return { status: currentStatus, isVisible: true }
  }

  if (currentStatus) {
    return { status: currentStatus, isVisible: true }
  }

  const lastAction = history.find((row) => normalizeCheckStatus(row.todoChecks[todo.id]))
  const lastActionStatus = normalizeCheckStatus(lastAction?.todoChecks?.[todo.id])
  const baseDate = lastAction
    ? lastActionStatus === 'skipped'
      ? addDays(lastAction.entryDate, 1)
      : lastAction.entryDate
    : todo.created_at.slice(0, 10)

  if (!baseDate) {
    return { status: null, isVisible: false }
  }

  return {
    status: null,
    isVisible: scheduledTaskDate(todo, baseDate, dateKey),
  }
}

function hasFoodContent(foodLog) {
  return FOOD_SLOTS.some((slot) => {
    const meal = foodLog?.[slot] ?? {}
    return ['name', 'calories', 'carbs', 'protein', 'fats'].some((field) => trimText(meal[field] ?? '', 160).trim())
  })
}

export function hasMeaningfulJournalRow(row) {
  if (!row) return false

  const entry = normalizeEntry({
    foodLog: safeJson(row.food_log, {}),
    lookingForwardTo: row.looking_forward_to,
    affirmations: row.affirmations,
    gratitude: row.gratitude,
    accomplishments: row.accomplishments,
    selfCare: row.self_care,
    ailments: row.ailments,
    keepInMind: row.keep_in_mind,
    wakeUpTime: row.wake_up_time,
    bedtime: row.bedtime,
    waterCount: row.water_count,
  })
  const todayTasks = normalizeTodayTasks(safeJson(row.today_tasks, []))

  return (
    hasFoodContent(entry.foodLog) ||
    entry.lookingForwardTo.length > 0 ||
    entry.affirmations.length > 0 ||
    entry.gratitude.length > 0 ||
    entry.accomplishments.length > 0 ||
    entry.selfCare.length > 0 ||
    entry.ailments.length > 0 ||
    entry.wakeUpTime.trim() !== '' ||
    entry.bedtime.trim() !== '' ||
    entry.waterCount > 0 ||
    todayTasks.some((task) => task.label.trim())
  )
}

function calendarOccurrences(event, month) {
  const start = `${month}-01`
  const end = monthEnd(month)

  if (event.repeat_mode === 'weekly') {
    const items = []
    let cursor = event.event_date > start ? event.event_date : start
    while (dayDiff(cursor, event.event_date) % 7 !== 0) {
      cursor = addDays(cursor, 1)
    }
    while (cursor <= end) {
      items.push(cursor)
      cursor = addDays(cursor, 7)
    }
    return items
  }

  if (event.repeat_mode === 'monthly') {
    const occurrence = occurrenceForMonth(event.event_date, month)
    return occurrence && occurrence >= start && occurrence <= end ? [occurrence] : []
  }

  if (event.repeat_mode === 'yearly') {
    const occurrence = occurrenceForYear(event.event_date, Number.parseInt(month.slice(0, 4), 10))
    return occurrence && occurrence >= start && occurrence <= end ? [occurrence] : []
  }

  return event.event_date >= start && event.event_date <= end ? [event.event_date] : []
}

export function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function isMonthKey(value) {
  return /^\d{4}-\d{2}$/.test(value)
}

export async function ensureSeedData(context, userId) {
  const [routineRows, todoRows] = await Promise.all([
    context.env.DB.prepare(
      `SELECT id, label FROM routine_items
       WHERE user_id = ? AND is_active = 1
       ORDER BY sort_order ASC, created_at ASC`,
    ).bind(userId).all(),
    context.env.DB.prepare(
      `SELECT id, label, behavior, interval_days, created_at FROM todo_items
       WHERE user_id = ? AND is_active = 1
       ORDER BY sort_order ASC, created_at ASC`,
    ).bind(userId).all(),
  ])

  const statements = []
  const now = new Date().toISOString()

  if (matchesLegacyRoutines(routineRows.results)) {
    routineRows.results.forEach((row) => {
      statements.push(
        context.env.DB.prepare(
          'UPDATE routine_items SET is_active = 0, updated_at = ? WHERE id = ? AND user_id = ?',
        ).bind(now, row.id, userId),
      )
    })
  }

  if (matchesLegacyTodos(todoRows.results)) {
    todoRows.results.forEach((row) => {
      statements.push(
        context.env.DB.prepare(
          'UPDATE todo_items SET is_active = 0, updated_at = ? WHERE id = ? AND user_id = ?',
        ).bind(now, row.id, userId),
      )
    })
  }

  if (statements.length) {
    await context.env.DB.batch(statements)
  }
}

export async function getTemplates(context, userId) {
  await ensureSeedData(context, userId)

  const [routines, todos] = await Promise.all([
    context.env.DB.prepare(
      `SELECT id, label FROM routine_items
       WHERE user_id = ? AND is_active = 1
       ORDER BY sort_order ASC, created_at ASC`,
    ).bind(userId).all(),
    context.env.DB.prepare(
      `SELECT id, label, behavior, interval_days FROM todo_items
       WHERE user_id = ? AND is_active = 1
       ORDER BY sort_order ASC, created_at ASC`,
    ).bind(userId).all(),
  ])

  return {
    routines: routines.results,
    todos: todos.results,
  }
}

export async function loadJournalDay(context, userId, dateKey) {
  const templates = await getTemplates(context, userId)
  const [entryRow, historyRows, eventRows] = await Promise.all([
    context.env.DB.prepare('SELECT * FROM journal_entries WHERE user_id = ? AND entry_date = ?').bind(userId, dateKey).first(),
    context.env.DB.prepare(
      `SELECT entry_date, todo_checks FROM journal_entries
       WHERE user_id = ? AND entry_date <= ?
       ORDER BY entry_date DESC`,
    ).bind(userId, dateKey).all(),
    context.env.DB.prepare(
      `SELECT id, title, notes, event_date, category, repeat_mode, reminders
       FROM calendar_events
       WHERE user_id = ?`,
    ).bind(userId).all(),
  ])

  const legacyFood = {
    breakfast: entryRow?.breakfast ?? '',
    lunch: entryRow?.lunch ?? '',
    dinner: entryRow?.dinner ?? '',
  }

  const entry = entryRow
    ? normalizeEntry({
        foodLog: safeJson(entryRow.food_log, legacyFood),
        lookingForwardTo: entryRow.looking_forward_to,
        affirmations: entryRow.affirmations,
        gratitude: entryRow.gratitude,
        accomplishments: entryRow.accomplishments,
        selfCare: entryRow.self_care,
        ailments: entryRow.ailments,
        keepInMind: entryRow.keep_in_mind,
        wakeUpTime: entryRow.wake_up_time,
        bedtime: entryRow.bedtime,
        waterCount: entryRow.water_count,
      })
    : defaultEntry()

  const routineChecks = safeJson(entryRow?.routine_checks, {})
  const currentTodoChecks = safeJson(entryRow?.todo_checks, {})
  const history = historyRows.results.map((row) => ({
    entryDate: row.entry_date,
    todoChecks: safeJson(row.todo_checks, {}),
  }))

  const events = []
  eventRows.results.forEach((event) => {
    const reminders = normalizeReminders(safeJson(event.reminders, []))
    if (occursOnDate(event, dateKey)) {
      events.push({
        id: `${event.id}-event-${dateKey}`,
        sourceId: event.id,
        title: event.title,
        notes: event.notes,
        category: event.category,
        kind: 'event',
      })
    }
    reminders.forEach((daysBefore) => {
      const targetDate = addDays(dateKey, daysBefore)
      if (occursOnDate(event, targetDate)) {
        events.push({
          id: `${event.id}-reminder-${dateKey}-${daysBefore}`,
          sourceId: event.id,
          title: `${event.title} coming up`,
          notes: daysBefore === 1 ? 'Tomorrow' : `In ${daysBefore} days`,
          category: event.category,
          kind: 'reminder',
          reminderDays: daysBefore,
        })
      }
    })
  })

  return {
    date: dateKey,
    entry,
    routines: templates.routines.map((item) => ({
      ...item,
      status: normalizeCheckStatus(routineChecks[item.id]),
    })),
    todos: templates.todos
      .map((item) => ({
        ...item,
        ...taskState(item, history, currentTodoChecks, dateKey),
      }))
      .filter((item) => item.isVisible),
    todayTasks: normalizeTodayTasks(safeJson(entryRow?.today_tasks, [])),
    events: events.sort((left, right) => left.kind.localeCompare(right.kind) || left.title.localeCompare(right.title)),
  }
}

export async function saveJournalDay(context, userId, dateKey, payload) {
  const templates = await getTemplates(context, userId)
  const entry = normalizeEntry(payload?.entry)
  const routineChecks = normalizeChecks(
    Object.fromEntries((Array.isArray(payload?.routines) ? payload.routines : []).map((item) => [item.id, item.status])),
    templates.routines.map((item) => item.id),
  )
  const todoChecks = normalizeChecks(
    Object.fromEntries((Array.isArray(payload?.todos) ? payload.todos : []).map((item) => [item.id, item.status])),
    templates.todos.map((item) => item.id),
  )
  const now = new Date().toISOString()

  await context.env.DB.prepare(
    `INSERT INTO journal_entries (
      id, user_id, entry_date, food_log, breakfast, lunch, dinner, looking_forward_to,
      affirmations, gratitude, accomplishments, self_care, ailments, keep_in_mind,
      wake_up_time, bedtime, water_count, routine_checks, todo_checks, today_tasks,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, entry_date) DO UPDATE SET
      food_log = excluded.food_log,
      breakfast = excluded.breakfast,
      lunch = excluded.lunch,
      dinner = excluded.dinner,
      looking_forward_to = excluded.looking_forward_to,
      affirmations = excluded.affirmations,
      gratitude = excluded.gratitude,
      accomplishments = excluded.accomplishments,
      self_care = excluded.self_care,
      ailments = excluded.ailments,
      keep_in_mind = excluded.keep_in_mind,
      wake_up_time = excluded.wake_up_time,
      bedtime = excluded.bedtime,
      water_count = excluded.water_count,
      routine_checks = excluded.routine_checks,
      todo_checks = excluded.todo_checks,
      today_tasks = excluded.today_tasks,
      updated_at = excluded.updated_at`,
  )
    .bind(
      crypto.randomUUID(),
      userId,
      dateKey,
      JSON.stringify(entry.foodLog),
      entry.foodLog.breakfast.name,
      entry.foodLog.lunch.name,
      entry.foodLog.dinner.name,
      serializeEntryList(entry.lookingForwardTo),
      serializeEntryList(entry.affirmations),
      serializeEntryList(entry.gratitude),
      serializeEntryList(entry.accomplishments),
      serializeEntryList(entry.selfCare),
      serializeEntryList(entry.ailments),
      entry.keepInMind,
      entry.wakeUpTime,
      entry.bedtime,
      entry.waterCount,
      JSON.stringify(routineChecks),
      JSON.stringify(todoChecks),
      JSON.stringify(normalizeTodayTasks(payload?.todayTasks).filter((item) => item.label || item.status)),
      now,
      now,
    )
    .run()
}

export async function saveTemplates(context, userId, payload) {
  await ensureSeedData(context, userId)
  const routines = (Array.isArray(payload?.routines) ? payload.routines : [])
    .map((item) => ({ id: item.id || crypto.randomUUID(), label: trimText(item.label, 160).trim() }))
    .filter((item) => item.label)
  const todos = (Array.isArray(payload?.todos) ? payload.todos : [])
    .map((item) => ({
      id: item.id || crypto.randomUUID(),
      label: trimText(item.label, 160).trim(),
      behavior: ['daily', 'weekly', 'monthly', 'interval'].includes(item.behavior) ? item.behavior : 'daily',
      intervalDays: Math.max(1, Number.parseInt(item.intervalDays, 10) || 7),
    }))
    .filter((item) => item.label)

  const now = new Date().toISOString()
  const [existingRoutines, existingTodos] = await Promise.all([
    context.env.DB.prepare('SELECT id FROM routine_items WHERE user_id = ? AND is_active = 1').bind(userId).all(),
    context.env.DB.prepare('SELECT id FROM todo_items WHERE user_id = ? AND is_active = 1').bind(userId).all(),
  ])

  const keepRoutineIds = new Set(routines.map((item) => item.id))
  const keepTodoIds = new Set(todos.map((item) => item.id))
  const statements = []

  routines.forEach((item, index) => {
    statements.push(
      context.env.DB.prepare(
        `INSERT INTO routine_items (id, user_id, label, sort_order, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET label = excluded.label, sort_order = excluded.sort_order, is_active = 1, updated_at = excluded.updated_at`,
      ).bind(item.id, userId, item.label, index, now, now),
    )
  })

  todos.forEach((item, index) => {
    statements.push(
      context.env.DB.prepare(
        `INSERT INTO todo_items (id, user_id, label, behavior, interval_days, sort_order, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           label = excluded.label,
           behavior = excluded.behavior,
           interval_days = excluded.interval_days,
           sort_order = excluded.sort_order,
           is_active = 1,
           updated_at = excluded.updated_at`,
      ).bind(item.id, userId, item.label, item.behavior, item.behavior === 'interval' ? item.intervalDays : 0, index, now, now),
    )
  })

  existingRoutines.results.forEach((row) => {
    if (!keepRoutineIds.has(row.id)) {
      statements.push(context.env.DB.prepare('UPDATE routine_items SET is_active = 0, updated_at = ? WHERE id = ? AND user_id = ?').bind(now, row.id, userId))
    }
  })

  existingTodos.results.forEach((row) => {
    if (!keepTodoIds.has(row.id)) {
      statements.push(context.env.DB.prepare('UPDATE todo_items SET is_active = 0, updated_at = ? WHERE id = ? AND user_id = ?').bind(now, row.id, userId))
    }
  })

  if (statements.length) {
    await context.env.DB.batch(statements)
  }

  return getTemplates(context, userId)
}

export function monthBounds(month) {
  return { start: `${month}-01`, end: monthEnd(month) }
}

export function mapCalendarEvents(rows, month) {
  const occurrences = []
  rows.forEach((row) => {
    calendarOccurrences(row, month).forEach((occurrenceDate) => {
      occurrences.push({
        id: row.id,
        title: row.title,
        notes: row.notes,
        category: row.category,
        repeatMode: row.repeat_mode,
        reminders: normalizeReminders(safeJson(row.reminders, [])),
        occurrenceDate,
      })
    })
  })

  return occurrences.sort((left, right) => left.occurrenceDate.localeCompare(right.occurrenceDate) || left.title.localeCompare(right.title))
}

export function normalizeEventInput(payload = {}) {
  const category = ['birthday', 'appointment', 'event'].includes(payload.category) ? payload.category : 'event'
  return {
    title: trimText(payload.title, 160).trim(),
    date: trimText(payload.date, 20),
    notes: trimText(payload.notes, 2000),
    category,
    repeatMode:
      category === 'birthday'
        ? 'yearly'
        : ['none', 'weekly', 'monthly', 'yearly'].includes(payload.repeatMode)
          ? payload.repeatMode
          : 'none',
    reminders: normalizeReminders(payload.reminders),
  }
}
