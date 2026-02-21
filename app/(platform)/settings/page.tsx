'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import './settings.css'
import '../admin/admin.css'
import '../team/team.css'

const GeneralTab = dynamic(() => import('./general'), { ssr: false })
const TeamTab = dynamic(() => import('../team/page'), { ssr: false })
const InvitesTab = dynamic(() => import('../admin/invites/page'), { ssr: false })
const ApiKeysTab = dynamic(() => import('../admin/site/page'), { ssr: false })
const AuditTab = dynamic(() => import('../admin/audit-log/page'), { ssr: false })
const SyncTab = dynamic(() => import('../admin/sync/page'), { ssr: false })
const HealthTab = dynamic(() => import('../health/page'), { ssr: false })

const TABS = [
  { id: 'general', label: 'Opšte' },
  { id: 'api-keys', label: 'API Ključevi' },
  { id: 'team', label: 'Tim' },
  { id: 'invites', label: 'Pozivnice' },
  { id: 'audit', label: 'Audit Log' },
  { id: 'sync', label: 'Data Sync' },
  { id: 'health', label: 'System Health' },
]

function SettingsInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'general'

  function setTab(tabId: string) {
    router.push(`/settings?tab=${tabId}`, { scroll: false })
  }

  return (
    <div className="st-page">
      <div className="st-page-header">
        <h1 className="st-page-title">Postavke</h1>
        <p className="st-page-desc">Upravljajte svim postavkama na jednom mjestu</p>
      </div>

      <div className="st-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`st-tab${activeTab === tab.id ? ' st-tab-active' : ''}`}
            onClick={() => setTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="st-tab-content">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'api-keys' && <ApiKeysTab />}
        {activeTab === 'team' && <TeamTab />}
        {activeTab === 'invites' && <InvitesTab />}
        {activeTab === 'audit' && <AuditTab />}
        {activeTab === 'sync' && <SyncTab />}
        {activeTab === 'health' && <HealthTab />}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--g400)' }}>Loading...</div>}>
      <SettingsInner />
    </Suspense>
  )
}
