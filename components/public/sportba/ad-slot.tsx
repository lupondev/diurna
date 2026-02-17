type AdSlotProps = {
  variant: 'leaderboard' | 'rectangle' | 'native' | 'skyscraper'
  className?: string
}

export function AdSlot({ variant, className }: AdSlotProps) {
  return (
    <div
      className={`sba-ad sba-ad--${variant}${className ? ` ${className}` : ''}`}
      role="complementary"
      aria-label="Oglas"
    >
      <span className="sba-ad-label">Oglas</span>
    </div>
  )
}
