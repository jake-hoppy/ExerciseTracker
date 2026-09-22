// Ids for optimistic rows. crypto.randomUUID only exists in secure
// contexts, and a phone on the LAN reaches the dev server over plain http.

let counter = 0;

export function pendingId(): string {
  counter += 1;
  return `pending-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}
