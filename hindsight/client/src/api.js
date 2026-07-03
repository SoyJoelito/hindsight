const BASE = "/api";

export async function fetchHealth() {
  return (await fetch(`${BASE}/health`)).json();
}

export async function fetchTransactions() {
  return (await fetch(`${BASE}/transactions`)).json();
}

export async function rateTransaction(id, rating) {
  const r = await fetch(`${BASE}/transactions/${id}/rate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });
  return r.json();
}

export async function createLinkToken() {
  const r = await fetch(`${BASE}/plaid/create_link_token`, { method: "POST" });
  return r.json();
}

export async function exchangePublicToken(public_token, institution) {
  const r = await fetch(`${BASE}/plaid/exchange_public_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_token, institution }),
  });
  return r.json();
}

export async function syncTransactions() {
  const r = await fetch(`${BASE}/plaid/sync`, { method: "POST" });
  return r.json();
}

export async function fetchMonthlyReport() {
  return (await fetch(`${BASE}/transactions/report/monthly`)).json();
}

export async function fetchAppearance() {
  return (await fetch(`${BASE}/settings/appearance`)).json();
}

export async function saveAppearance(appearance) {
  const r = await fetch(`${BASE}/settings/appearance`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(appearance),
  });
  return r.json();
}

/* ————— auth ————— */
export async function signup(email, password, name) {
  const r = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  return { ok: r.ok, ...(await r.json()) };
}

export async function login(email, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { ok: r.ok, ...(await r.json()) };
}

export async function logout() {
  await fetch(`${BASE}/auth/logout`, { method: "POST" });
}

export async function fetchMe() {
  const r = await fetch(`${BASE}/auth/me`);
  return r.ok ? r.json() : null;
}

/* ————— push reminders ————— */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function enablePushReminders() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return { ok: false, reason: "This browser doesn't support push reminders." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    return { ok: false, reason: "Reminders stay off until you allow notifications." };

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const { key } = await (await fetch(`${BASE}/notifications/vapid-public-key`)).json();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });

  await fetch(`${BASE}/notifications/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  return { ok: true };
}

export async function sendTestReminder() {
  const r = await fetch(`${BASE}/notifications/test`, { method: "POST" });
  return r.json();
}

/* ————— spending breakdown ————— */
export async function fetchBreakdown() {
  return (await fetch(`${BASE}/transactions/breakdown`)).json();
}

export async function fetchRecurring() {
  return (await fetch(`${BASE}/transactions/recurring`)).json();
}

export async function changeCategory(id, category) {
  const r = await fetch(`${BASE}/transactions/${id}/category`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category }),
  });
  return r.json();
}
