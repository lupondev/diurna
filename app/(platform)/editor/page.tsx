import { Suspense } from 'react'
import EditorPageInner from './editor-inner'

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 32, width: 200, background: 'var(--g100)', borderRadius: 'var(--rm)', animation: 'pulse 2s infinite' }} />
        <div style={{ height: 400, background: 'var(--g50)', borderRadius: 'var(--rl)', animation: 'pulse 2s infinite' }} />
      </div>
    }>
      <EditorPageInner />
    </Suspense>
  )
}
