import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Parser from 'rss-parser'

const parser = new Parser()

const CHANNELS = [
  { id: 'UCynECCpjKKxb4OBz2KCMBOQ', name: 'UEFA Champions League' },
  { id: 'UCnmGIkw-KdIGpKAlB3_0Ag', name: 'Sky Sports' },
  { id: 'UCkBO8cccFywbggzXMpXaMFQ', name: 'ESPN FC' },
  { id: 'UC14UlmYlSNiQCBe4P3G4yiA', name: 'FC Barcelona' },
  { id: 'UCWV3obpZVGgJ3j9FVhEjhPw', name: 'Real Madrid' },
]

let cache: { data: unknown; ts: number } | null = null
const CACHE_TTL = 10 * 60 * 1000

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return NextResponse.json(cache.data)
    }

    const results = await Promise.allSettled(
      CHANNELS.map(async (ch) => {
        const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`
        const feed = await parser.parseURL(url)
        return (feed.items || []).slice(0, 5).map((item) => {
          const videoId = item.id?.replace('yt:video:', '') || ''
          return {
            title: item.title || '',
            channel: ch.name,
            channelId: ch.id,
            videoId,
            link: item.link || `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            pubDate: item.pubDate || item.isoDate || '',
          }
        })
      })
    )

    const videos = results
      .filter((r): r is PromiseFulfilledResult<Array<{ title: string; channel: string; channelId: string; videoId: string; link: string; thumbnail: string; pubDate: string }>> => r.status === 'fulfilled')
      .flatMap((r) => r.value)
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 25)

    const result = { videos, total: videos.length, fetchedAt: new Date().toISOString() }
    cache = { data: result, ts: Date.now() }

    return NextResponse.json(result)
  } catch (error) {
    console.error('YouTube error:', error)
    return NextResponse.json({ videos: getMockVideos(), total: 5, source: 'mock', fetchedAt: new Date().toISOString() })
  }
}

function getMockVideos() {
  return [
    { title: 'HIGHLIGHTS | Real Madrid 3-1 Barcelona | El Clasico', channel: 'Real Madrid', channelId: '', videoId: 'dQw4w9WgXcQ', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg', pubDate: new Date(Date.now() - 3600000).toISOString() },
    { title: 'Champions League BEST GOALS of the Week!', channel: 'UEFA Champions League', channelId: '', videoId: 'dQw4w9WgXcQ', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg', pubDate: new Date(Date.now() - 7200000).toISOString() },
    { title: 'Transfer News LIVE: Latest Signings and Deals', channel: 'Sky Sports', channelId: '', videoId: 'dQw4w9WgXcQ', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg', pubDate: new Date(Date.now() - 14400000).toISOString() },
    { title: 'Premier League Preview: Matchday 28 Analysis', channel: 'ESPN FC', channelId: '', videoId: 'dQw4w9WgXcQ', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg', pubDate: new Date(Date.now() - 21600000).toISOString() },
    { title: 'Training Session: Getting Ready for the Derby', channel: 'FC Barcelona', channelId: '', videoId: 'dQw4w9WgXcQ', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg', pubDate: new Date(Date.now() - 43200000).toISOString() },
  ]
}
