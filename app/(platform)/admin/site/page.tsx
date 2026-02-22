'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

type SiteSettings = {
  name: string
  slug: string
  language: string
  timezone: string
  gaId: string
  apiKeys: {
    anthropic: boolean
    gemini: boolean
    unsplash: boolean
    apiFootball: boolean
    cronSecret: boolean
  }
}

export default function AdminSitePage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const isOwner = session?.user?.role === 'OWNER'

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/site')
      if (res.ok) setSettings(await res.json() as SiteSettings)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const saveSettings = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/site', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settings.name,
          language: settings.language,
          timezone: settings.timezone,
          gaId: settings.gaId,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        const data = await res.json() as { error?: string }
        alert(data.error || 'Error saving settings')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--g400)' }}>Loading settings...</div>
  }

  if (!settings) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--g400)' }}>Error loading settings</div>
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--g900)' }}>Site Settings</div>
        <div style={{ fontSize: 12, color: 'var(--g500)' }}>Configure your organization settings</div>
      </div>

      <div className="adm-card">
        <div className="adm-card-title">General</div>
        <div className="adm-card-desc" style={{ marginBottom: 16 }}>Basic organization information</div>

        <div className="adm-field">
          <label className="adm-label">Organization name</label>
          <input
            className="adm-input"
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
          />
        </div>

        <div className="adm-field">
          <label className="adm-label">Slug</label>
          <input
            className="adm-input"
            value={settings.slug}
            disabled
            style={{ background: 'var(--g50)', color: 'var(--g400)' }}
          />
          <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 4 }}>Slug cannot be changed</div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div className="adm-field" style={{ flex: 1 }}>
            <label className="adm-label">Language</label>
            <select
              className="adm-select"
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              style={{ width: '100%', padding: '10px 14px' }}
            >
              <option value="bs">Bosnian</option>
              <option value="en">English</option>
              <option value="tr">Turkish</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
              <option value="ar">Arabic</option>
            </select>
          </div>

          <div className="adm-field" style={{ flex: 1 }}>
            <label className="adm-label">Timezone</label>
            <select
              className="adm-select"
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              style={{ width: '100%', padding: '10px 14px' }}
            >
              <option value="Europe/Sarajevo">Sarajevo</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Istanbul">Istanbul</option>
              <option value="Europe/Berlin">Berlin</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <button
            className="adm-btn adm-btn-primary"
            onClick={saveSettings}
            disabled={saving}
            style={{ opacity: saving ? 0.5 : 1 }}
          >
            {saved ? '\u2713 Saved' : saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-title">API Keys</div>
        <div className="adm-card-desc" style={{ marginBottom: 16 }}>Connections to external services (configured via env variables)</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {([
            ['Anthropic (Claude)', settings.apiKeys.anthropic],
            ['Google Gemini', settings.apiKeys.gemini],
            ['Unsplash', settings.apiKeys.unsplash],
            ['API-Football', settings.apiKeys.apiFootball],
            ['CRON_SECRET', settings.apiKeys.cronSecret],
          ] as [string, boolean][]).map(([name, configured]) => (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 8,
              background: 'var(--g50)', fontSize: 13,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: configured ? '#22c55e' : '#ef4444',
                flexShrink: 0,
              }} />
              <span style={{ color: 'var(--g700)' }}>{name}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: configured ? '#22c55e' : 'var(--g400)' }}>
                {configured ? 'Active' : 'Missing'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-title">Google Analytics</div>
        <div className="adm-card-desc" style={{ marginBottom: 16 }}>GA4 Measurement ID for tracking visits on the public site</div>

        <div className="adm-field">
          <label className="adm-label">GA4 Measurement ID</label>
          <input
            className="adm-input"
            value={settings.gaId}
            onChange={(e) => setSettings({ ...settings, gaId: e.target.value })}
            placeholder="G-XXXXXXXXXX"
          />
          <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 4 }}>
            Enter your GA4 Measurement ID (e.g. G-XXXXXXXXXX). Leave empty to disable tracking.
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <button
            className="adm-btn adm-btn-primary"
            onClick={saveSettings}
            disabled={saving}
            style={{ opacity: saving ? 0.5 : 1 }}
          >
            {saved ? '\u2713 Saved' : saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>

      {isOwner && (
        <div className="adm-danger">
          <div className="adm-danger-title">Danger Zone</div>
          <div className="adm-danger-desc">
            Permanently delete this organization and all its data. This action cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="adm-input"
              placeholder={`Type "${settings.slug}" to confirm`}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              style={{ maxWidth: 260 }}
            />
            <button
              className="adm-btn adm-btn-danger"
              disabled={deleteConfirm !== settings.slug}
              style={{ opacity: deleteConfirm !== settings.slug ? 0.4 : 1 }}
              onClick={() => alert('Contact support to delete your organization.')}
            >
              Delete organization
            </button>
          </div>
        </div>
      )}
    </>
  )
}
