'use client'

import { useState, useRef } from 'react'
import './import.css'

interface ParsedArticle {
  title: string
  slug: string
  content: string
  excerpt: string
  status: string
  publishedAt: string | null
  author: string
  categories: string[]
  tags: string[]
  featuredImage: string | null
  selected?: boolean
}

type ImportTab = 'wordpress' | 'csv' | 'json'

export default function ImportPage() {
  const [tab, setTab] = useState<ImportTab>('wordpress')
  const [articles, setArticles] = useState<ParsedArticle[]>([])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState('')
  const [jsonText, setJsonText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const csvRef = useRef<HTMLInputElement>(null)
  const jsonFileRef = useRef<HTMLInputElement>(null)

  function toggleAll(checked: boolean) {
    setArticles((prev) => prev.map((a) => ({ ...a, selected: checked })))
  }

  function toggleOne(index: number) {
    setArticles((prev) => prev.map((a, i) => i === index ? { ...a, selected: !a.selected } : a))
  }

  async function handleWpUpload(file: File) {
    setParsing(true)
    setError('')
    setResult(null)
    setArticles([])
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/import/wordpress', { method: 'POST', body: form })
      const data = await res.json() as { error?: string; articles: ParsedArticle[] }
      if (!res.ok) throw new Error(data.error || 'Parse failed')
      setArticles(data.articles.map((a: ParsedArticle) => ({ ...a, selected: true })))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setParsing(false)
    }
  }

  async function handleCsvUpload(file: File) {
    setParsing(true)
    setError('')
    setResult(null)
    setArticles([])
    try {
      const text = await file.text()
      const lines = text.split('\n').filter((l) => l.trim())
      if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row')

      const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
      const titleIdx = header.indexOf('title')
      const contentIdx = header.indexOf('content')
      const categoryIdx = header.indexOf('category')
      const statusIdx = header.indexOf('status')
      const slugIdx = header.indexOf('slug')

      if (titleIdx === -1) throw new Error('CSV must have a "title" column')

      const parsed: ParsedArticle[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i])
        const title = cols[titleIdx]?.trim()
        if (!title) continue

        parsed.push({
          title,
          slug: (cols[slugIdx] || title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          content: cols[contentIdx] || '',
          excerpt: '',
          status: mapStatus(cols[statusIdx] || 'draft'),
          publishedAt: null,
          author: '',
          categories: cols[categoryIdx] ? [cols[categoryIdx].trim()] : [],
          tags: [],
          featuredImage: null,
          selected: true,
        })
      }
      setArticles(parsed)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setParsing(false)
    }
  }

  function handleJsonParse() {
    setError('')
    setResult(null)
    try {
      const data = JSON.parse(jsonText)
      const arr = Array.isArray(data) ? data : [data]
      const parsed: ParsedArticle[] = arr.map((a: any) => ({
        title: a.title || '',
        slug: a.slug || a.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '',
        content: typeof a.content === 'string' ? a.content : JSON.stringify(a.content || ''),
        excerpt: a.excerpt || '',
        status: mapStatus(a.status || 'DRAFT'),
        publishedAt: a.publishedAt || null,
        author: a.author || '',
        categories: a.categories ? (Array.isArray(a.categories) ? a.categories : [a.categories]) : (a.category ? [a.category] : []),
        tags: a.tags || [],
        featuredImage: a.featuredImage || null,
        selected: true,
      }))
      setArticles(parsed)
    } catch {
      setError('Invalid JSON format')
    }
  }

  async function handleJsonFileUpload(file: File) {
    const text = await file.text()
    setJsonText(text)
    try {
      const data = JSON.parse(text)
      const arr = Array.isArray(data) ? data : [data]
      setArticles(arr.map((a: any) => ({
        title: a.title || '',
        slug: a.slug || a.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '',
        content: typeof a.content === 'string' ? a.content : JSON.stringify(a.content || ''),
        excerpt: a.excerpt || '',
        status: mapStatus(a.status || 'DRAFT'),
        publishedAt: a.publishedAt || null,
        author: a.author || '',
        categories: a.categories ? (Array.isArray(a.categories) ? a.categories : [a.categories]) : (a.category ? [a.category] : []),
        tags: a.tags || [],
        featuredImage: a.featuredImage || null,
        selected: true,
      })))
      setError('')
    } catch {
      setError('Invalid JSON file')
    }
  }

  async function handleImport() {
    const selected = articles.filter((a) => a.selected)
    if (selected.length === 0) return
    setImporting(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: selected }),
      })
      const data = await res.json() as { error?: string; imported: number; skipped: number }
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setResult({ imported: data.imported, skipped: data.skipped })
      setArticles([])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  const selectedCount = articles.filter((a) => a.selected).length

  return (
    <div className="imp-page">
      <div className="imp-head">
        <div>
          <h1 className="imp-title">Import Content</h1>
          <p className="imp-desc">Migrate articles from WordPress, CSV files, or Diurna JSON exports.</p>
        </div>
      </div>

      <div className="imp-tabs">
        <button className={`imp-tab ${tab === 'wordpress' ? 'active' : ''}`} onClick={() => { setTab('wordpress'); setArticles([]); setError(''); setResult(null) }}>WordPress XML</button>
        <button className={`imp-tab ${tab === 'csv' ? 'active' : ''}`} onClick={() => { setTab('csv'); setArticles([]); setError(''); setResult(null) }}>CSV</button>
        <button className={`imp-tab ${tab === 'json' ? 'active' : ''}`} onClick={() => { setTab('json'); setArticles([]); setError(''); setResult(null) }}>JSON</button>
      </div>

      {tab === 'wordpress' && (
        <div className="imp-card">
          <div className="imp-card-title">Upload WordPress Export (WXR XML)</div>
          <p className="imp-card-desc">Go to your WordPress admin &rarr; Tools &rarr; Export &rarr; Download Export File, then upload the .xml file here.</p>
          <input ref={fileRef} type="file" accept=".xml" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleWpUpload(f) }} />
          <button className="imp-upload-btn" onClick={() => fileRef.current?.click()} disabled={parsing}>
            {parsing ? 'Parsing XML...' : 'Choose XML File'}
          </button>
        </div>
      )}

      {tab === 'csv' && (
        <div className="imp-card">
          <div className="imp-card-title">Upload CSV File</div>
          <p className="imp-card-desc">CSV must have a header row with at least a &quot;title&quot; column. Optional columns: content, category, status, slug.</p>
          <input ref={csvRef} type="file" accept=".csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f) }} />
          <button className="imp-upload-btn" onClick={() => csvRef.current?.click()} disabled={parsing}>
            {parsing ? 'Parsing CSV...' : 'Choose CSV File'}
          </button>
        </div>
      )}

      {tab === 'json' && (
        <div className="imp-card">
          <div className="imp-card-title">Import Diurna JSON</div>
          <p className="imp-card-desc">Paste JSON or upload a .json file. Expected format: array of objects with title, content, status, category, tags fields.</p>
          <div className="imp-json-row">
            <textarea
              className="imp-json-input"
              placeholder='[{ "title": "My Article", "content": "...", "status": "DRAFT", "category": "News" }]'
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={6}
            />
            <div className="imp-json-actions">
              <input ref={jsonFileRef} type="file" accept=".json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleJsonFileUpload(f) }} />
              <button className="imp-upload-btn small" onClick={() => jsonFileRef.current?.click()}>Upload .json</button>
              <button className="imp-upload-btn small" onClick={handleJsonParse} disabled={!jsonText.trim()}>Parse JSON</button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="imp-error">{error}</div>}

      {result && (
        <div className="imp-success">
          Imported {result.imported} article{result.imported !== 1 ? 's' : ''} successfully.
          {result.skipped > 0 && ` ${result.skipped} skipped.`}
        </div>
      )}

      {articles.length > 0 && (
        <div className="imp-preview">
          <div className="imp-preview-head">
            <div className="imp-preview-title">Preview ({articles.length} articles found)</div>
            <div className="imp-preview-actions">
              <label className="imp-check-label">
                <input type="checkbox" checked={selectedCount === articles.length} onChange={(e) => toggleAll(e.target.checked)} />
                Select All
              </label>
              <span className="imp-selected-count">{selectedCount} selected</span>
            </div>
          </div>
          <div className="imp-table-wrap">
            <table className="imp-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Tags</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a, i) => (
                  <tr key={i} className={a.selected ? 'selected' : ''}>
                    <td><input type="checkbox" checked={a.selected || false} onChange={() => toggleOne(i)} /></td>
                    <td className="imp-cell-title">{a.title}</td>
                    <td className="imp-cell-slug">{a.slug}</td>
                    <td><span className={`imp-status ${a.status.toLowerCase()}`}>{a.status}</span></td>
                    <td>{a.categories.join(', ') || '—'}</td>
                    <td className="imp-cell-tags">{a.tags.join(', ') || '—'}</td>
                    <td className="imp-cell-date">{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="imp-import-bar">
            <button className="imp-import-btn" onClick={handleImport} disabled={importing || selectedCount === 0}>
              {importing ? 'Importing...' : `Import ${selectedCount} Article${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function mapStatus(s: string): string {
  const lower = s.toLowerCase().trim()
  if (lower === 'publish' || lower === 'published') return 'PUBLISHED'
  if (lower === 'pending' || lower === 'in_review' || lower === 'review') return 'IN_REVIEW'
  if (lower === 'scheduled') return 'SCHEDULED'
  if (lower === 'private' || lower === 'archived') return 'ARCHIVED'
  return 'DRAFT'
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}
