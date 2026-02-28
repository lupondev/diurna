'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Site {
  id: string
  name: string
  slug: string
  domain: string | null
}

interface SiteContextType {
  sites: Site[]
  activeSite: Site | null
  setActiveSite: (site: Site) => void
  loading: boolean
}

const SiteContext = createContext<SiteContextType>({
  sites: [],
  activeSite: null,
  setActiveSite: () => {},
  loading: true,
})

export function SiteProvider({ children }: { children: ReactNode }) {
  const [sites, setSites] = useState<Site[]>([])
  const [activeSite, setActiveSiteState] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sites')
      .then((r) => r.json() as Promise<{ sites?: Site[] }>)
      .then((data) => {
        const siteList = data.sites || []
        setSites(siteList)
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('diurna-active-site') : null
        const saved = savedId ? siteList.find((s) => s.id === savedId) : null
        setActiveSiteState(saved || siteList[0] || null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function setActiveSite(site: Site) {
    setActiveSiteState(site)
    if (typeof window !== 'undefined') {
      localStorage.setItem('diurna-active-site', site.id)
    }
  }

  return (
    <SiteContext.Provider value={{ sites, activeSite, setActiveSite, loading }}>
      {children}
    </SiteContext.Provider>
  )
}

export function useSite() {
  return useContext(SiteContext)
}
