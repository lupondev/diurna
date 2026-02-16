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
    return `<div class="widget-poll" data-question="${question}" data-options="${optionsJson}"></div>`
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
    return `<div class="widget-quiz" data-question="${question}" data-options="${optionsJson}" data-correct="${correct}"></div>`
  }

  if (widget.type === 'survey') {
    return `<div class="widget-survey" data-question="${question}"></div>`
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
      const lang = node.attrs?.language ? ` class="language-${escapeHtml(String(node.attrs.language))}"` : ''
      return `<pre><code${lang}>${renderChildren(node)}</code></pre>`
    }

    case 'youtube': {
      const src = escapeHtml(String(node.attrs?.src || ''))
      return `<div class="video-embed"><iframe src="${src}" frameborder="0" allowfullscreen></iframe></div>`
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

    default:
      return renderChildren(node)
  }
}

function renderChildren(node: TiptapNode): string {
  if (!node.content) return ''
  return node.content.map(renderNode).join('')
}

export function tiptapToHtml(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return ''
  const root = doc as TiptapNode
  if (root.type !== 'doc' || !root.content) return ''
  return root.content.map(renderNode).join('')
}
