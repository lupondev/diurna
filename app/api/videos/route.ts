import { NextRequest, NextResponse } from 'next/server'
import { cachedFetch } from '@/lib/api-football-cache'

/**
 * YouTube video feed — uses free RSS feeds (no API key needed).
 * Falls back to curated video IDs if feeds are unavailable.
 */

const CHANNELS: Record<string, { id: string; name: string }> = {
  pl: { id: 'UCG5qGWdu8nIRZqJ_GgDwQ-w', name: 'Premier League' },
}

const GAMBLING_KEYWORDS = [
  'bet', 'odds', 'apostar', 'betting', 'wager', 'kladionica', 'kvota',
  'casino', 'gambl', 'bookmaker', 'tipster', 'fpl', 'fantasy',
]

export interface YTVideo {
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  channelTitle: string
  channel: string
}

// Curated fallback — real PL channel videos (verified via oEmbed + RSS)
const FALLBACK_VIDEOS: YTVideo[] = [
  { videoId: 'cUG61la_peg', title: '10 Of The Best North London Derby Clashes | Extended Highlights', thumbnail: 'https://i.ytimg.com/vi/cUG61la_peg/maxresdefault.jpg', publishedAt: '2026-02-20T15:32:37Z', channelTitle: 'Premier League', channel: 'pl' },
  { videoId: '1IcDF1VimQM', title: "Cole Palmer's INSANE Vision Sets Up Joao Pedro", thumbnail: 'https://i.ytimg.com/vi/1IcDF1VimQM/maxresdefault.jpg', publishedAt: '2026-02-20T14:11:43Z', channelTitle: 'Premier League', channel: 'pl' },
  { videoId: 'MYn-py9tync', title: 'He Scored A 14-Minute HAT-TRICK', thumbnail: 'https://i.ytimg.com/vi/MYn-py9tync/maxresdefault.jpg', publishedAt: '2026-02-20T09:52:10Z', channelTitle: 'Premier League', channel: 'pl' },
  { videoId: 'EHawP1bIJ-A', title: 'Bukayo Saka Commits His Future to Arsenal', thumbnail: 'https://i.ytimg.com/vi/EHawP1bIJ-A/maxresdefault.jpg', publishedAt: '2026-02-19T16:00:20Z', channelTitle: 'Premier League', channel: 'pl' },
  { videoId: 'bbawFiryQHk', title: 'Why Antoine Semenyo Is FLYING At Man City', thumbnail: 'https://i.ytimg.com/vi/bbawFiryQHk/maxresdefault.jpg', publishedAt: '2026-02-19T14:49:53Z', channelTitle: 'Premier League', channel: 'pl' },
  { videoId: 'S3DEDFPy9js', title: 'Why Nobody Can Stop This 19-Year-Old Striker', thumbnail: 'https://i.ytimg.com/vi/S3DEDFPy9js/maxresdefault.jpg', publishedAt: '2026-02-19T11:01:41Z', channelTitle: 'Premier League', channel: 'pl' },
  { videoId: '47GZN-JRX6E', title: 'Arsenal STUNNED By Wolves Comeback', thumbnail: 'https://i.ytimg.com/vi/47GZN-JRX6E/maxresdefault.jpg', publishedAt: '2026-02-19T10:19:27Z', channelTitle: 'Premier League', channel: 'pl' },
  { videoId: 'HdihElwIQ4A', title: 'The Best Premier League Matches | Season So Far', thumbnail: 'https://i.ytimg.com/vi/HdihElwIQ4A/maxresdefault.jpg', publishedAt: '2026-02-18T15:01:56Z', channelTitle: 'Premier League', channel: 'pl' },
]

function isGambling(title: string): boolean {
  const lower = title.toLowerCase()
  return GAMBLING_KEYWORDS.some(kw => lower.includes(kw))
}

async function fetchFromRSS(channelId: string, channelKey: string, channelName: string): Promise<YTVideo[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
    headers: { 'User-Agent': 'Diurna/1.0' },
  })
  if (!res.ok) return []

  const xml = await res.text()

  // Parse videoId and title from RSS XML
  const videoIds = Array.from(xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)).map(m => m[1])
  const titles = Array.from(xml.matchAll(/<media:title>([^<]+)<\/media:title>/g)).map(m => m[1])
  const dates = Array.from(xml.matchAll(/<published>([^<]+)<\/published>/g)).map(m => m[1])
  // First <published> is the feed itself, skip it
  const pubDates = dates.slice(1)

  const videos: YTVideo[] = []
  for (let i = 0; i < Math.min(videoIds.length, titles.length, 15); i++) {
    const title = titles[i]
    if (isGambling(title)) continue
    videos.push({
      videoId: videoIds[i],
      title,
      thumbnail: `https://i.ytimg.com/vi/${videoIds[i]}/maxresdefault.jpg`,
      publishedAt: pubDates[i] || new Date().toISOString(),
      channelTitle: channelName,
      channel: channelKey,
    })
  }
  return videos
}

export async function GET(req: NextRequest) {
  const channelParam = req.nextUrl.searchParams.get('channel') || 'all'

  try {
    const entries = channelParam === 'all'
      ? Object.entries(CHANNELS)
      : CHANNELS[channelParam]
        ? [[channelParam, CHANNELS[channelParam]] as [string, { id: string; name: string }]]
        : Object.entries(CHANNELS)

    const allVideos: YTVideo[] = []

    for (const [key, ch] of entries) {
      const { data } = await cachedFetch<YTVideo[]>(
        `youtube_rss_${key}`,
        () => fetchFromRSS(ch.id, key, ch.name),
        1800, // 30 min TTL
      )
      allVideos.push(...data)
    }

    allVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

    if (allVideos.length === 0) {
      return NextResponse.json({ videos: FALLBACK_VIDEOS, fallback: true })
    }

    return NextResponse.json({ videos: allVideos.slice(0, 24), fallback: false }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600' },
    })
  } catch (e) {
    console.error('[YouTube] Error:', e instanceof Error ? e.message : e)
    return NextResponse.json({ videos: FALLBACK_VIDEOS, fallback: true })
  }
}
