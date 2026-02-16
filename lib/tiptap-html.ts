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

function renderNode(node: TiptapNode): string {
  switch (node.type) {
    case 'text':
      return renderMarks(node.text || '', node.marks)

    case 'paragraph':
      return `<p>${renderChildren(node)}</p>`

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

    case 'blockquote':
      return `<blockquote>${renderChildren(node)}</blockquote>`

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
