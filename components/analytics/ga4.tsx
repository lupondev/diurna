'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'

export function GoogleAnalytics() {
  const [gaId, setGaId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/site')
      .then((r) => r.ok ? r.json() as Promise<{ gaId?: string }> : null)
      .then((data) => {
        if (data?.gaId) setGaId(data.gaId)
      })
      .catch(() => {})
  }, [])

  if (!gaId) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  )
}
