import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayMatches, type FixtureResponse } from '@/lib/football-api'

/* ── Helpers ── */

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Dobro jutro'
  if (h >= 12 && h < 18) return 'Dobar dan'
  return 'Dobro veče'
}

function formatDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT: { bg: 'var(--gold-l)', color: '#92400E', label: 'Draft' },
  IN_REVIEW: { bg: 'var(--elec-l)', color: 'var(--elec)', label: 'Review' },
  SCHEDULED: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Scheduled' },
  PUBLISHED: { bg: 'var(--mint-l)', color: 'var(--mint-d)', label: 'Published' },
  ARCHIVED: { bg: 'var(--g100)', color: 'var(--g500)', label: 'Archived' },
}

/* ── Data Fetching ── */

async function getDashboardData(orgId: string) {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const prevMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const orgFilter = { site: { organizationId: orgId }, deletedAt: null as Date | null }

  const [
    totalArticles,
    publishedThisWeek,
    aiArticles,
    articlesThisMonth,
    articlesPrevMonth,
    recentArticles,
    teamCount,
    gaConnected,
  ] = await Promise.all([
    prisma.article.count({ where: orgFilter }),
    prisma.article.count({
      where: { ...orgFilter, status: 'PUBLISHED', publishedAt: { gte: weekAgo } },
    }),
    prisma.article.count({ where: { ...orgFilter, aiGenerated: true } }),
    prisma.article.count({ where: { ...orgFilter, createdAt: { gte: monthAgo } } }),
    prisma.article.count({
      where: { ...orgFilter, createdAt: { gte: prevMonthStart, lt: monthAgo } },
    }),
    prisma.article.findMany({
      where: { ...orgFilter, isTest: false },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        aiGenerated: true,
        category: { select: { name: true } },
      },
    }),
    prisma.userOnOrganization.count({
      where: { organizationId: orgId, deletedAt: null },
    }),
    prisma.site.findFirst({
      where: { organizationId: orgId, deletedAt: null, gaId: { not: null } },
      select: { gaId: true },
    }),
  ])

  let clusters: { id: string; title: string; dis: number; trend: string }[] = []
  try {
    clusters = await prisma.storyCluster.findMany({
      select: { id: true, title: true, dis: true, trend: true },
      orderBy: { dis: 'desc' },
      take: 3,
    })
  } catch {
    // storyCluster table may not exist yet
  }

  // Today's matches — gracefully fail if API key not configured
  let todayMatches: FixtureResponse[] = []
  if (process.env.FOOTBALL_API_KEY) {
    try {
      const res = await getTodayMatches()
      todayMatches = (res.response || []).slice(0, 5)
    } catch {
      // API unavailable — show empty state
    }
  }

  const aiPercentage = totalArticles > 0 ? Math.round((aiArticles / totalArticles) * 100) : 0
  const monthTrend =
    articlesPrevMonth > 0
      ? Math.round(((articlesThisMonth - articlesPrevMonth) / articlesPrevMonth) * 100)
      : articlesThisMonth > 0
        ? 100
        : 0

  return {
    totalArticles,
    publishedThisWeek,
    aiPercentage,
    monthTrend,
    recentArticles,
    clusters,
    teamCount,
    hasGa: !!gaConnected?.gaId,
    todayMatches,
  }
}

/* ── Page ── */

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const orgId = session.user.organizationId
  if (!orgId) redirect('/onboarding')

  const userName = session.user.name || 'there'
  const firstName = userName.split(' ')[0]

  let data: Awaited<ReturnType<typeof getDashboardData>> | null = null
  try {
    data = await getDashboardData(orgId)
  } catch (err) {
    console.error('Dashboard data error:', err)
  }

  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--disp)', fontSize: 24, fontWeight: 400, color: 'var(--g900)', margin: 0, lineHeight: 1.3 }}>
            {getGreeting()}, {firstName}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--g500)', margin: '4px 0 0' }}>
            Here&apos;s your newsroom at a glance
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--g400)' }}>
            {formatDate()}
          </span>
          <Link
            href="/editor"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', fontSize: 13, fontWeight: 700,
              background: 'var(--mint)', color: 'var(--wh)',
              borderRadius: 'var(--rm)', transition: 'all .15s',
            }}
          >
            ✨ New Article
          </Link>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard icon="📄" label="Total Articles" value={data?.totalArticles ?? 0} trend={data?.monthTrend} trendLabel="this month" />
        <StatCard icon="✅" label="Published This Week" value={data?.publishedThisWeek ?? 0} />
        <StatCard icon="🤖" label="AI-Generated" value={`${data?.aiPercentage ?? 0}%`} detail="of total articles" />
        {data?.hasGa ? (
          <div style={{ background: 'var(--wh)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--rm)', background: 'var(--mint-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📈</div>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--mint-d)', lineHeight: 1.3 }}>GA4 Connected</div>
              <div style={{ fontSize: 12, color: 'var(--g500)', marginTop: 2 }}>Analytics active</div>
              <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', padding: '2px 6px', borderRadius: 4, background: 'var(--elec-l)', color: 'var(--elec)' }}>Open Analytics →</a>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--wh)', border: '1px dashed var(--brd)', borderRadius: 'var(--rl)', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--rm)', background: 'var(--g50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📡</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g700)', lineHeight: 1.3 }}>Analytics</div>
              <div style={{ fontSize: 12, color: 'var(--g400)', marginTop: 2 }}>GA4 not connected</div>
              <Link href="/settings#integrations" style={{ display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--g100)', color: 'var(--g600)' }}>Connect →</Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Two-column Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }} className="dash-cols">
        <style>{`
          @media (min-width: 860px) {
            .dash-cols { grid-template-columns: 2fr 1fr !important; }
          }
        `}</style>

        {/* ── Left Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Card>
            <CardHead title="Recent Articles" href="/articles" linkText="View all" />
            {!data || data.recentArticles.length === 0 ? (
              <EmptyState icon="📄" text="No articles yet. Create your first one!" />
            ) : (
              <div>
                {data.recentArticles.map((article) => {
                  const st = STATUS_STYLES[article.status] || STATUS_STYLES.DRAFT
                  return (
                    <Link key={article.id} href={`/editor/${article.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--g100)', textDecoration: 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--g900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {article.title || 'Untitled'}
                          {article.aiGenerated && <span style={{ marginLeft: 6, fontSize: 11 }} title="AI-Generated">🤖</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--g400)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                          {article.category?.name && <span>{article.category.name}</span>}
                          <span>{timeAgo(article.updatedAt)}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)', padding: '3px 8px', borderRadius: 6, background: st.bg, color: st.color, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{st.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHead title="Newsroom Intelligence" href="/newsroom" linkText="Open Newsroom" />
            {!data || data.clusters.length === 0 ? (
              <EmptyState icon="📰" text="No trending stories yet. Set up your feeds in the Newsroom." />
            ) : (
              <div>
                {data.clusters.map((cluster, i) => (
                  <div key={cluster.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < data!.clusters.length - 1 ? '1px solid var(--g100)' : 'none' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 'var(--rm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)', flexShrink: 0, background: cluster.dis >= 60 ? 'var(--coral-l)' : cluster.dis >= 40 ? 'var(--gold-l)' : 'var(--g100)', color: cluster.dis >= 60 ? 'var(--coral)' : cluster.dis >= 40 ? '#92400E' : 'var(--g600)' }}>
                      {cluster.dis}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cluster.title}</div>
                      <div style={{ fontSize: 11, color: trendColor(cluster.trend), fontWeight: 600, marginTop: 2 }}>{trendIcon(cluster.trend)} {cluster.trend}</div>
                    </div>
                    <Link href={`/editor?clusterId=${cluster.id}&title=${encodeURIComponent(cluster.title)}`} style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 'var(--r)', background: 'var(--mint-l)', color: 'var(--mint-d)', flexShrink: 0, textDecoration: 'none' }}>
                      Write
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g900)', marginBottom: 14 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: '✨', label: 'New Article', href: '/editor' },
                { icon: '📰', label: 'Open Newsroom', href: '/newsroom' },
                { icon: '🤖', label: 'AI Co-Pilot', href: '/copilot' },
                { icon: '🧩', label: 'Widgets', href: '/widgets' },
                { icon: '📅', label: 'Calendar', href: '/calendar' },
                { icon: '⚙️', label: 'Settings', href: '/settings' },
              ].map((action) => (
                <Link key={action.href} href={action.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--rm)', fontSize: 13, fontWeight: 500, color: 'var(--g700)', transition: 'all .12s', textDecoration: 'none' }} className="qa-link">
                  <span style={{ width: 20, textAlign: 'center', fontSize: 15 }}>{action.icon}</span>
                  {action.label}
                </Link>
              ))}
              <style>{`.qa-link:hover { background: var(--g50); color: var(--g900); }`}</style>
            </div>
          </Card>

          {/* Today's Matches — real data from football API */}
          <Card>
            <CardHead title="Today's Matches" href="/football/fixtures" linkText="All fixtures" />
            {!data || data.todayMatches.length === 0 ? (
              !process.env.FOOTBALL_API_KEY ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ fontSize: 12, color: 'var(--g400)', marginBottom: 8 }}>Football API not configured</p>
                  <Link href="/settings#integrations" style={{ fontSize: 11, fontWeight: 700, color: 'var(--elec)' }}>Connect API →</Link>
                </div>
              ) : (
                <EmptyState icon="⚽" text="No matches scheduled for today." />
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {data.todayMatches.map((m) => {
                  const status = m.fixture.status.short
                  const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(status)
                  const isFinished = ['FT', 'AET', 'PEN'].includes(status)
                  const kickoff = new Date(m.fixture.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

                  return (
                    <div key={m.fixture.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--g50)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--g900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.teams.home.name} v {m.teams.away.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 2 }}>{m.league.name}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {isLive ? (
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--coral)' }}>
                            {m.goals.home ?? 0} - {m.goals.away ?? 0}
                            <span style={{ marginLeft: 4, fontSize: 9, background: 'var(--coral-l)', color: 'var(--coral)', padding: '1px 4px', borderRadius: 3 }}>LIVE</span>
                          </div>
                        ) : isFinished ? (
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g600)' }}>{m.goals.home ?? 0} - {m.goals.away ?? 0} <span style={{ fontSize: 9, color: 'var(--g400)' }}>FT</span></div>
                        ) : (
                          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--g500)' }}>{kickoff}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--g900)', marginBottom: 14 }}>Team</div>
            {data && data.teamCount > 1 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex' }}>
                  {Array.from({ length: Math.min(data.teamCount, 4) }).map((_, i) => (
                    <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: ['linear-gradient(135deg,var(--elec),#8B5CF6)', 'linear-gradient(135deg,var(--mint),var(--mint-d))', 'linear-gradient(135deg,var(--gold),#F59E0B)', 'linear-gradient(135deg,var(--coral),#DC2626)'][i % 4], border: '2px solid var(--wh)', marginLeft: i > 0 ? -8 : 0 }} />
                  ))}
                </div>
                <span style={{ fontSize: 13, color: 'var(--g600)' }}>{data.teamCount} member{data.teamCount !== 1 ? 's' : ''}</span>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <p style={{ fontSize: 13, color: 'var(--g500)', marginBottom: 10 }}>You&apos;re working solo</p>
                <Link href="/settings?tab=team" style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 'var(--r)', background: 'var(--elec-l)', color: 'var(--elec)' }}>Invite Team</Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-Components ── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--wh)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: '20px 22px' }}>
      {children}
    </div>
  )
}

function CardHead({ title, href, linkText }: { title: string; href: string; linkText: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--g900)' }}>{title}</span>
      <Link href={href} style={{ fontSize: 12, fontWeight: 600, color: 'var(--mint-d)' }}>{linkText} →</Link>
    </div>
  )
}

function StatCard({ icon, label, value, trend, trendLabel, detail }: {
  icon: string; label: string; value: number | string
  trend?: number; trendLabel?: string; detail?: string
}) {
  return (
    <div style={{ background: 'var(--wh)', border: '1px solid var(--brd)', borderRadius: 'var(--rl)', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 'var(--rm)', background: 'var(--g50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: 'var(--g900)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--g500)', marginTop: 2 }}>{label}</div>
        {trend !== undefined && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 6, fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', padding: '2px 6px', borderRadius: 4, background: trend >= 0 ? 'var(--mint-l)' : 'var(--coral-l)', color: trend >= 0 ? 'var(--mint-d)' : 'var(--coral)' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel}
          </div>
        )}
        {detail && <div style={{ fontSize: 11, color: 'var(--g400)', marginTop: 4 }}>{detail}</div>}
      </div>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <p style={{ fontSize: 13, color: 'var(--g500)', maxWidth: 260, margin: '0 auto' }}>{text}</p>
    </div>
  )
}

function trendColor(trend: string) {
  if (trend === 'SPIKING') return 'var(--coral)'
  if (trend === 'RISING') return 'var(--mint-d)'
  return 'var(--g400)'
}

function trendIcon(trend: string) {
  if (trend === 'SPIKING') return '🔥'
  if (trend === 'RISING') return '↑'
  return '→'
}
