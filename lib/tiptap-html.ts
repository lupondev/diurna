type TiptapNode = {
  type: string
  content?: TiptapNode[]
  text?: string
  marks?: TiptapMark[]
  attrs?: Record<string, unknown>
}

type TiptapMark = {
  type: string
  attrs?: Record<string, unknown>
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderMarks(text: string, marks?: TiptapMark[]): string {
  if (!marks || marks.length === 0) return escapeHtml(text)

  let html = escapeHtml(text)
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        html = `<strong>${html}</strong>`
        break
      case 'italic':
        html = `<em>${html}</em>`
        break
      case 'strike':
        html = `<s>${html}</s>`
        break
      case 'code':
        html = `<code>${html}</code>`
        break
      case 'underline':
        html = `<u>${html}</u>`
        break
      case 'highlight': {
        const color = mark.attrs?.color ? ` style="background-color:${escapeHtml(String(mark.attrs.color))}"` : ''
        html = `<mark${color}>${html}</mark>`
        break
      }
      case 'link': {
        const href = escapeHtml(String(mark.attrs?.href || ''))
        const target = mark.attrs?.target ? ` target="${escapeHtml(String(mark.attrs.target))}"` : ' target="_blank"'
        html = `<a href="${href}"${target} rel="noopener noreferrer">${html}</a>`
        break
      }
    }
  }
  return html
}

function getNodeText(node: TiptapNode): string {
  if (node.type === 'text') return node.text || ''
  if (!node.content) return ''
  return node.content.map(getNodeText).join('')
}

function detectWidget(node: TiptapNode): { type: string; attrs: string } | null {
  if (node.type !== 'blockquote' || !node.content) return null
  for (const child of node.content) {
    const text = getNodeText(child).trim()
    const match = text.match(/^<!--widget:(\w+)(.*)-->$/)
    if (match) return { type: match[1], attrs: match[2] }
  }
  for (const child of node.content) {
    if (child.type === 'heading') {
      const text = getNodeText(child)
      if (text.startsWith('📊 Poll:')) return { type: 'poll', attrs: '' }
      if (text.startsWith('🧠 Quiz:')) return { type: 'quiz', attrs: '' }
      if (text.startsWith('📋 Survey:')) return { type: 'survey', attrs: '' }
    }
  }
  return null
}

function extractListItems(node: TiptapNode): string[] {
  const items: string[] = []
  if (!node.content) return items
  for (const child of node.content) {
    if (child.type === 'bulletList' || child.type === 'orderedList') {
      for (const li of child.content || []) {
        items.push(getNodeText(li).trim())
      }
    }
  }
  return items
}

function extractWidgetQuestion(node: TiptapNode): string {
  for (const child of node.content || []) {
    if (child.type === 'heading') {
      const text = getNodeText(child)
      return text.replace(/^[📊🧠📋]\s*(Poll|Quiz|Survey):\s*/, '')
    }
  }
  return ''
}

function renderWidgetBlockquote(node: TiptapNode, widget: { type: string; attrs: string }): string {
  const question = escapeHtml(extractWidgetQuestion(node))
  const items = extractListItems(node)

  if (widget.type === 'poll') {
    const optionsJson = escapeHtml(JSON.stringify(items))
    return `<div data-widget="poll" data-question="${question}" data-options="${optionsJson}"></div>`
  }

  if (widget.type === 'quiz') {
    const correctMatch = widget.attrs.match(/correct=(\d+)/)
    const correctIndex = correctMatch ? parseInt(correctMatch[1]) : 0
    let correct = correctIndex
    const cleanItems = items.map((item, i) => {
      if (item.endsWith(' ✓')) {
        correct = i
        return item.replace(/ ✓$/, '')
      }
      return item
    })
    const optionsJson = escapeHtml(JSON.stringify(cleanItems))
    return `<div data-widget="quiz" data-questions="${escapeHtml(JSON.stringify([{ q: question, options: cleanItems, correct }]))}"></div>`
  }

  if (widget.type === 'survey') {
    return `<div data-widget="survey" data-question="${question}"></div>`
  }

  return `<blockquote>${renderChildren(node)}</blockquote>`
}

function renderNode(node: TiptapNode): string {
  switch (node.type) {
    case 'text':
      return renderMarks(node.text || '', node.marks)

    case 'paragraph': {
      const text = getNodeText(node).trim()
      if (text.match(/^<!--\/?widget.*-->$/)) return ''
      return `<p>${renderChildren(node)}</p>`
    }

    case 'heading': {
      const level = node.attrs?.level || 2
      return `<h${level}>${renderChildren(node)}</h${level}>`
    }

    case 'bulletList':
      return `<ul>${renderChildren(node)}</ul>`

    case 'orderedList':
      return `<ol>${renderChildren(node)}</ol>`

    case 'listItem':
      return `<li>${renderChildren(node)}</li>`

    case 'blockquote': {
      const widget = detectWidget(node)
      if (widget) return renderWidgetBlockquote(node, widget)
      return `<blockquote>${renderChildren(node)}</blockquote>`
    }

    case 'horizontalRule':
      return '<hr />'

    case 'image': {
      const src = escapeHtml(String(node.attrs?.src || ''))
      const alt = escapeHtml(String(node.attrs?.alt || ''))
      const title = node.attrs?.title ? ` title="${escapeHtml(String(node.attrs.title))}"` : ''
      return `<img src="${src}" alt="${alt}"${title} />`
    }

    case 'codeBlock': {
      const text = getNodeText(node).trim()
      if (!text) return ''
      return text.split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('')
    }

    case 'youtube': {
      const src = escapeHtml(String(node.attrs?.src || ''))
      return `<div data-widget="video" data-url="${src}" data-caption=""></div>`
    }

    case 'table':
      return `<table>${renderChildren(node)}</table>`

    case 'tableRow':
      return `<tr>${renderChildren(node)}</tr>`

    case 'tableCell':
      return `<td>${renderChildren(node)}</td>`

    case 'tableHeader':
      return `<th>${renderChildren(node)}</th>`

    case 'hardBreak':
      return '<br />'

    case 'poll': {
      const question = escapeHtml(String(node.attrs?.question || ''))
      const options = escapeHtml(JSON.stringify(node.attrs?.options || []))
      return `<div data-widget="poll" data-question="${question}" data-options="${options}"></div>`
    }

    case 'quiz': {
      const questions = escapeHtml(JSON.stringify(node.attrs?.questions || []))
      return `<div data-widget="quiz" data-questions="${questions}"></div>`
    }

    case 'matchWidget': {
      const a = node.attrs || {}
      const score = `${a.homeScore || '0'}-${a.awayScore || '0'}`
      return `<div data-widget="match" data-home="${escapeHtml(String(a.homeTeam || ''))}" data-away="${escapeHtml(String(a.awayTeam || ''))}" data-score="${escapeHtml(score)}" data-league="${escapeHtml(String(a.league || ''))}" data-date="${escapeHtml(String(a.matchTime || ''))}" data-status="FT"></div>`
    }

    case 'statsTable': {
      const a = node.attrs || {}
      const title = escapeHtml(String(a.title || ''))
      const rows = a.rows as Array<{ label: string; home: string; away: string }> | undefined
      const headers = JSON.stringify(['', String(a.homeLabel || 'Home'), String(a.awayLabel || 'Away')])
      const tableRows = (rows || []).map(r => [r.label, r.home, r.away])
      return `<div data-widget="stats-table" data-title="${title}" data-headers="${escapeHtml(headers)}" data-rows="${escapeHtml(JSON.stringify(tableRows))}"></div>`
    }

    case 'playerCard': {
      const a = node.attrs || {}
      return `<div data-widget="player-card" data-name="${escapeHtml(String(a.playerName || ''))}" data-team="" data-position="" data-number="" data-nationality="" data-image=""></div>`
    }

    case 'video':
    case 'videoEmbed': {
      const url = escapeHtml(String(node.attrs?.url || node.attrs?.src || ''))
      const caption = escapeHtml(String(node.attrs?.caption || ''))
      return `<div data-widget="video" data-url="${url}" data-caption="${caption}"></div>`
    }

    case 'gallery':
    case 'imageGallery': {
      const images = node.attrs?.images || []
      return `<div data-widget="gallery" data-images="${escapeHtml(JSON.stringify(images))}"></div>`
    }

    case 'socialEmbed': {
      const a = node.attrs || {}
      return `<div data-widget="social-embed" data-platform="${escapeHtml(String(a.platform || ''))}" data-text="" data-author="" data-timestamp="" data-url="${escapeHtml(String(a.url || ''))}"></div>`
    }

    case 'widget': {
      const widgetType = escapeHtml(String(node.attrs?.widget || ''))
      const dataAttrs = Object.entries(node.attrs || {})
        .filter(([k]) => k !== 'widget')
        .map(([k, v]) => ` data-${escapeHtml(k)}="${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}"`)
        .join('')
      return `<div data-widget="${widgetType}"${dataAttrs}></div>`
    }

    default:
      return renderChildren(node)
  }
}

function renderChildren(node: TiptapNode): string {
  if (!node.content) return ''
  return node.content.map(renderNode).join('')
}

function stripLegacyWidgetPlaceholders(html: string): string {
  return html.replace(/\{\{WIDGET:[A-Z_]+\}\}/g, '')
}

export function tiptapToHtml(doc: unknown): string {
  if (!doc) return ''
  if (typeof doc === 'string') return stripLegacyWidgetPlaceholders(doc)
  if (typeof doc !== 'object') return ''
  const obj = doc as Record<string, unknown>
  if (typeof obj.html === 'string') return stripLegacyWidgetPlaceholders(obj.html)
  const root = doc as TiptapNode
  if (root.type !== 'doc' || !root.content) return ''
  return root.content.map(renderNode).join('')
}
