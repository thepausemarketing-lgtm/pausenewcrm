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

/**
 * Returns the set of user IDs whose work the current user is allowed to see.
 * Rule: self + all subordinates (recursive via the reports_to chain).
 * Admins return null, which means "no filter — see everything".
 *
 * @param supabase  A Supabase client (browser or server)
 * @param userId    The currently-authenticated user's ID
 */
export async function getVisibleUserIds(
  supabase: any,
  userId: string,
): Promise<string[] | null> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, reports_to, role')
    .eq('is_active', true)

  if (!profiles) return [userId]

  // Admins see everything — return null to skip filtering
  const me = (profiles as { id: string; reports_to: string | null; role: string }[])
    .find(p => p.id === userId)
  if (me?.role === 'admin') return null

  // BFS — collect self + all transitive subordinates
  const visible = new Set<string>([userId])
  const queue = [userId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const directReports = (profiles as { id: string; reports_to: string | null }[])
      .filter(p => p.reports_to === current)
    for (const report of directReports) {
      if (!visible.has(report.id)) {
        visible.add(report.id)
        queue.push(report.id)
      }
    }
  }

  return Array.from(visible)
}
