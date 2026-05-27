import { clientAuth } from "./firebase-client"

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: any
}

export async function apiClient<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, headers, ...restOptions } = options

  const defaultHeaders: Record<string, string> = {}
  if (
    body !== undefined &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof File)
  ) {
    defaultHeaders["Content-Type"] = "application/json"
  }

  const mergedHeaders = {
    ...defaultHeaders,
    ...headers,
  }

  const fetchOptions: RequestInit = {
    credentials: "include",
    ...restOptions,
    headers: mergedHeaders,
  }

  if (body !== undefined) {
    fetchOptions.body =
      typeof body === "object" &&
      !(body instanceof FormData) &&
      !(body instanceof Blob) &&
      !(body instanceof File)
        ? JSON.stringify(body)
        : body
  }

  async function send() {
    return fetch(url, fetchOptions)
  }

  let res = await send()

  if (res.status === 401) {
    const user = clientAuth.currentUser
    if (user) {
      try {
        const freshToken = await user.getIdToken(true)
        const refreshRes = await fetch("/api/auth/refresh-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ idToken: freshToken }),
        })
        if (refreshRes.ok) {
          res = await send()
        }
      } catch (refreshErr) {
        console.error("[apiClient] Token refresh failed:", refreshErr)
      }
    }
  }

  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`
    try {
      const data = await res.json()
      if (data && data.error) {
        errorMsg = data.error
      }
    } catch (_) {
      // ignore json parse error
    }
    throw new Error(errorMsg)
  }

  if (res.status === 204) {
    return {} as T
  }

  try {
    return (await res.json()) as T
  } catch (err) {
    return {} as T
  }
}
