'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { formatDateTime } from '@/lib/utils'
import { SUPPORTED_LANGUAGES, setClientLanguage, LANG_CHANGE_EVENT, type LangCode } from '@/lib/languages'

interface FbPage {
  id: string
  pageId: string
  pageName: string
  isActive: boolean
}

interface NewsletterStats {
  active: number
  total: number
  recent: { id: string; email: string; name: string | null; isActive: boolean; subscribedAt: string }[]
}

interface SiteData {
  name: string
  slug: string
  domain: string
  description: string
  gaId: string
  language: string
  timezone: string
  theme: string
  wpSiteUrl: string
  wpApiKey: string
  competitorFeeds: string[]
  metaTitle: string
  metaDescription: string
  ogImage: string
  twitterHandle: string
  facebookUrl: string
  instagramHandle: string
  youtubeUrl: string
}

const DEFAULT_SITE: SiteData = {
  name: '',
  slug: '',
  domain: '',
  description: '',
  gaId: '',
  language: 'bs',
  timezone: 'Europe/Sarajevo',
  theme: 'editorial',
  wpSiteUrl: '',
  wpApiKey: '',
  competitorFeeds: [],
  metaTitle: '',
  metaDescription: '',
  ogImage: '',
  twitterHandle: '',
  facebookUrl: '',
  instagramHandle: '',
  youtubeUrl: '',
}

export default function GeneralTab() {
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const [fbConnected, setFbConnected] = useState(false)
  const [fbAuthUrl, setFbAuthUrl] = useState('')
  const [fbPages, setFbPages] = useState<FbPage[]>([])
  const [fbToggling, setFbToggling] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const [nlStats, setNlStats] = useState<NewsletterStats | null>(null)

  // Store server-loaded values so Discard resets to them, not hardcoded defaults
  const serverData = useRef<SiteData>({ ...DEFAULT_SITE })

  const [siteName, setSiteName] = useState('')
  const [siteSlug, setSiteSlug] = useState('')
  const [siteUrl, setSiteUrl] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState('bs')
  const [timezone, setTimezone] = useState('Europe/Sarajevo')
  const [theme, setTheme] = useState('editorial')
  const [brandColor, setBrandColor] = useState('#00D4AA')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDesc, setMetaDesc] = useState('')
  const [ogImage, setOgImage] = useState('')
  const [gaId, setGaId] = useState('')
  const [twitter, setTwitter] = useState('')
  const [facebook, setFacebook] = useState('')
  const [instagram, setInstagram] = useState('')
  const [youtube, setYoutube] = useState('')
  const [wpSiteUrl, setWpSiteUrl] = useState('')
  const [wpApiKey, setWpApiKey] = useState('')
  const [wpTesting, setWpTesting] = useState(false)
  const [wpTestResult, setWpTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [competitorFeeds, setCompetitorFeeds] = useState<string[]>([])
  const [newFeedUrl, setNewFeedUrl] = useState('')

  useEffect(() => {
    fetch('/api/site')
      .then((r) => r.ok ? r.json() as Promise<Partial<SiteData>> : null)
      .then((data) => {
        if (!data) return
        const loaded: SiteData = {
          name: data.name ?? '',
          slug: data.slug ?? '',
          domain: data.domain ?? '',
          description: data.description ?? '',
          gaId: data.gaId ?? '',
          language: data.language ?? 'bs',
          timezone: data.timezone ?? 'Europe/Sarajevo',
          theme: data.theme ?? 'editorial',
          wpSiteUrl: data.wpSiteUrl ?? '',
          wpApiKey: data.wpApiKey ?? '',
          competitorFeeds: data.competitorFeeds ?? [],
          metaTitle: data.metaTitle ?? '',
          metaDescription: data.metaDescription ?? '',
          ogImage: data.ogImage ?? '',
          twitterHandle: data.twitterHandle ?? '',
          facebookUrl: data.facebookUrl ?? '',
          instagramHandle: data.instagramHandle ?? '',
          youtubeUrl: data.youtubeUrl ?? '',
        }
        serverData.current = loaded
        setSiteName(loaded.name)
        setSiteSlug(loaded.slug)
        setSiteUrl(loaded.domain)
        setDescription(loaded.description)
        setGaId(loaded.gaId)
        setLanguage(loaded.language)
        setTimezone(loaded.timezone)
        setTheme(loaded.theme)
        setWpSiteUrl(loaded.wpSiteUrl)
        setWpApiKey(loaded.wpApiKey)
        setCompetitorFeeds(loaded.competitorFeeds)
        setMetaTitle(loaded.metaTitle)
        setMetaDesc(loaded.metaDescription)
        setOgImage(loaded.ogImage)
        setTwitter(loaded.twitterHandle)
        setFacebook(loaded.facebookUrl)
        setInstagram(loaded.instagramHandle)
        setYoutube(loaded.youtubeUrl)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleLangChange(e: Event) {
      setLanguage((e as CustomEvent).detail as string)
    }
    window.addEventListener(LANG_CHANGE_EVENT, handleLangChange)
    return () => window.removeEventListener(LANG_CHANGE_EVENT, handleLangChange)
  }, [])

  function loadFbStatus() {
    fetch('/api/social/facebook')
      .then((r) => r.ok ? r.json() as Promise<{ authUrl?: string; connected?: boolean; pages?: FbPage[] }> : null)
      .then((data) => {
        if (!data) return
        setFbAuthUrl(data.authUrl || '')
        setFbConnected(data.connected || false)
        setFbPages(data.pages || [])
      })
      .catch(() => {})
  }

  useEffect(() => { loadFbStatus() }, [])

  useEffect(() => {
    fetch('/api/newsletter/subscribe')
      .then((r) => r.ok ? r.json() as Promise<NewsletterStats> : null)
      .then((data) => { if (data) setNlStats(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const fbStatus = searchParams.get('fb')
    if (fbStatus === 'success') {
      loadFbStatus()
      window.history.replaceState({}, '', '/settings')
    }
  }, [searchParams])

  async function toggleFbPage(page: FbPage) {
    setFbToggling(page.id)
    try {
      const res = await fetch('/api/social/facebook', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: page.id, isActive: !page.isActive }),
      })
      if (res.ok) {
        setFbPages((prev) => prev.map((p) =>
          p.id === page.id ? { ...p, isActive: !p.isActive } : p
        ))
      }
    } catch {
    } finally {
      setFbToggling(null)
    }
  }

  async function disconnectFb() {
    try {
      const res = await fetch('/api/social/facebook', { method: 'DELETE' })
      if (res.ok) {
        setFbConnected(false)
        setFbPages([])
      }
    } catch {
    }
  }

  function change<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true); setSaved(false) }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/site', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: siteName,
          domain: siteUrl,
          description: description || null,
          gaId,
          language,
          timezone,
          theme,
          wpSiteUrl: wpSiteUrl || null,
          wpApiKey: wpApiKey || null,
          competitorFeeds,
          metaTitle: metaTitle || null,
          metaDescription: metaDesc || null,
          ogImage: ogImage || null,
          twitterHandle: twitter || null,
          facebookUrl: facebook || null,
          instagramHandle: instagram || null,
          youtubeUrl: youtube || null,
        }),
      })
      if (res.ok) {
        serverData.current = {
          name: siteName, slug: siteSlug, domain: siteUrl, description, gaId, language, timezone, theme,
          wpSiteUrl, wpApiKey, competitorFeeds,
          metaTitle, metaDescription: metaDesc, ogImage,
          twitterHandle: twitter, facebookUrl: facebook, instagramHandle: instagram, youtubeUrl: youtube,
        }
        setDirty(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        toast.success('Settings saved')
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string }
        toast.error(err.error || 'Failed to save settings')
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Discard resets to server-loaded values, not hardcoded
  function handleDiscard() {
    const s = serverData.current
    setSiteName(s.name)
    setSiteSlug(s.slug)
    setSiteUrl(s.domain)
    setDescription(s.description)
    setGaId(s.gaId)
    setLanguage(s.language)
    setTimezone(s.timezone)
    setTheme(s.theme)
    setWpSiteUrl(s.wpSiteUrl)
    setWpApiKey(s.wpApiKey)
    setCompetitorFeeds(s.competitorFeeds)
    setMetaTitle(s.metaTitle)
    setMetaDesc(s.metaDescription)
    setOgImage(s.ogImage)
    setTwitter(s.twitterHandle)
    setFacebook(s.facebookUrl)
    setInstagram(s.instagramHandle)
    setYoutube(s.youtubeUrl)
    setDirty(false)
  }

  const activeCount = fbPages.filter((p) => p.isActive).length

  return (
    <>
      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">General Settings</div>
          <div className="st-section-desc">Core configuration for your publication identity and defaults.</div>
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">Publication Identity</div>
          </div>
          <div className="st-card-desc">How your publication appears to readers and across the platform.</div>
          <div className="st-row">
            <span className="st-label">Site Name</span>
            <input className="st-input" value={siteName} onChange={(e) => change(setSiteName)(e.target.value)} />
          </div>
          <div className="st-row">
            <span className="st-label">Slug</span>
            <input className="st-input mono" value={siteSlug} readOnly title="URL slug (read-only). Used in site URLs." />
          </div>
          <div className="st-row">
            <span className="st-label">Site URL</span>
            <input className="st-input mono" value={siteUrl} onChange={(e) => change(setSiteUrl)(e.target.value)} placeholder="https://yoursite.com" />
          </div>
          <div className="st-row">
            <span className="st-label">Description</span>
            <textarea className="st-textarea" value={description} onChange={(e) => change(setDescription)(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">Regional &amp; Language</div>
          </div>
          <div className="st-card-desc">Defaults for content creation and display.</div>
          <div className="st-row">
            <span className="st-label">Primary Language</span>
            <select className="st-select" value={language} onChange={(e) => {
              const code = e.target.value;
              change(setLanguage)(code);
              setClientLanguage(code as LangCode);
            }}>
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.label} ({l.code})</option>
              ))}
            </select>
          </div>
          <div className="st-row">
            <span className="st-label">Timezone</span>
            <select className="st-select" value={timezone} onChange={(e) => change(setTimezone)(e.target.value)}>
              <option value="Europe/Sarajevo">Europe/Sarajevo (CET)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">Branding</div>
          <div className="st-section-desc">Customize the look and feel of your publication.</div>
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">Logo &amp; Colors</div>
          </div>
          <div className="st-card-desc">Your publication&apos;s visual identity.</div>
          <div className="st-row">
            <span className="st-label">Logo</span>
            <div className="st-upload" title="Click to upload">+</div>
          </div>
          <div className="st-row">
            <span className="st-label">Brand Color</span>
            <div className="st-color-row">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => change(setBrandColor)(e.target.value)}
                className="st-color-swatch"
                style={{ background: brandColor }}
              />
              <span className="st-color-code">{brandColor}</span>
            </div>
          </div>
          <div className="st-row">
            <span className="st-label">Favicon</span>
            <div className="st-upload" title="Click to upload" style={{ width: 36, height: 36, fontSize: 14 }}>+</div>
          </div>
        </div>
      </div>

      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">Theme</div>
          <div className="st-section-desc">Choose how your public site looks to readers.</div>
        </div>

        <div className="st-theme-grid">
          <button
            className={`st-theme-card ${theme === 'editorial' ? 'active' : ''}`}
            onClick={() => change(setTheme)('editorial')}
            type="button"
          >
            <div className="st-theme-preview editorial">
              <div className="st-theme-preview-header">
                <span className="st-theme-preview-logo">SportNews.</span>
                <div className="st-theme-preview-nav"><span /><span /><span /><span /></div>
              </div>
              <div className="st-theme-preview-hero" />
              <div className="st-theme-preview-grid"><span /><span /><span /></div>
            </div>
            <div className="st-theme-info">
              <div className="st-theme-name">Clean Editorial</div>
              <div className="st-theme-desc">Light, clean design with a focus on readability</div>
            </div>
            {theme === 'editorial' && <div className="st-theme-active-badge">Active</div>}
          </button>

          <button
            className={`st-theme-card ${theme === 'midnight' ? 'active' : ''}`}
            onClick={() => change(setTheme)('midnight')}
            type="button"
          >
            <div className="st-theme-preview midnight">
              <div className="st-theme-preview-header">
                <span className="st-theme-preview-logo">SportNews.</span>
                <div className="st-theme-preview-nav"><span /><span /><span /><span /></div>
              </div>
              <div className="st-theme-preview-hero" />
              <div className="st-theme-preview-grid"><span /><span /><span /></div>
            </div>
            <div className="st-theme-info">
              <div className="st-theme-name">Midnight Pro</div>
              <div className="st-theme-desc">Dark, immersive design for modern sports coverage</div>
            </div>
            {theme === 'midnight' && <div className="st-theme-active-badge">Active</div>}
          </button>
        </div>

        <div className="st-theme-actions">
          <a href="/templates/editorial" className="st-theme-preview-link">Preview Editorial</a>
          <a href="/templates/midnight" className="st-theme-preview-link">Preview Midnight</a>
        </div>
      </div>

      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">SEO Defaults</div>
          <div className="st-section-desc">Default meta tags applied across your publication.</div>
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">Meta Tags</div>
          </div>
          <div className="st-card-desc">Search engine and social media appearance defaults.</div>
          <div className="st-row">
            <span className="st-label">Default Meta Title</span>
            <input className="st-input" value={metaTitle} onChange={(e) => change(setMetaTitle)(e.target.value)} placeholder="My SportNews — AI-Powered Sports News" />
          </div>
          <div className="st-row">
            <span className="st-label">Meta Description</span>
            <textarea className="st-textarea" value={metaDesc} onChange={(e) => change(setMetaDesc)(e.target.value)} rows={2} placeholder="Breaking sports news, match previews, transfer updates..." />
          </div>
          <div className="st-row">
            <span className="st-label">OG Image URL</span>
            <input className="st-input mono" value={ogImage} onChange={(e) => change(setOgImage)(e.target.value)} placeholder="https://yoursite.com/og-image.jpg" />
          </div>
        </div>
      </div>

      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">Integrations</div>
          <div className="st-section-desc">Connect external services and social accounts.</div>
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">Analytics</div>
          </div>
          <div className="st-card-desc">Track your publication&apos;s performance.</div>
          <div className="st-row">
            <span className="st-label">Google Analytics ID</span>
            <input className="st-input mono" value={gaId} onChange={(e) => change(setGaId)(e.target.value)} placeholder="G-XXXXXXXXXX" />
          </div>
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">Facebook Auto-Post</div>
          </div>
          <div className="st-card-desc">
            Connect your Facebook Pages to auto-post articles when published.
            {fbConnected && <span className="st-fb-count">{activeCount} of {fbPages.length} pages active</span>}
          </div>

          {fbConnected && fbPages.length > 0 ? (
            <div className="st-fb-pages-list">
              {fbPages.map((page) => (
                <div key={page.id} className={`st-fb-page-row ${page.isActive ? 'active' : ''}`}>
                  <div className="st-fb-page-info">
                    <div className="st-social-icon fb">f</div>
                    <div>
                      <div className="st-fb-page-name">{page.pageName}</div>
                      <div className="st-fb-status-text">
                        {page.isActive ? 'Auto-posting enabled' : 'Paused'}
                      </div>
                    </div>
                  </div>
                  <button
                    className={`st-toggle ${page.isActive ? 'on' : ''}`}
                    onClick={() => toggleFbPage(page)}
                    disabled={fbToggling === page.id}
                    aria-label={`Toggle ${page.pageName}`}
                  >
                    <span className="st-toggle-knob" />
                  </button>
                </div>
              ))}
              <div className="st-fb-actions">
                <a href={fbAuthUrl || '#'} className="st-fb-reconnect">Reconnect</a>
                <button className="st-fb-disconnect" onClick={disconnectFb}>Disconnect All</button>
              </div>
            </div>
          ) : (
            <div className="st-row">
              <span className="st-label">Facebook Pages</span>
              <a href={fbAuthUrl || '#'} className="st-fb-connect-btn">
                <span className="st-social-icon fb" style={{ width: 22, height: 22, fontSize: 11 }}>f</span>
                Connect Facebook
              </a>
            </div>
          )}
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">Social Media Links</div>
          </div>
          <div className="st-card-desc">Link your social accounts for cross-posting and attribution.</div>
          <div className="st-social">
            <div className="st-social-icon tw">X</div>
            <span className="st-social-name">X / Twitter</span>
            <input value={twitter} onChange={(e) => change(setTwitter)(e.target.value)} placeholder="@sportnewspro" />
          </div>
          <div className="st-social">
            <div className="st-social-icon fb">f</div>
            <span className="st-social-name">Facebook</span>
            <input value={facebook} onChange={(e) => change(setFacebook)(e.target.value)} placeholder="facebook.com/sportnewspro" />
          </div>
          <div className="st-social">
            <div className="st-social-icon ig">IG</div>
            <span className="st-social-name">Instagram</span>
            <input value={instagram} onChange={(e) => change(setInstagram)(e.target.value)} placeholder="@sportnewspro" />
          </div>
          <div className="st-social">
            <div className="st-social-icon yt">&#9654;</div>
            <span className="st-social-name">YouTube</span>
            <input value={youtube} onChange={(e) => change(setYoutube)(e.target.value)} placeholder="youtube.com/@sportnewspro" />
          </div>
        </div>
      </div>

      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">WordPress Integration</div>
          <div className="st-section-desc">Connect to a WordPress site to sync articles or import/export content.</div>
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">WordPress REST API</div>
          </div>
          <div className="st-card-desc">
            Enter your WordPress site URL and an Application Password to enable syncing.
          </div>
          <div className="st-row">
            <span className="st-label">WP Site URL</span>
            <input className="st-input mono" value={wpSiteUrl} onChange={(e) => change(setWpSiteUrl)(e.target.value)} placeholder="https://yoursite.com" />
          </div>
          <div className="st-row">
            <span className="st-label">API Key</span>
            <input className="st-input mono" value={wpApiKey} onChange={(e) => change(setWpApiKey)(e.target.value)} placeholder="username:xxxx xxxx xxxx xxxx" type="password" />
          </div>
          <div className="st-row">
            <span className="st-label">Connection</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className="st-wp-test-btn"
                disabled={wpTesting || !wpSiteUrl || !wpApiKey}
                onClick={async () => {
                  setWpTesting(true)
                  setWpTestResult(null)
                  try {
                    const res = await fetch('/api/sync/wordpress', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'test' }),
                    })
                    const data = await res.json() as { success?: boolean; message: string }
                    setWpTestResult({ success: data.success || false, message: data.message })
                  } catch {
                    setWpTestResult({ success: false, message: 'Connection failed' })
                  } finally {
                    setWpTesting(false)
                  }
                }}
              >
                {wpTesting ? 'Testing...' : 'Test Connection'}
              </button>
              {wpTestResult && (
                <span style={{ fontSize: 12, fontWeight: 600, color: wpTestResult.success ? 'var(--suc)' : 'var(--coral)' }}>
                  {wpTestResult.message}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">Competitor Tracking</div>
          <div className="st-section-desc">Add RSS feed URLs of competitor sites to monitor their latest articles.</div>
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">RSS Feeds</div>
          </div>
          <div className="st-card-desc">
            Add up to 10 competitor RSS feeds. Their articles will appear in Newsroom under &ldquo;Competitor Activity&rdquo;.
          </div>

          {competitorFeeds.map((url, i) => (
            <div key={i} className="st-row">
              <span className="st-label">Feed {i + 1}</span>
              <input className="st-input mono" value={url} readOnly />
              <button
                type="button"
                className="st-comp-remove"
                onClick={() => { setCompetitorFeeds(competitorFeeds.filter((_, j) => j !== i)); setDirty(true); setSaved(false) }}
              >
                Remove
              </button>
            </div>
          ))}

          {competitorFeeds.length < 10 && (
            <div className="st-row">
              <span className="st-label">Add Feed</span>
              <input
                className="st-input mono"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                placeholder="https://competitor.com/rss"
              />
              <button
                type="button"
                className="st-comp-add"
                onClick={() => {
                  if (newFeedUrl.trim() && !competitorFeeds.includes(newFeedUrl.trim())) {
                    setCompetitorFeeds([...competitorFeeds, newFeedUrl.trim()])
                    setNewFeedUrl('')
                    setDirty(true)
                    setSaved(false)
                  }
                }}
                disabled={!newFeedUrl.trim()}
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">Newsletter</div>
          <div className="st-section-desc">Manage email subscribers and send newsletters.</div>
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">Subscriber Overview</div>
          </div>
          <div className="st-card-desc">Powered by Resend. Subscribers can sign up via the embeddable subscribe widget.</div>

          {nlStats ? (
            <>
              <div className="st-nl-stats">
                <div className="st-nl-stat">
                  <div className="st-nl-stat-val">{nlStats.active}</div>
                  <div className="st-nl-stat-label">Active Subscribers</div>
                </div>
                <div className="st-nl-stat">
                  <div className="st-nl-stat-val">{nlStats.total}</div>
                  <div className="st-nl-stat-label">Total All-Time</div>
                </div>
              </div>

              {nlStats.recent.length > 0 && (
                <div className="st-nl-recent">
                  <div className="st-nl-recent-title">Recent Subscribers</div>
                  {nlStats.recent.map((sub) => (
                    <div key={sub.id} className="st-nl-sub-row">
                      <div className="st-nl-sub-avatar">{sub.email.charAt(0).toUpperCase()}</div>
                      <div className="st-nl-sub-info">
                        <div className="st-nl-sub-email">{sub.email}</div>
                        <div className="st-nl-sub-date">
                          {formatDateTime(sub.subscribedAt)}
                        </div>
                      </div>
                      <span className={`st-nl-sub-badge ${sub.isActive ? 'active' : 'inactive'}`}>
                        {sub.isActive ? 'Active' : 'Unsubscribed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--g400)' }}>Loading newsletter stats...</div>
          )}
        </div>
      </div>

      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">Data Management</div>
          <div className="st-section-desc">Import content from other platforms or export your articles.</div>
        </div>

        <div className="st-data-grid">
          <a href="/import" className="st-data-card">
            <div className="st-data-icon">📥</div>
            <div className="st-data-info">
              <div className="st-data-title">Import Content</div>
              <div className="st-data-desc">Import articles from WordPress XML, CSV, or JSON files.</div>
            </div>
            <span className="st-data-arrow">&rarr;</span>
          </a>

          <a href="/export" className="st-data-card">
            <div className="st-data-icon">📤</div>
            <div className="st-data-info">
              <div className="st-data-title">Export Content</div>
              <div className="st-data-desc">Download your articles as JSON, CSV, or WordPress WXR format.</div>
            </div>
            <span className="st-data-arrow">&rarr;</span>
          </a>
        </div>
      </div>

      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">Danger Zone</div>
          <div className="st-section-desc">Irreversible actions. Proceed with extreme caution.</div>
        </div>

        <div className="st-danger">
          <div className="st-danger-title">Delete Publication</div>
          <div className="st-danger-desc">
            Permanently delete this publication and all its data including articles, widgets, and analytics.
            This action cannot be undone.
          </div>
          <button className="st-danger-btn" onClick={() => alert('This action is not available in the current version.')}>
            Delete Publication
          </button>
        </div>
      </div>

      {(dirty || saved) && (
        <div className="st-save-bar">
          <div className="st-save-text">
            {saved ? <><strong>Settings saved</strong></> : <><strong>Unsaved changes</strong> — save or discard</>}
          </div>
          {!saved && (
            <div className="st-save-actions">
              <button className="st-save-discard" onClick={handleDiscard}>Discard</button>
              <button className="st-save-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
