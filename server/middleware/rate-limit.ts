/**
 * Rate limiting middleware for public check-in endpoints.
 * Limits to 10 requests per 60 seconds per IP.
 * Only applies to /api/check-ins/open/, /api/check-ins/unsubscribe, /api/check-ins/resubscribe
 */

const RATE_LIMIT = 10
const WINDOW_MS = 60 * 1000

const store = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMITED_PREFIXES = [
  '/api/check-ins/open/',
  '/api/check-ins/unsubscribe',
  '/api/check-ins/resubscribe',
]

export default defineEventHandler((event) => {
  const path = event.path

  if (!RATE_LIMITED_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return
  }

  const now = Date.now()

  // Clean up expired entries
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key)
    }
  }

  const forwardedFor = getHeader(event, 'x-forwarded-for')
  const ip = forwardedFor
    ? forwardedFor.split(',')[0].trim()
    : (event.node.req.socket.remoteAddress ?? 'unknown')

  const key = `${ip}:${path}`
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  entry.count++

  if (entry.count > RATE_LIMIT) {
    setResponseStatus(event, 429)
    return { error: 'Too many requests' }
  }
})
