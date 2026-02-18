const FB_APP_ID = process.env.FB_APP_ID!
const FB_APP_SECRET = process.env.FB_APP_SECRET!
const GRAPH_URL = 'https://graph.facebook.com/v19.0'

export function getAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: FB_APP_ID,
    redirect_uri: redirectUri,
    scope: 'pages_manage_posts,pages_read_engagement',
    response_type: 'code',
  })
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: FB_APP_ID,
    client_secret: FB_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  })
  const res = await fetch(`${GRAPH_URL}/oauth/access_token?${params}`)
  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } }
    throw new Error(err.error?.message || 'Failed to exchange code for token')
  }
  const data = await res.json() as { access_token: string }
  return data.access_token
}

export async function getUserPages(userToken: string): Promise<Array<{
  id: string
  name: string
  access_token: string
}>> {
  const res = await fetch(`${GRAPH_URL}/me/accounts?access_token=${userToken}`)
  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } }
    throw new Error(err.error?.message || 'Failed to get pages')
  }
  const data = await res.json() as { data?: Array<{ id: string; name: string; access_token: string }> }
  return data.data || []
}

export async function postToPage(
  pageId: string,
  pageToken: string,
  message: string,
  link?: string,
): Promise<{ id: string }> {
  const body: Record<string, string> = { message, access_token: pageToken }
  if (link) body.link = link

  const res = await fetch(`${GRAPH_URL}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } }
    throw new Error(err.error?.message || 'Failed to post to page')
  }
  return res.json() as Promise<{ id: string }>
}

export async function postToMultiplePages(
  pages: Array<{ pageId: string; pageName: string; pageToken: string }>,
  message: string,
  link?: string,
): Promise<Array<{ pageId: string; pageName: string; success: boolean; postId?: string; error?: string }>> {
  const results = await Promise.allSettled(
    pages.map((page) => postToPage(page.pageId, page.pageToken, message, link))
  )

  return results.map((result, i) => {
    const page = pages[i]
    if (result.status === 'fulfilled') {
      return { pageId: page.pageId, pageName: page.pageName, success: true, postId: result.value.id }
    }
    return { pageId: page.pageId, pageName: page.pageName, success: false, error: result.reason?.message || 'Unknown error' }
  })
}
