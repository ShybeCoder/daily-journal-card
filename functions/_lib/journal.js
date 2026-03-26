const DEFAULT_ROUTINES = [
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

const DEFAULT_TODOS = [
  ['Trouble Water', 'daily'],
  ['Litter Box', 'daily'],
  ['Spray Bugs', 'daily'],
  ['Laundry', 'weekly'],
  ['Trash', 'weekly'],
  ['Dishes', 'daily'],
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

function fromDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`)
}

function weekStart(dateKey) {
  const date = fromDateKey(dateKey)
  date.setDate(date.getDate() - date.getDay())
  return date.toISOString().slice(0, 10)
}

function monthEnd(monthKey) {
  const date = new Date(`${monthKey}-01T12:00:00`)
  date.setMonth(date.getMonth() + 1, 0)
  return date.toISOString().slice(0, 10)
}

function defaultEntry() {
  return {
    breakfast: '',
    lunch: '',
    dinner: '',
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

function normalizeTodayTasks(value) {
  const tasks = (Array.isArray(value) ? value : []).slice(0, 24).map((task, index) => ({
    id: typeof task?.id === 'string' && task.id.trim() ? task.id : `slot-${index + 1}`,
    label: trimText(task?.label ?? '', 160),
    checked: Boolean(task?.checked),
  }))

  while (tasks.length < 6) {
    tasks.push({ id: `slot-${tasks.length + 1}`, label: '', checked: false })
  }

  return tasks
}

function normalizeEntry(entry = {}) {
  return {
    breakfast: trimText(entry.breakfast),
    lunch: trimText(entry.lunch),
    dinner: trimText(entry.dinner),
    lookingForwardTo: trimText(entry.lookingForwardTo),
    affirmations: trimText(entry.affirmations),
    gratitude: trimText(entry.gratitude),
    accomplishments: trimText(entry.accomplishments),
    selfCare: trimText(entry.selfCare),
    ailments: trimText(entry.ailments),
    keepInMind: trimText(entry.keepInMind),
    wakeUpTime: trimText(entry.wakeUpTime, 20),
    bedtime: trimText(entry.bedtime, 20),
    waterCount: Math.max(0, Math.min(10, Number.parseInt(entry.waterCount, 10) || 0)),
  }
}

function normalizeChecks(source, ids) {
  const values = source && typeof source === 'object' ? source : {}
  return ids.reduce((all, id) => {
    all[id] = Boolean(values[id])
    return all
  }, {})
}

function todoDone(todo, history, dateKey, currentChecks) {
  if (todo.behavior === 'daily') return Boolean(currentChecks[todo.id])

  if (todo.behavior === 'weekly') {
    const start = weekStart(dateKey)
    for (const row of history) {
      if (row.entryDate < start) break
      if (row.todoChecks[todo.id] !== undefined) return Boolean(row.todoChecks[todo.id])
    }
    return false
  }

  if (todo.behavior === 'monthly') {
    const month = dateKey.slice(0, 7)
    for (const row of history) {
      if (!row.entryDate.startsWith(month)) break
      if (row.todoChecks[todo.id] !== undefined) return Boolean(row.todoChecks[todo.id])
    }
    return false
  }

  for (const row of history) {
    if (row.todoChecks[todo.id] !== undefined) return Boolean(row.todoChecks[todo.id])
  }
  return false
}

function occurrenceForYear(eventDate, year) {
  const [, month, day] = eventDate.split('-')
  const date = new Date(`${year}-${month}-${day}T12:00:00`)
  if (date.getMonth() + 1 !== Number.parseInt(month, 10)) date.setDate(0)
  return date.toISOString().slice(0, 10)
}

export function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function isMonthKey(value) {
  return /^\d{4}-\d{2}$/.test(value)
}

export async function ensureSeedData(context, userId) {
  const [routineCount, todoCount] = await Promise.all([
    context.env.DB.prepare('SELECT COUNT(*) AS count FROM routine_items WHERE user_id = ?').bind(userId).first(),
    context.env.DB.prepare('SELECT COUNT(*) AS count FROM todo_items WHERE user_id = ?').bind(userId).first(),
  ])

  const now = new Date().toISOString()
  const statements = []

  if (!Number(routineCount?.count ?? 0)) {
    DEFAULT_ROUTINES.forEach((label, index) => {
      statements.push(
        context.env.DB.prepare(
          `INSERT INTO routine_items (id, user_id, label, sort_order, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, ?, ?)`,
        ).bind(crypto.randomUUID(), userId, label, index, now, now),
      )
    })
  }

  if (!Number(todoCount?.count ?? 0)) {
    DEFAULT_TODOS.forEach(([label, behavior], index) => {
      statements.push(
        context.env.DB.prepare(
          `INSERT INTO todo_items (id, user_id, label, behavior, sort_order, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
        ).bind(crypto.randomUUID(), userId, label, behavior, index, now, now),
      )
    })
  }

  if (statements.length) await context.env.DB.batch(statements)
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
      `SELECT id, label, behavior FROM todo_items
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
      `SELECT id, title, notes, event_date, category, repeat_yearly
       FROM calendar_events
       WHERE user_id = ?
         AND (event_date = ? OR (repeat_yearly = 1 AND substr(event_date, 6, 5) = substr(?, 6, 5)))
       ORDER BY category DESC, title ASC`,
    ).bind(userId, dateKey, dateKey).all(),
  ])

  const entry = entryRow
    ? normalizeEntry({
        breakfast: entryRow.breakfast,
        lunch: entryRow.lunch,
        dinner: entryRow.dinner,
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

  return {
    date: dateKey,
    entry,
    routines: templates.routines.map((item) => ({
      ...item,
      isDone: Boolean(routineChecks[item.id]),
    })),
    todos: templates.todos.map((item) => ({
      ...item,
      isDone: todoDone(item, history, dateKey, currentTodoChecks),
    })),
    todayTasks: normalizeTodayTasks(safeJson(entryRow?.today_tasks, [])),
    events: eventRows.results.map((event) => ({
      id: event.id,
      title: event.title,
      notes: event.notes,
      category: event.category,
      repeatYearly: event.repeat_yearly,
      occurrenceDate: dateKey,
    })),
  }
}

export async function saveJournalDay(context, userId, dateKey, payload) {
  const templates = await getTemplates(context, userId)
  const entry = normalizeEntry(payload?.entry)
  const routineChecks = normalizeChecks(
    Object.fromEntries((Array.isArray(payload?.routines) ? payload.routines : []).map((item) => [item.id, item.isDone])),
    templates.routines.map((item) => item.id),
  )
  const todoChecks = normalizeChecks(
    Object.fromEntries((Array.isArray(payload?.todos) ? payload.todos : []).map((item) => [item.id, item.isDone])),
    templates.todos.map((item) => item.id),
  )
  const now = new Date().toISOString()
  await context.env.DB.prepare(
    `INSERT INTO journal_entries (
      id, user_id, entry_date, breakfast, lunch, dinner, looking_forward_to,
      affirmations, gratitude, accomplishments, self_care, ailments, keep_in_mind,
      wake_up_time, bedtime, water_count, routine_checks, todo_checks, today_tasks,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, entry_date) DO UPDATE SET
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
      entry.breakfast,
      entry.lunch,
      entry.dinner,
      entry.lookingForwardTo,
      entry.affirmations,
      entry.gratitude,
      entry.accomplishments,
      entry.selfCare,
      entry.ailments,
      entry.keepInMind,
      entry.wakeUpTime,
      entry.bedtime,
      entry.waterCount,
      JSON.stringify(routineChecks),
      JSON.stringify(todoChecks),
      JSON.stringify(normalizeTodayTasks(payload?.todayTasks)),
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
      behavior: ['persistent', 'daily', 'weekly', 'monthly'].includes(item.behavior) ? item.behavior : 'daily',
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
        `INSERT INTO todo_items (id, user_id, label, behavior, sort_order, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET label = excluded.label, behavior = excluded.behavior, sort_order = excluded.sort_order, is_active = 1, updated_at = excluded.updated_at`,
      ).bind(item.id, userId, item.label, item.behavior, index, now, now),
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

  if (statements.length) await context.env.DB.batch(statements)
  return getTemplates(context, userId)
}

export function monthBounds(month) {
  return { start: `${month}-01`, end: monthEnd(month) }
}

export function mapCalendarEvent(row, month) {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    category: row.category,
    repeatYearly: row.repeat_yearly,
    occurrenceDate: row.repeat_yearly ? occurrenceForYear(row.event_date, month.slice(0, 4)) : row.event_date,
  }
}
