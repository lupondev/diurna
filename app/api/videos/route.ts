import { NextRequest, NextResponse } from 'next/server'
import { cachedFetch } from '@/lib/api-football-cache'

const CHANNELS: Record<string, string> = {
  pl: 'UCqMnXOSMKHs-p9mNkMxOFwA',
  ucl: 'UCwEBqMmtWNi6chHFwSC9rdQ',
}

const GAMBLING_KEYWORDS = [
  'bet', 'odds', 'apostar', 'betting', 'wager', 'kladionica', 'kvota',
  'casino', 'gambl', 'bookmaker', 'punt', 'stake', 'tipster',
]

interface YTVideo {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  channelTitle: string
  channel: string
}

const FALLBACK_VIDEOS: YTVideo[] = [
  { videoId: 'hMDV8S5JMfk', title: 'Premier League 2024/25 Season Highlights', thumbnail: 'https://i.ytimg.com/vi/hMDV8S5JMfk/hqdefault.jpg', publishedAt: new Date().toISOString(), channelTitle: 'Premier League', channel: 'pl' },
  { videoId: 'XGK84Poeynk', title: 'Best Goals of the Season So Far', thumbnail: 'https://i.ytimg.com/vi/XGK84Poeynk/hqdefault.jpg', publishedAt: new Date().toISOString(), channelTitle: 'Premier League', channel: 'pl' },
  { videoId: '8OGankYbaxY', title: 'Top Saves & Defensive Plays', thumbnail: 'https://i.ytimg.com/vi/8OGankYbaxY/hqdefault.jpg', publishedAt: new Date().toISOString(), channelTitle: 'Premier League', channel: 'pl' },
  { videoId: 'jvH7MC3Bfxc', title: 'Champions League Best Moments', thumbnail: 'https://i.ytimg.com/vi/jvH7MC3Bfxc/hqdefault.jpg', publishedAt: new Date().toISOString(), channelTitle: 'UEFA Champions League', channel: 'ucl' },
]

function isGambling(title: string): boolean {
  const lower = title.toLowerCase()
  return GAMBLING_KEYWORDS.some(kw => lower.includes(kw))
}

async function fetchYouTubeVideos(channelId: string, channelKey: string): Promise<YTVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return []

  const params = new URLSearchParams({
    channelId,
    order: 'date',
    maxResults: '15',
    type: 'video',
    part: 'snippet',
    key: apiKey,
  })

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
  if (!res.ok) {
    console.error(`[YouTube] API error ${res.status}: ${await res.text().catch(() => '')}`)
    return []
  }

  const data = await res.json() as {
    items?: {
      id?: { videoId?: string }
      snippet?: {
        title?: string
        thumbnails?: { high?: { url?: string }; medium?: { url?: string } }
        publishedAt?: string
        channelTitle?: string
      }
    }[]
  }

  return (data.items || [])
    .filter(item => item.id?.videoId && item.snippet?.title && !isGambling(item.snippet.title))
    .map(item => ({
      videoId: item.id!.videoId!,
      title: item.snippet!.title!,
      thumbnail: item.snippet!.thumbnails?.high?.url || item.snippet!.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${item.id!.videoId}/hqdefault.jpg`,
      publishedAt: item.snippet!.publishedAt || new Date().toISOString(),
      channelTitle: item.snippet!.channelTitle || '',
      channel: channelKey,
    }))
    .slice(0, 12)
}

export async function GET(req: NextRequest) {
  const channelParam = req.nextUrl.searchParams.get('channel') || 'all'

  try {
    const channelEntries = channelParam === 'all'
      ? Object.entries(CHANNELS)
      : CHANNELS[channelParam]
        ? [[channelParam, CHANNELS[channelParam]] as [string, string]]
        : Object.entries(CHANNELS)

    const allVideos: YTVideo[] = []

    for (const [key, id] of channelEntries) {
      const cacheKey = `youtube_videos_${key}`
      const { data } = await cachedFetch<YTVideo[]>(
        cacheKey,
        () => fetchYouTubeVideos(id, key),
        1800, // 30 min TTL
      )
      allVideos.push(...data)
    }

    // Sort by publishedAt desc
    allVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    // If no results (no API key or quota exceeded), return fallback
    if (allVideos.length === 0) {
      return NextResponse.json({ videos: FALLBACK_VIDEOS, fallback: true })
    }

    return NextResponse.json({ videos: allVideos.slice(0, 24), fallback: false })
  } catch (e) {
    console.error('[YouTube] Error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ videos: FALLBACK_VIDEOS, fallback: true })
  }
}
