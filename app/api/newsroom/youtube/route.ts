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
  { id: 'UCG5qGWdu8nIRZqJ_GgDwQ-w', name: 'Premier League' },
  { id: 'UC6yW44UGJJBvYTlfC7CRg2Q', name: 'Manchester United' },
  { id: 'UCkzCjdRMrW2vXLx8mvPVLdQ', name: 'Manchester City' },
  { id: 'UCz2St8Oc1P5HOnsfPkNvtdA', name: 'The Athletic FC' },
  { id: 'UCWI-ohtRu8eEVmVoYzbYpPQ', name: 'GOAL' },
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
    { title: 'HIGHLIGHTS | Real Madrid 3-1 Barcelona | El Clasico', channel: 'Real Madrid', channelId: '', videoId: '6stlCkUDG_s', link: 'https://www.youtube.com/watch?v=6stlCkUDG_s', thumbnail: 'https://i.ytimg.com/vi/6stlCkUDG_s/mqdefault.jpg', pubDate: new Date(Date.now() - 3600000).toISOString() },
    { title: 'Champions League BEST GOALS of the Week!', channel: 'UEFA Champions League', channelId: '', videoId: 'MFb3PCVyiGk', link: 'https://www.youtube.com/watch?v=MFb3PCVyiGk', thumbnail: 'https://i.ytimg.com/vi/MFb3PCVyiGk/mqdefault.jpg', pubDate: new Date(Date.now() - 7200000).toISOString() },
    { title: 'Transfer News LIVE: Latest Signings and Deals', channel: 'Sky Sports', channelId: '', videoId: 'Wz_DNrKVifQ', link: 'https://www.youtube.com/watch?v=Wz_DNrKVifQ', thumbnail: 'https://i.ytimg.com/vi/Wz_DNrKVifQ/mqdefault.jpg', pubDate: new Date(Date.now() - 14400000).toISOString() },
    { title: 'Premier League Preview: Matchday 28 Analysis', channel: 'ESPN FC', channelId: '', videoId: 'JHkA3te0dEY', link: 'https://www.youtube.com/watch?v=JHkA3te0dEY', thumbnail: 'https://i.ytimg.com/vi/JHkA3te0dEY/mqdefault.jpg', pubDate: new Date(Date.now() - 21600000).toISOString() },
    { title: 'Training Session: Getting Ready for the Derby', channel: 'FC Barcelona', channelId: '', videoId: 'oY9M2sHQlXc', link: 'https://www.youtube.com/watch?v=oY9M2sHQlXc', thumbnail: 'https://i.ytimg.com/vi/oY9M2sHQlXc/mqdefault.jpg', pubDate: new Date(Date.now() - 43200000).toISOString() },
    { title: 'Top 10 Goals | Premier League 2024/25', channel: 'Premier League', channelId: '', videoId: 'TkwF2dOGjY4', link: 'https://www.youtube.com/watch?v=TkwF2dOGjY4', thumbnail: 'https://i.ytimg.com/vi/TkwF2dOGjY4/mqdefault.jpg', pubDate: new Date(Date.now() - 54000000).toISOString() },
    { title: 'Rashford Skills & Goals Compilation 2025', channel: 'Manchester United', channelId: '', videoId: 'pXRviuL6vMY', link: 'https://www.youtube.com/watch?v=pXRviuL6vMY', thumbnail: 'https://i.ytimg.com/vi/pXRviuL6vMY/mqdefault.jpg', pubDate: new Date(Date.now() - 64800000).toISOString() },
    { title: 'Haaland: Every Goal This Season', channel: 'Manchester City', channelId: '', videoId: 'RFDBxcaW0HA', link: 'https://www.youtube.com/watch?v=RFDBxcaW0HA', thumbnail: 'https://i.ytimg.com/vi/RFDBxcaW0HA/mqdefault.jpg', pubDate: new Date(Date.now() - 72000000).toISOString() },
    { title: 'Tactical Breakdown: How Arsenal Dominated the League', channel: 'The Athletic FC', channelId: '', videoId: 'v0IjjKXGvLQ', link: 'https://www.youtube.com/watch?v=v0IjjKXGvLQ', thumbnail: 'https://i.ytimg.com/vi/v0IjjKXGvLQ/mqdefault.jpg', pubDate: new Date(Date.now() - 86400000).toISOString() },
    { title: 'Transfer Window WINNERS and LOSERS', channel: 'GOAL', channelId: '', videoId: 'pKZmZfiAXaI', link: 'https://www.youtube.com/watch?v=pKZmZfiAXaI', thumbnail: 'https://i.ytimg.com/vi/pKZmZfiAXaI/mqdefault.jpg', pubDate: new Date(Date.now() - 96000000).toISOString() },
  ]
}
