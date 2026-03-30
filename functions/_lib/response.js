export function json(data, init = {}) {
  const headers = new Headers(init.headers ?? {})

  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-store')
  }

  return Response.json(data, {
    headers,
    ...init,
  })
}

export function error(message, status = 400) {
  return json({ error: message }, { status })
}
