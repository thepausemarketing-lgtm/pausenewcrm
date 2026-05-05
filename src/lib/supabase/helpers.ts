/**
 * Type-safe helper to extract client id from a partial Supabase select.
 * Our manual Database interface doesn't support partial select type inference,
 * so we use explicit casting for partial-select results.
 */
export function asId(data: unknown): { id: string } {
  return data as { id: string }
}

export function asRecord<T>(data: unknown): T {
  return data as T
}
