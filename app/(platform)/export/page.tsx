'use client'

import { useState } from 'react'
import './export.css'

export default function ExportPage() {
  const [exporting, setExporting] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleExport(format: 'json' | 'csv' | 'wxr') {
    setExporting(format)
    setError('')
    try {
      const res = await fetch(`/api/export?format=${format}`)
      if (!res.ok) {
        const data = await (res.json() as Promise<{ error?: string }>).catch(() => ({ error: 'Export failed' }))
        throw new Error(data.error || 'Export failed')
      }

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch ? filenameMatch[1] : `export.${format === 'wxr' ? 'xml' : format}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="exp-page">
      <div className="exp-head">
        <div>
          <h1 className="exp-title">Export Content</h1>
          <p className="exp-desc">Download all your articles in various formats for backup or migration.</p>
        </div>
      </div>

      {error && <div className="exp-error">{error}</div>}

      <div className="exp-grid">
        <div className="exp-card">
          <div className="exp-card-icon">{ }</div>
          <div className="exp-card-title">Diurna JSON</div>
          <p className="exp-card-desc">Full export with all article data, categories, and tags. Best for re-importing into Diurna or custom integrations.</p>
          <div className="exp-card-meta">
            <span className="exp-badge">Recommended</span>
            <span className="exp-format">.json</span>
          </div>
          <button className="exp-btn" onClick={() => handleExport('json')} disabled={exporting !== null}>
            {exporting === 'json' ? 'Exporting...' : 'Download JSON'}
          </button>
        </div>

        <div className="exp-card">
          <div className="exp-card-icon">CSV</div>
          <div className="exp-card-title">CSV Spreadsheet</div>
          <p className="exp-card-desc">Simple tabular format compatible with Excel, Google Sheets, and other spreadsheet tools.</p>
          <div className="exp-card-meta">
            <span className="exp-format">.csv</span>
          </div>
          <button className="exp-btn secondary" onClick={() => handleExport('csv')} disabled={exporting !== null}>
            {exporting === 'csv' ? 'Exporting...' : 'Download CSV'}
          </button>
        </div>

        <div className="exp-card">
          <div className="exp-card-icon">WP</div>
          <div className="exp-card-title">WordPress WXR</div>
          <p className="exp-card-desc">WordPress eXtended RSS format. Import directly into any WordPress site via Tools &rarr; Import.</p>
          <div className="exp-card-meta">
            <span className="exp-format">.xml</span>
          </div>
          <button className="exp-btn secondary" onClick={() => handleExport('wxr')} disabled={exporting !== null}>
            {exporting === 'wxr' ? 'Exporting...' : 'Download WXR XML'}
          </button>
        </div>
      </div>
    </div>
  )
}
