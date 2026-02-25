'use client'

type SkeletonVariant = 'block' | 'text' | 'circle' | 'card' | 'row'

export function Skeleton({
  className = '',
  variant = 'block',
  width,
  height,
  style,
}: {
  className?: string
  variant?: SkeletonVariant
  width?: string | number
  height?: string | number
  style?: React.CSSProperties
}) {
  const base = 'sba-skeleton'
  const variantClass = variant !== 'block' ? ` ${base}--${variant}` : ''
  const combinedStyle: React.CSSProperties = {
    ...(width != null && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height != null && { height: typeof height === 'number' ? `${height}px` : height }),
    ...style,
  }
  return <div className={`${base}${variantClass} ${className}`.trim()} style={combinedStyle} aria-hidden="true" />
}

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`sba-skeleton-text ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }} />
      ))}
    </div>
  )
}

export function SkeletonMatchCard({ className = '' }: { className?: string }) {
  return (
    <div className={`sba-skeleton-match ${className}`.trim()} aria-hidden="true">
      <Skeleton variant="block" height={20} style={{ width: '40%', marginBottom: 8 }} />
      <div className="sba-skeleton-match-row">
        <Skeleton variant="block" height={24} style={{ width: 60 }} />
        <Skeleton variant="block" height={32} style={{ width: 56 }} />
        <Skeleton variant="block" height={24} style={{ width: 60 }} />
      </div>
      <Skeleton variant="text" height={10} style={{ width: '50%', marginTop: 8 }} />
    </div>
  )
}

export function SkeletonTable({ rows = 8, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`sba-skeleton-table ${className}`.trim()} aria-hidden="true">
      <div className="sba-skeleton-table-head">
        <Skeleton variant="text" height={12} style={{ flex: 2 }} />
        <Skeleton variant="text" height={12} style={{ width: 24 }} />
        <Skeleton variant="text" height={12} style={{ width: 24 }} />
        <Skeleton variant="text" height={12} style={{ width: 24 }} />
        <Skeleton variant="text" height={12} style={{ width: 28 }} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="sba-skeleton-table-row">
          <Skeleton variant="text" height={14} style={{ flex: 2 }} />
          <Skeleton variant="text" height={14} style={{ width: 20 }} />
          <Skeleton variant="text" height={14} style={{ width: 20 }} />
          <Skeleton variant="text" height={14} style={{ width: 20 }} />
          <Skeleton variant="text" height={14} style={{ width: 24 }} />
        </div>
      ))}
    </div>
  )
}

export function SkeletonPage({ className = '' }: { className?: string }) {
  return (
    <div className={`sba-skeleton-page ${className}`.trim()} aria-hidden="true">
      <Skeleton variant="block" height={24} style={{ width: '60%', marginBottom: 24 }} />
      <Skeleton variant="block" height={200} style={{ width: '100%', borderRadius: 8, marginBottom: 24 }} />
      <div style={{ display: 'flex', gap: 16 }}>
        <Skeleton variant="block" height={120} style={{ flex: 1, borderRadius: 8 }} />
        <Skeleton variant="block" height={120} style={{ flex: 1, borderRadius: 8 }} />
      </div>
      <SkeletonText lines={4} className="sba-skeleton-page-body" />
    </div>
  )
}
