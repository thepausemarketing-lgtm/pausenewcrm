'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Settings2, Trash2, ExternalLink, Users } from 'lucide-react'
import { toast } from 'sonner'
import EmptyState from '@/components/shared/EmptyState'
import AddInfluencerModal from './AddInfluencerModal'

export type PipelineStep = { id: string; step_order: number; step_name: string }
export type CampaignInfluencer = {
  id: string
  influencer_id: string
  deal_type: string
  amount: number | null
  post_url: string | null
  notes: string | null
  influencer: { name: string; handle: string | null; platform: string; followers: number | null; engagement_rate: number | null }
  completions: { step_id: string }[]
}

interface Props {
  campaignId: string
  initialSteps: PipelineStep[]
  initialInfluencers: CampaignInfluencer[]
  currentUserId: string
}

function fmt(n: number | null) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

export default function CampaignInfluencersSection({ campaignId, initialSteps, initialInfluencers, currentUserId }: Props) {
  const supabase = createClient()

  const [steps, setSteps] = useState<PipelineStep[]>(initialSteps)
  const [influencers, setInfluencers] = useState<CampaignInfluencer[]>(initialInfluencers)
  const [showSetup, setShowSetup] = useState(initialSteps.length === 0)
  const [draftSteps, setDraftSteps] = useState<string[]>(
    initialSteps.length > 0 ? initialSteps.map(s => s.step_name) : ['Finalized', 'Posted']
  )
  const [showAddInfluencer, setShowAddInfluencer] = useState(false)
  const [savingSteps, setSavingSteps] = useState(false)

  // Flat set of completed keys: `${campaignInfluencerId}:${stepId}`
  const [completions, setCompletions] = useState<Set<string>>(() => {
    const s = new Set<string>()
    initialInfluencers.forEach(inf =>
      inf.completions.forEach(c => s.add(`${inf.id}:${c.step_id}`))
    )
    return s
  })

  /* ── Pipeline setup ── */
  const addDraftStep = () => setDraftSteps(p => [...p, ''])
  const removeDraftStep = (i: number) => setDraftSteps(p => p.filter((_, idx) => idx !== i))
  const updateDraftStep = (i: number, v: string) => setDraftSteps(p => p.map((s, idx) => idx === i ? v : s))

  const saveSteps = async () => {
    const valid = draftSteps.map(s => s.trim()).filter(Boolean)
    if (!valid.length) return
    setSavingSteps(true)

    await (supabase as any).from('campaign_pipeline_steps').delete().eq('campaign_id', campaignId)
    const { data, error } = await (supabase as any)
      .from('campaign_pipeline_steps')
      .insert(valid.map((name, i) => ({ campaign_id: campaignId, step_order: i + 1, step_name: name })))
      .select()

    if (error) { toast.error('Failed to save pipeline'); setSavingSteps(false); return }
    setSteps(data)
    setCompletions(new Set()) // reset since step IDs changed
    setShowSetup(false)
    toast.success('Pipeline saved')
    setSavingSteps(false)
  }

  /* ── Checkbox toggle ── */
  const toggleStep = async (campaignInfluencerId: string, stepId: string) => {
    const key = `${campaignInfluencerId}:${stepId}`
    const wasDone = completions.has(key)

    // Optimistic update
    setCompletions(prev => {
      const next = new Set(prev)
      wasDone ? next.delete(key) : next.add(key)
      return next
    })

    if (wasDone) {
      const { error } = await (supabase as any)
        .from('influencer_step_completions')
        .delete()
        .eq('campaign_influencer_id', campaignInfluencerId)
        .eq('step_id', stepId)
      if (error) {
        // Revert
        setCompletions(prev => { const next = new Set(prev); next.add(key); return next })
        toast.error('Could not unmark step')
      }
    } else {
      const { error } = await (supabase as any)
        .from('influencer_step_completions')
        .insert({ campaign_influencer_id: campaignInfluencerId, step_id: stepId, completed_by: currentUserId })
      if (error) {
        setCompletions(prev => { const next = new Set(prev); next.delete(key); return next })
        toast.error('Could not mark step')
      }
    }
  }

  /* ── Remove influencer ── */
  const removeInfluencer = async (id: string) => {
    await (supabase as any).from('campaign_influencers').delete().eq('id', id)
    setInfluencers(prev => prev.filter(i => i.id !== id))
    setCompletions(prev => {
      const next = new Set(prev)
      for (const key of [...next]) { if (key.startsWith(`${id}:`)) next.delete(key) }
      return next
    })
    toast.success('Removed')
  }

  /* ── Update post URL inline ── */
  const updatePostUrl = async (influencerId: string, url: string) => {
    await (supabase as any).from('campaign_influencers').update({ post_url: url || null }).eq('id', influencerId)
    setInfluencers(prev => prev.map(i => i.id === influencerId ? { ...i, post_url: url || null } : i))
  }

  /* ── Pipeline setup view ── */
  if (showSetup) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Define the steps your team tracks for each influencer in this campaign. You can edit these later.
        </p>
        <div className="space-y-2 max-w-sm">
          {draftSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}.</span>
              <Input
                value={step}
                onChange={e => updateDraftStep(i, e.target.value)}
                placeholder={`Step ${i + 1} name`}
                className="h-8 text-sm"
                onKeyDown={e => e.key === 'Enter' && addDraftStep()}
              />
              <button
                onClick={() => removeDraftStep(i)}
                className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={addDraftStep} className="gap-1.5">
            <Plus size={12} /> Add Step
          </Button>
          <Button size="sm" onClick={saveSteps} disabled={savingSteps || !draftSteps.some(s => s.trim())}>
            {savingSteps ? 'Saving…' : 'Save Pipeline'}
          </Button>
          {steps.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setShowSetup(false)}>Cancel</Button>
          )}
        </div>
      </div>
    )
  }

  /* ── Main table view ── */
  return (
    <div className="space-y-3">
      {/* Actions row */}
      <div className="flex items-center gap-2 justify-end">
        <Button
          size="sm" variant="ghost"
          onClick={() => { setDraftSteps(steps.map(s => s.step_name)); setShowSetup(true) }}
          className="gap-1.5 text-gray-500 hover:text-gray-800"
        >
          <Settings2 size={13} /> Edit Steps
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowAddInfluencer(true)} className="gap-1.5">
          <Plus size={13} /> Add Influencer
        </Button>
      </div>

      {influencers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No influencers yet"
          description="Add influencers to start tracking the pipeline"
          action={<Button size="sm" onClick={() => setShowAddInfluencer(true)}>+ Add Influencer</Button>}
        />
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-2.5 pr-4 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Influencer</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Followers</th>
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Deal</th>
                {steps.map(step => (
                  <th key={step.id} className="py-2.5 px-3 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                    {step.step_name}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Post URL</th>
                <th className="py-2.5 px-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {influencers.map(inf => (
                <tr key={inf.id} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{inf.influencer.name}</p>
                      {inf.influencer.handle && (
                        <p className="text-xs text-gray-400">@{inf.influencer.handle} · <span className="capitalize">{inf.influencer.platform}</span></p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-gray-600 text-sm">
                    {fmt(inf.influencer.followers)}
                    {inf.influencer.engagement_rate != null && (
                      <span className="text-xs text-gray-400 ml-1">· {inf.influencer.engagement_rate}%</span>
                    )}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      inf.deal_type === 'paid'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-violet-50 text-violet-700'
                    }`}>
                      {inf.deal_type === 'paid'
                        ? `₹${Number(inf.amount ?? 0).toLocaleString('en-IN')}`
                        : 'Barter'}
                    </span>
                  </td>

                  {steps.map(step => {
                    const key = `${inf.id}:${step.id}`
                    const done = completions.has(key)
                    return (
                      <td key={step.id} className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleStep(inf.id, step.id)}
                          className={`w-5 h-5 rounded border mx-auto flex items-center justify-center transition-all ${
                            done
                              ? 'bg-violet-600 border-violet-600 text-white'
                              : 'border-gray-300 hover:border-violet-400 bg-white'
                          }`}
                        >
                          {done && (
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5L3.5 6L8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </td>
                    )
                  })}

                  <td className="py-3 px-3 whitespace-nowrap">
                    {inf.post_url ? (
                      <a
                        href={inf.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-500 hover:text-violet-700 flex items-center gap-1 text-xs"
                      >
                        <ExternalLink size={12} /> View
                      </a>
                    ) : (
                      <PostUrlInput
                        onSave={url => updatePostUrl(inf.id, url)}
                      />
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => removeInfluencer(inf.id)}
                      className="text-gray-200 group-hover:text-gray-400 hover:!text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddInfluencer && (
        <AddInfluencerModal
          campaignId={campaignId}
          currentUserId={currentUserId}
          onClose={() => setShowAddInfluencer(false)}
          onAdded={ci => setInfluencers(prev => [...prev, { ...ci, completions: [] }])}
        />
      )}
    </div>
  )
}

/* Inline post-URL input — only shows when there's no URL yet */
function PostUrlInput({ onSave }: { onSave: (url: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-gray-300 hover:text-gray-500 transition-colors"
      >
        + Add URL
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <Input
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder="https://…"
        className="h-6 text-xs w-36 px-1.5"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') { onSave(val); setEditing(false) }
          if (e.key === 'Escape') setEditing(false)
        }}
      />
      <Button size="sm" className="h-6 px-2 text-xs" onClick={() => { onSave(val); setEditing(false) }}>✓</Button>
    </div>
  )
}
