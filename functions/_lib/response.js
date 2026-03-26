export function json(data, init = {}) {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'no-store',
      ...(init.headers ?? {}),
    },
    ...init,
  })
}

export function error(message, status = 400) {
  return json({ error: message }, { status })
}
