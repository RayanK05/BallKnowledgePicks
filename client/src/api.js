export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    const text = await res.text();               // read the body as plain text first
    if (!text) {
      return { ok: false, error: `Empty response (status ${res.status}). Is the server running?` };
    }
    return JSON.parse(text);
  } catch {
    return { ok: false, error: "Can't reach the server" };
  }
}