'use client'

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'

type GalleryImage = { url: string; caption: string }

function GalleryComponent({ node, updateAttributes, deleteNode, selected }: {
  node: { attrs: { images: GalleryImage[] } }
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  selected: boolean
}) {
  const { images } = node.attrs

  function updateImage(idx: number, field: keyof GalleryImage, value: string) {
    const newImages = images.map((img: GalleryImage, i: number) => i === idx ? { ...img, [field]: value } : img)
    updateAttributes({ images: newImages })
  }

  function addImage() {
    const url = window.prompt('Image URL:')
    if (url) {
      updateAttributes({ images: [...images, { url, caption: '' }] })
    }
  }

  function removeImage(idx: number) {
    updateAttributes({ images: images.filter((_: GalleryImage, i: number) => i !== idx) })
  }

  return (
    <NodeViewWrapper data-type="gallery" className={`blk blk-gallery ${selected ? 'blk-selected' : ''}`}>
      <div className="blk-head">
        <span className="blk-icon">📸</span>
        <span className="blk-label">Gallery ({images.length} images)</span>
        <button className="blk-del" onClick={deleteNode} title="Remove block">×</button>
      </div>
      <div className="blk-gallery-grid">
        {(images || []).map((img: GalleryImage, i: number) => (
          <div key={i} className="blk-gallery-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.caption || `Gallery image ${i + 1}`} className="blk-gallery-img" />
            <input
              className="blk-gallery-caption"
              value={img.caption}
              onChange={(e) => updateImage(i, 'caption', e.target.value)}
              placeholder="Caption..."
            />
            <button className="blk-gallery-rm" onClick={() => removeImage(i)}>×</button>
          </div>
        ))}
        <button className="blk-gallery-add" onClick={addImage}>
          <span>+</span>
          <small>Add image</small>
        </button>
      </div>
    </NodeViewWrapper>
  )
}

export const GalleryBlock = Node.create({
  name: 'gallery',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (el: HTMLElement) => {
          try { return JSON.parse(el.getAttribute('data-images') || '[]') } catch { return [] }
        },
        renderHTML: (attrs: { images: GalleryImage[] }) => ({ 'data-images': JSON.stringify(attrs.images) }),
      },
    }
  },

  parseHTML() { return [{ tag: 'div[data-type="gallery"]' }] },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'gallery' }), 0]
  },

  addNodeView() { return ReactNodeViewRenderer(GalleryComponent as never) },
})
