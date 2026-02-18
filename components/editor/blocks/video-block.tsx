'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useState } from 'react'

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return null
}

function VideoComponent({ node, updateAttributes, deleteNode, selected }: {
  node: { attrs: { url: string; caption: string } }
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  selected: boolean
}) {
  const { url, caption } = node.attrs
  const [inputUrl, setInputUrl] = useState(url)
  const embedUrl = getEmbedUrl(url)

  return (
    <NodeViewWrapper data-type="video" className={`blk blk-video ${selected ? 'blk-selected' : ''}`}>
      <div className="blk-head">
        <span className="blk-icon">▶️</span>
        <span className="blk-label">Video</span>
        <button className="blk-del" onClick={deleteNode} title="Remove block">×</button>
      </div>
      {embedUrl ? (
        <div className="blk-video-wrap">
          <iframe
            src={embedUrl}
            allowFullScreen
            className="blk-video-iframe"
            title={caption || 'Video embed'}
          />
          <input
            className="blk-video-caption"
            value={caption}
            onChange={(e) => updateAttributes({ caption: e.target.value })}
            placeholder="Video caption (optional)..."
          />
        </div>
      ) : (
        <div className="blk-video-input-wrap">
          <input
            className="blk-video-url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') updateAttributes({ url: inputUrl }) }}
            placeholder="Paste YouTube or Vimeo URL..."
          />
          <button className="blk-video-set" onClick={() => updateAttributes({ url: inputUrl })}>Embed</button>
        </div>
      )}
    </NodeViewWrapper>
  )
}

export const VideoBlock = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: '' },
      caption: { default: '' },
    }
  },

  parseHTML() { return [{ tag: 'div[data-type="video"]' }] },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'video' }), 0]
  },

  addNodeView() { return ReactNodeViewRenderer(VideoComponent as never) },
})
