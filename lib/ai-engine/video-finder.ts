/**
 * YouTube Video Finder — searches for match highlight videos.
 * Uses YouTube Data API v3 to find relevant videos.
 *
 * Search strategy:
 * 1. Search: "{home} vs {away} highlights {date}"
 * 2. Filter: videos from last 48 hours, sorted by relevance
 * 3. Prefer: official channels (verified, high subscriber count)
 * 4. Fallback: return null if no suitable video found
 */

export interface VideoSearchResult {
  video_id: string;
  title: string;
  channel: string;
  published_at: string;
  thumbnail_url: string;
}

export interface VideoFinderResult {
  video: VideoSearchResult | null;
  search_query: string;
  candidates_found: number;
  decision: string;
  timing_ms: number;
}

export async function findMatchVideo(
  homeTeam: string,
  awayTeam: string,
  matchDate: string
): Promise<VideoFinderResult> {
  const start = Date.now();
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return {
      video: null,
      search_query: '',
      candidates_found: 0,
      decision: 'YOUTUBE_API_KEY not configured — skipping video search',
      timing_ms: Date.now() - start,
    };
  }

  // Build search query
  const query = `${homeTeam} vs ${awayTeam} highlights ${matchDate}`;

  try {
    // Calculate date range: match date to +48 hours
    const matchDateObj = new Date(matchDate);
    const publishedAfter = new Date(matchDateObj.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const publishedBefore = new Date(matchDateObj.getTime() + 72 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      order: 'relevance',
      maxResults: '5',
      publishedAfter,
      publishedBefore,
      videoDuration: 'medium', // 4-20 minutes (highlight length)
      key: apiKey,
    });

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        video: null,
        search_query: query,
        candidates_found: 0,
        decision: `YouTube API error: ${res.status} — ${errText.substring(0, 100)}`,
        timing_ms: Date.now() - start,
      };
    }

    const data = await res.json() as YouTubeSearchResponse;
    const items = data.items || [];

    if (items.length === 0) {
      return {
        video: null,
        search_query: query,
        candidates_found: 0,
        decision: 'No videos found matching search criteria',
        timing_ms: Date.now() - start,
      };
    }

    // Score candidates
    const scored = items.map(item => ({
      video_id: item.id?.videoId || '',
      title: item.snippet?.title || '',
      channel: item.snippet?.channelTitle || '',
      published_at: item.snippet?.publishedAt || '',
      thumbnail_url: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
      score: scoreVideo(item, homeTeam, awayTeam),
    }));

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (best.score < 2) {
      return {
        video: null,
        search_query: query,
        candidates_found: items.length,
        decision: `${items.length} candidates found but none scored high enough (best: ${best.score}, title: "${best.title}")`,
        timing_ms: Date.now() - start,
      };
    }

    return {
      video: {
        video_id: best.video_id,
        title: best.title,
        channel: best.channel,
        published_at: best.published_at,
        thumbnail_url: best.thumbnail_url,
      },
      search_query: query,
      candidates_found: items.length,
      decision: `Selected: "${best.title}" by ${best.channel} (score: ${best.score})`,
      timing_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      video: null,
      search_query: query,
      candidates_found: 0,
      decision: `Video search error: ${err instanceof Error ? err.message : 'unknown'}`,
      timing_ms: Date.now() - start,
    };
  }
}

/**
 * Score a video candidate (higher = better match).
 * - Title contains both team names: +3
 * - Title contains "highlights" or "goals": +2
 * - Title contains "extended" or "full": +1
 * - Title contains spam words: -5
 */
function scoreVideo(item: YouTubeSearchItem, home: string, away: string): number {
  let score = 0;
  const title = (item.snippet?.title || '').toLowerCase();
  const homeLower = home.toLowerCase();
  const awayLower = away.toLowerCase();

  // Team names
  if (title.includes(homeLower) || title.includes(homeLower.substring(0, 4))) score += 1.5;
  if (title.includes(awayLower) || title.includes(awayLower.substring(0, 4))) score += 1.5;

  // Highlight keywords
  if (title.includes('highlight') || title.includes('resume') || title.includes('resumen')) score += 2;
  if (title.includes('goal') || title.includes('gol')) score += 1;
  if (title.includes('extended')) score += 1;

  // Spam detection
  const spamWords = ['prediction', 'preview', 'betting', 'odds', 'fifa', 'pes', 'efootball', 'simulation'];
  for (const spam of spamWords) {
    if (title.includes(spam)) score -= 5;
  }

  return score;
}

// ===== YouTube API Types =====

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: {
      default?: { url: string };
      high?: { url: string };
    };
  };
}
