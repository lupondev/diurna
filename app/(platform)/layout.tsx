import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { PlatformFooter } from '@/components/layout/platform-footer'
import { MobileShell } from '@/components/layout/mobile-shell'

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MobileShell>
      <div className="platform-layout">
        <Sidebar />
        <div className="platform-main">
          <Topbar />
          <main className="platform-content">
            {children}
          </main>
          <PlatformFooter />
        </div>
      </div>
    </MobileShell>
  )
}
