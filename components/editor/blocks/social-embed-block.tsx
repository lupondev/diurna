'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useState } from 'react'

function detectPlatform(url: string): string {
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('facebook.com')) return 'facebook'
  return 'unknown'
}

function SocialEmbedComponent({ node, updateAttributes, deleteNode, selected }: {
  node: { attrs: { url: string; platform: string } }
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  selected: boolean
}) {
  const { url, platform } = node.attrs
  const [inputUrl, setInputUrl] = useState(url)

  const platformIcons: Record<string, string> = {
    twitter: '𝕏', instagram: '📷', tiktok: '🎵', facebook: '📘', unknown: '🌐',
  }

  return (
    <NodeViewWrapper data-type="socialEmbed" className={`blk blk-social ${selected ? 'blk-selected' : ''}`}>
      <div className="blk-head">
        <span className="blk-icon">🌐</span>
        <span className="blk-label">Social Embed</span>
        <button className="blk-del" onClick={deleteNode} title="Remove block">×</button>
      </div>
      {url ? (
        <div className="blk-social-preview">
          <div className="blk-social-platform">
            <span>{platformIcons[platform] || '🌐'}</span>
            <span>{platform || 'Social'}</span>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="blk-social-link">{url}</a>
          <button className="blk-player-change" onClick={() => updateAttributes({ url: '', platform: '' })}>
            Change URL
          </button>
        </div>
      ) : (
        <div className="blk-video-input-wrap">
          <input
            className="blk-video-url"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateAttributes({ url: inputUrl, platform: detectPlatform(inputUrl) })
              }
            }}
            placeholder="Paste Twitter, Instagram, or TikTok URL..."
          />
          <button className="blk-video-set" onClick={() => {
            updateAttributes({ url: inputUrl, platform: detectPlatform(inputUrl) })
          }}>Embed</button>
        </div>
      )}
    </NodeViewWrapper>
  )
}

export const SocialEmbedBlock = Node.create({
  name: 'socialEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: '' },
      platform: { default: '' },
    }
  },

  parseHTML() { return [{ tag: 'div[data-type="socialEmbed"]' }] },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'socialEmbed' }), 0]
  },

  addNodeView() { return ReactNodeViewRenderer(SocialEmbedComponent as never) },
})
