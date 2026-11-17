/**
 * The one way the UI talks to the backend.
 *
 * Every request carries the acting user in `X-User` — approvals and payment
 * release depend on who is acting (segregation of duties, two-person rule).
 */

let actingUser = ''

export function setActingUser(email: string) {
  actingUser = email
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

type Body = Record<string, unknown> | FormData | undefined

export async function api<T>(path: string, method = 'GET', body?: Body): Promise<T> {
  const headers: Record<string, string> = {}
  if (actingUser) headers['X-User'] = actingUser
  let payload: BodyInit | undefined
  if (body instanceof FormData) payload = body
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch('/api' + path, { method, headers, body: payload })
  } catch {
    throw new ApiError(0, 'Cannot reach the backend — is it running on port 8000?')
  }

  const text = await res.text()
  const data = text ? safeJson(text) : null
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(data) ?? `${res.status} ${res.statusText}`)
  }
  return data as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** FastAPI returns `{detail: "…"}` or, for validation errors, `{detail: [{msg, loc}]}`. */
function errorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return typeof data === 'string' ? data : null
  const detail = (data as { detail?: unknown }).detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((d: { msg?: string; loc?: unknown[] }) =>
        [d.loc?.slice(1).join('.'), d.msg].filter(Boolean).join(': '),
      )
      .join('; ')
  }
  return null
}

/** Rendered page image for the trace viewer (no auth header needed). */
export function pageImageUrl(invoiceId: string, page: number, version: string) {
  return `/api/invoices/${invoiceId}/pages/${page}?dpi=130&v=${encodeURIComponent(version)}`
}

export function documentUrl(invoiceId: string) {
  return `/api/invoices/${invoiceId}/document`
}
