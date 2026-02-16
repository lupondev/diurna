'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { SUPPORTED_LANGUAGES } from '@/lib/languages'
import './settings.css'

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

export default function SettingsPage() {
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // Facebook
  const [fbConnected, setFbConnected] = useState(false)
  const [fbAuthUrl, setFbAuthUrl] = useState('')
  const [fbPages, setFbPages] = useState<FbPage[]>([])
  const [fbToggling, setFbToggling] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Newsletter
  const [nlStats, setNlStats] = useState<NewsletterStats | null>(null)

  // General
  const [siteName, setSiteName] = useState('SportNews Pro')
  const [siteUrl, setSiteUrl] = useState('sportnews.com')
  const [description, setDescription] = useState('Breaking sports news, powered by AI')
  const [language, setLanguage] = useState('bs')
  const [timezone, setTimezone] = useState('Europe/Sarajevo')

  useEffect(() => {
    fetch('/api/site')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        if (data.name) setSiteName(data.name)
        if (data.domain) setSiteUrl(data.domain)
        if (data.gaId) setGaId(data.gaId)
        if (data.language) setLanguage(data.language)
        if (data.timezone) setTimezone(data.timezone)
        if (data.theme) setTheme(data.theme)
        if (data.wpSiteUrl) setWpSiteUrl(data.wpSiteUrl)
        if (data.wpApiKey) setWpApiKey(data.wpApiKey)
        if (data.competitorFeeds) setCompetitorFeeds(data.competitorFeeds)
      })
      .catch(() => {})
  }, [])

  // Facebook connection status
  function loadFbStatus() {
    fetch('/api/social/facebook')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        setFbAuthUrl(data.authUrl || '')
        setFbConnected(data.connected || false)
        setFbPages(data.pages || [])
      })
      .catch(() => {})
  }

  useEffect(() => { loadFbStatus() }, [])

  // Newsletter stats
  useEffect(() => {
    fetch('/api/newsletter/subscribe')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setNlStats(data) })
      .catch(() => {})
  }, [])

  // Handle FB OAuth callback
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
    } catch (error) {
      console.error('FB toggle error:', error)
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
    } catch (error) {
      console.error('FB disconnect error:', error)
    }
  }

  // Theme
  const [theme, setTheme] = useState('editorial')

  // Branding
  const [brandColor, setBrandColor] = useState('#00D4AA')

  // SEO
  const [metaTitle, setMetaTitle] = useState('SportNews Pro — AI-Powered Sports News')
  const [metaDesc, setMetaDesc] = useState('Breaking sports news, match previews, transfer updates and tactical analysis. Powered by AI.')
  const [ogImage, setOgImage] = useState('')

  // Integrations
  const [gaId, setGaId] = useState('')
  const [twitter, setTwitter] = useState('')
  const [facebook, setFacebook] = useState('')
  const [instagram, setInstagram] = useState('')
  const [youtube, setYoutube] = useState('')

  // WordPress
  const [wpSiteUrl, setWpSiteUrl] = useState('')
  const [wpApiKey, setWpApiKey] = useState('')
  const [wpTesting, setWpTesting] = useState(false)
  const [wpTestResult, setWpTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Competitor Tracking
  const [competitorFeeds, setCompetitorFeeds] = useState<string[]>([])
  const [newFeedUrl, setNewFeedUrl] = useState('')

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
          gaId,
          language,
          timezone,
          theme,
          wpSiteUrl: wpSiteUrl || null,
          wpApiKey: wpApiKey || null,
          competitorFeeds,
        }),
      })
      if (res.ok) {
        setDirty(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Save settings error:', error)
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    setDirty(false)
    setSiteName('SportNews Pro')
    setSiteUrl('sportnews.com')
    setDescription('Breaking sports news, powered by AI')
    setLanguage('bs')
    setTimezone('Europe/Sarajevo')
    setBrandColor('#00D4AA')
    setMetaTitle('SportNews Pro — AI-Powered Sports News')
    setMetaDesc('Breaking sports news, match previews, transfer updates and tactical analysis. Powered by AI.')
  }

  const activeCount = fbPages.filter((p) => p.isActive).length

  return (
    <div className="st-page">

      {/* GENERAL */}
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
            <span className="st-label">Site URL</span>
            <input className="st-input mono" value={siteUrl} onChange={(e) => change(setSiteUrl)(e.target.value)} />
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
            <select className="st-select" value={language} onChange={(e) => change(setLanguage)(e.target.value)}>
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

      {/* BRANDING */}
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

      {/* THEME */}
      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">Theme</div>
          <div className="st-section-desc">Choose how your public site looks to readers. Preview each theme before applying.</div>
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
                <div className="st-theme-preview-nav">
                  <span /><span /><span /><span />
                </div>
              </div>
              <div className="st-theme-preview-hero" />
              <div className="st-theme-preview-grid">
                <span /><span /><span />
              </div>
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
                <div className="st-theme-preview-nav">
                  <span /><span /><span /><span />
                </div>
              </div>
              <div className="st-theme-preview-hero" />
              <div className="st-theme-preview-grid">
                <span /><span /><span />
              </div>
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

      {/* SEO */}
      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">SEO Defaults</div>
          <div className="st-section-desc">Default meta tags applied across your publication when not overridden per-article.</div>
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">Meta Tags</div>
          </div>
          <div className="st-card-desc">Search engine and social media appearance defaults.</div>
          <div className="st-row">
            <span className="st-label">Default Meta Title</span>
            <input className="st-input" value={metaTitle} onChange={(e) => change(setMetaTitle)(e.target.value)} />
          </div>
          <div className="st-row">
            <span className="st-label">Meta Description</span>
            <textarea className="st-textarea" value={metaDesc} onChange={(e) => change(setMetaDesc)(e.target.value)} rows={2} />
          </div>
          <div className="st-row">
            <span className="st-label">OG Image URL</span>
            <input className="st-input mono" value={ogImage} onChange={(e) => change(setOgImage)(e.target.value)} placeholder="https://sportnews.com/og-image.jpg" />
          </div>
        </div>
      </div>

      {/* INTEGRATIONS */}
      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">Integrations</div>
          <div className="st-section-desc">Connect external services and social accounts.</div>
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">Analytics</div>
          </div>
          <div className="st-card-desc">Track your publication&apos;s performance with analytics tools.</div>
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

      {/* WORDPRESS */}
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
            Generate an Application Password in WordPress under Users &rarr; Profile &rarr; Application Passwords.
          </div>
          <div className="st-row">
            <span className="st-label">WP Site URL</span>
            <input
              className="st-input mono"
              value={wpSiteUrl}
              onChange={(e) => change(setWpSiteUrl)(e.target.value)}
              placeholder="https://yoursite.com"
            />
          </div>
          <div className="st-row">
            <span className="st-label">API Key</span>
            <input
              className="st-input mono"
              value={wpApiKey}
              onChange={(e) => change(setWpApiKey)(e.target.value)}
              placeholder="username:xxxx xxxx xxxx xxxx"
              type="password"
            />
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
                    const data = await res.json()
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

      {/* COMPETITOR TRACKING */}
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

      {/* NEWSLETTER */}
      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">Newsletter</div>
          <div className="st-section-desc">Manage email subscribers and send newsletters to your audience.</div>
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">📧 Subscriber Overview</div>
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
                          {new Date(sub.subscribedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">Embed Subscribe Widget</div>
          </div>
          <div className="st-card-desc">Copy this code to add a subscribe form to your website.</div>
          <div className="st-row">
            <span className="st-label">Embed Code</span>
            <input
              className="st-input mono"
              readOnly
              value={`<script src="https://cdn.diurna.io/subscribe-widget.js" data-site="sportnews-pro"></script>`}
              onClick={(e) => { (e.target as HTMLInputElement).select(); navigator.clipboard.writeText((e.target as HTMLInputElement).value) }}
            />
          </div>
        </div>
      </div>

      {/* DATA MANAGEMENT */}
      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">Data Management</div>
          <div className="st-section-desc">Import content from other platforms or export your articles for backup and migration.</div>
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

      {/* DANGER ZONE */}
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

      {/* SAVE BAR */}
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
    </div>
  )
}
