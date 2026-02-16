'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface StoryGap {
  topic: string
  newsCount: number
  competition: 'low' | 'medium' | 'high'
  yourCoverage: number
}

interface VelocityTopic {
  topic: string
  articlesPerHour: number
  totalArticles: number
  yourCoverage: number
  saturating: boolean
}

export function StoryGapDetector({ breakingNews, articles }: {
  breakingNews: { title: string; source: string }[]
  articles: { title: string }[]
}) {
  const router = useRouter()
  const [gaps, setGaps] = useState<StoryGap[]>([])

  useEffect(() => {
    if (breakingNews.length === 0) return

    const topicCounts: Record<string, number> = {}
    for (const item of breakingNews) {
      const words = item.title.toLowerCase().split(/\s+/)
        for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`
        if (bigram.length > 6 && !['the ', 'and ', 'for ', 'in ', 'to ', 'of ', 'is ', 'a '].some(sw => bigram.startsWith(sw))) {
          topicCounts[bigram] = (topicCounts[bigram] || 0) + 1
        }
      }
    }

    const articleTitlesLower = articles.map(a => a.title.toLowerCase())
    const sorted = Object.entries(topicCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const detected: StoryGap[] = sorted.map(([topic, count]) => {
      const yourCoverage = articleTitlesLower.filter(t => topic.split(' ').every(w => t.includes(w))).length
      return {
        topic: topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        newsCount: count,
        competition: (count >= 5 ? 'high' : count >= 3 ? 'medium' : 'low') as StoryGap['competition'],
        yourCoverage,
      }
    }).filter(g => g.yourCoverage === 0)

    setGaps(detected.slice(0, 3))
  }, [breakingNews, articles])

  if (gaps.length === 0) return null

  const compColors = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' }

  return (
    <div className="intel-panel">
      <div className="intel-panel-head">
        <span className="intel-panel-icon">🎯</span>
        <span className="intel-panel-title">Story Gaps</span>
        <span className="intel-panel-badge">{gaps.length}</span>
      </div>
      <div className="intel-panel-body">
        {gaps.map((gap, i) => (
          <div key={i} className="intel-gap-card">
            <div className="intel-gap-topic">{gap.topic}</div>
            <div className="intel-gap-meta">
              <span style={{ color: compColors[gap.competition] }} className="intel-gap-comp">
                {gap.competition === 'low' ? '🟢' : gap.competition === 'medium' ? '🟡' : '🔴'} {gap.competition}
              </span>
              <span className="intel-gap-count">{gap.newsCount} articles</span>
              <span className="intel-gap-coverage">0 yours</span>
            </div>
            <button
              className="intel-gap-btn"
              onClick={() => {
                sessionStorage.setItem('editorTopic', gap.topic)
                router.push(`/editor?prompt=${encodeURIComponent(`Write an article about: ${gap.topic}`)}`)
              }}
            >
              Fill Gap
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function VelocityTracker({ breakingNews, articles }: {
  breakingNews: { title: string; pubDate: string }[]
  articles: { title: string }[]
}) {
  const router = useRouter()
  const [topics, setTopics] = useState<VelocityTopic[]>([])

  useEffect(() => {
    if (breakingNews.length === 0) return

    const topicGroups: Record<string, { count: number; timestamps: number[] }> = {}
    const keywords = ['transfer', 'injury', 'champions league', 'premier league', 'world cup', 'manager', 'contract']

    for (const item of breakingNews) {
      const title = item.title.toLowerCase()
      for (const kw of keywords) {
        if (title.includes(kw)) {
          if (!topicGroups[kw]) topicGroups[kw] = { count: 0, timestamps: [] }
          topicGroups[kw].count++
          const ts = new Date(item.pubDate).getTime()
          if (!isNaN(ts)) topicGroups[kw].timestamps.push(ts)
        }
      }
    }

    const articleTitlesLower = articles.map(a => a.title.toLowerCase())
    const tracked: VelocityTopic[] = Object.entries(topicGroups)
      .filter(([, v]) => v.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([topic, data]) => {
        const hourSpan = data.timestamps.length >= 2
          ? Math.max(1, (Math.max(...data.timestamps) - Math.min(...data.timestamps)) / 3600000)
          : 1
        const velocity = Math.round(data.count / hourSpan * 10) / 10
        const yourCoverage = articleTitlesLower.filter(t => t.includes(topic)).length
        return {
          topic: topic.charAt(0).toUpperCase() + topic.slice(1),
          articlesPerHour: velocity,
          totalArticles: data.count,
          yourCoverage,
          saturating: velocity >= 2 && yourCoverage === 0,
        }
      })

    setTopics(tracked)
  }, [breakingNews, articles])

  if (topics.length === 0) return null

  return (
    <div className="intel-panel">
      <div className="intel-panel-head">
        <span className="intel-panel-icon">🚀</span>
        <span className="intel-panel-title">Velocity</span>
      </div>
      <div className="intel-panel-body">
        {topics.map((t, i) => (
          <div key={i} className={`intel-velocity-card ${t.saturating ? 'saturating' : ''}`}>
            <div className="intel-velocity-topic">{t.topic}</div>
            <div className="intel-velocity-stats">
              <span className="intel-velocity-rate">{t.articlesPerHour}/hr</span>
              <span className="intel-velocity-total">{t.totalArticles} total</span>
              <span className="intel-velocity-yours">{t.yourCoverage} yours</span>
            </div>
            {t.saturating && (
              <button
                className="intel-velocity-alert"
                onClick={() => {
                  router.push(`/editor?prompt=${encodeURIComponent(`Write a timely article about: ${t.topic}`)}`)
                }}
              >
                Write NOW — topic saturating
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
