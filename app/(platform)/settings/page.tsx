'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { SUPPORTED_LANGUAGES } from '@/lib/languages'
import './settings.css'

export default function SettingsPage() {
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  // Facebook
  const [fbConnected, setFbConnected] = useState(false)
  const [fbPageName, setFbPageName] = useState<string | null>(null)
  const [fbAuthUrl, setFbAuthUrl] = useState('')
  const [fbPages, setFbPages] = useState<Array<{ id: string; name: string; token: string }>>([])
  const [fbSaving, setFbSaving] = useState(false)
  const searchParams = useSearchParams()

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
      })
      .catch(() => {})
  }, [])

  // Facebook connection status
  useEffect(() => {
    fetch('/api/social/facebook')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        setFbAuthUrl(data.authUrl || '')
        setFbConnected(data.connected || false)
        setFbPageName(data.pageName || null)
      })
      .catch(() => {})
  }, [])

  // Handle FB OAuth callback params
  useEffect(() => {
    const fbStatus = searchParams.get('fb')
    const pagesParam = searchParams.get('pages')

    if (fbStatus === 'success' && pagesParam) {
      try {
        const pages = JSON.parse(decodeURIComponent(pagesParam))
        setFbPages(pages)
      } catch { /* ignore */ }
      // Clean URL
      window.history.replaceState({}, '', '/settings')
    }
  }, [searchParams])

  async function connectFbPage(page: { id: string; name: string; token: string }) {
    setFbSaving(true)
    try {
      const res = await fetch('/api/social/facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: page.id, pageName: page.name, pageToken: page.token }),
      })
      if (res.ok) {
        setFbConnected(true)
        setFbPageName(page.name)
        setFbPages([])
      }
    } catch (error) {
      console.error('FB connect error:', error)
    } finally {
      setFbSaving(false)
    }
  }

  async function disconnectFb() {
    try {
      const res = await fetch('/api/social/facebook', { method: 'DELETE' })
      if (res.ok) {
        setFbConnected(false)
        setFbPageName(null)
      }
    } catch (error) {
      console.error('FB disconnect error:', error)
    }
  }

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

  return (
    <div className="st-page">

      {/* ═══ GENERAL ═══ */}
      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">🏢 General Settings</div>
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

      {/* ═══ BRANDING ═══ */}
      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">🎨 Branding</div>
          <div className="st-section-desc">Customize the look and feel of your publication.</div>
        </div>

        <div className="st-card">
          <div className="st-card-head">
            <div className="st-card-title">Logo &amp; Colors</div>
          </div>
          <div className="st-card-desc">Your publication&apos;s visual identity.</div>
          <div className="st-row">
            <span className="st-label">Logo</span>
            <div className="st-upload" title="Click to upload">⚽</div>
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
            <div className="st-upload" title="Click to upload" style={{ width: 36, height: 36, fontSize: 14 }}>📰</div>
          </div>
        </div>
      </div>

      {/* ═══ SEO ═══ */}
      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">🔍 SEO Defaults</div>
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

      {/* ═══ INTEGRATIONS ═══ */}
      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">🔌 Integrations</div>
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
          <div className="st-card-desc">Connect a Facebook Page to auto-post articles when published.</div>
          {fbConnected ? (
            <div className="st-fb-connected">
              <div className="st-fb-status">
                <div className="st-social-icon fb">f</div>
                <div>
                  <div className="st-fb-page-name">{fbPageName || 'Connected Page'}</div>
                  <div className="st-fb-status-text">Connected — articles will auto-post on publish</div>
                </div>
              </div>
              <button className="st-fb-disconnect" onClick={disconnectFb}>Disconnect</button>
            </div>
          ) : fbPages.length > 0 ? (
            <div className="st-fb-pages">
              <div className="st-fb-pages-title">Select a page to connect:</div>
              {fbPages.map((page) => (
                <button
                  key={page.id}
                  className="st-fb-page-btn"
                  onClick={() => connectFbPage(page)}
                  disabled={fbSaving}
                >
                  <div className="st-social-icon fb">f</div>
                  <span>{page.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="st-row">
              <span className="st-label">Facebook Page</span>
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
            <div className="st-social-icon tw">𝕏</div>
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
            <div className="st-social-icon yt">▶</div>
            <span className="st-social-name">YouTube</span>
            <input value={youtube} onChange={(e) => change(setYoutube)(e.target.value)} placeholder="youtube.com/@sportnewspro" />
          </div>
        </div>
      </div>

      {/* ═══ DANGER ZONE ═══ */}
      <div className="st-section">
        <div className="st-section-head">
          <div className="st-section-title">⚠️ Danger Zone</div>
          <div className="st-section-desc">Irreversible actions. Proceed with extreme caution.</div>
        </div>

        <div className="st-danger">
          <div className="st-danger-title">🗑️ Delete Publication</div>
          <div className="st-danger-desc">
            Permanently delete this publication and all its data including articles, widgets, and analytics.
            This action cannot be undone.
          </div>
          <button className="st-danger-btn" onClick={() => alert('This action is not available in the current version.')}>
            Delete Publication
          </button>
        </div>
      </div>

      {/* ═══ SAVE BAR ═══ */}
      {(dirty || saved) && (
        <div className="st-save-bar">
          <div className="st-save-text">
            {saved ? <><strong>✅ Settings saved</strong></> : <><strong>Unsaved changes</strong> — save or discard</>}
          </div>
          {!saved && (
            <div className="st-save-actions">
              <button className="st-save-discard" onClick={handleDiscard}>Discard</button>
              <button className="st-save-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save Changes'}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
