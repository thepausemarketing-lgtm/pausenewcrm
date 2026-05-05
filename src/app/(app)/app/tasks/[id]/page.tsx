import { redirect } from 'next/navigation'

// Task detail is now an inline drawer — redirect to the list so the user can open it there
export default async function TaskPage() {
  redirect('/app/tasks')
}
