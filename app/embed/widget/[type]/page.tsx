'use client'

import { Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getMiniWidget } from '@/app/(platform)/widgets/shared-mini-widgets'
import '@/app/(platform)/widgets/widgets.css'

const templateToPreviewId: Record<string, string> = {
  'live-score': 'live-score', 'standings': 'standings', 'h2h': 'h2h', 'match-center': 'match-center',
  'top-scorers': 'top-scorers', 'team-form': 'team-form', 'player-card': 'player-card', 'prediction': 'prediction',
  'match-prediction': 'poll', 'motm': 'poll', 'opinion': 'poll', 'rating': 'poll',
  'trivia': 'quiz', 'guess-player': 'quiz', 'predict-score': 'quiz',
  'fan-survey': 'survey', 'transfer-pick': 'survey',
}

function parseMatch(teamsParam: string | null): { homeName: string; awayName: string; homeAbbr?: string; awayAbbr?: string } | undefined {
  if (!teamsParam || !teamsParam.includes(' vs ')) return undefined
  const [homeName, awayName] = teamsParam.split(/\s+vs\s+/).map((s) => s.trim())
  if (!homeName || !awayName) return undefined
  const abbr = (n: string) => n.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 3) || n.slice(0, 3).toUpperCase()
  return { homeName, awayName, homeAbbr: abbr(homeName), awayAbbr: abbr(awayName) }
}

function EmbedWidgetInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const type = typeof params.type === 'string' ? params.type : ''
  const theme = (searchParams.get('theme') || 'light') as 'light' | 'dark' | 'glass' | 'custom'
  const accent = searchParams.get('accent') || '#00D4AA'
  const teamsParam = searchParams.get('teams')
  const match = parseMatch(teamsParam)

  const previewId = templateToPreviewId[type] || type
  const widget = getMiniWidget(previewId, { theme, accentColor: accent, match })

  if (!widget) {
    return (
      <div style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--sans)', color: 'var(--g500)' }}>
        Widget type &quot;{type}&quot; not found.
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--g50)' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {widget}
      </div>
    </div>
  )
}

export default function EmbedWidgetPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--sans)', color: 'var(--g400)' }}>Loading widget…</div>}>
      <EmbedWidgetInner />
    </Suspense>
  )
}
