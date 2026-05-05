'use client'

export default function NotificationSettingsPage() {
  const settings = [
    { id: 'task_assigned', label: 'Task assigned to me', description: 'When someone assigns a task to you' },
    { id: 'task_due', label: 'Task due tomorrow', description: 'Daily reminder for tasks due the next day' },
    { id: 'content_review', label: 'Content needs review', description: 'When content is submitted for your approval' },
    { id: 'comment_mention', label: 'Comment mention', description: 'When someone @mentions you in a comment' },
    { id: 'campaign_update', label: 'Campaign updates', description: 'When a campaign status changes' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-5">Notification Preferences</h3>
      <div className="space-y-4">
        {settings.map(s => (
          <div key={s.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-gray-900 peer-focus:ring-2 peer-focus:ring-gray-300 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
            </label>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4">Notification persistence coming soon — preferences saved locally for now.</p>
    </div>
  )
}
