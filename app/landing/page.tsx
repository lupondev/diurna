'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useInView } from 'framer-motion'

/* ═══════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════ */

const features = [
  { icon: '\u{1F9E0}', title: 'Smart Newsroom', desc: 'AI monitors 65+ RSS sources, Google Trends, Reddit, and football fixtures. Cluster engine groups stories by event. DIS scoring tells you what to write NOW.' },
  { icon: '\u26A1', title: 'One-Click Generation', desc: 'Select trending topic \u2192 AI generates SEO-optimized article with proper structure, stats verification, and anti-hallucination safeguards. Temperature 0.3 for accuracy.' },
  { icon: '\u270F\uFE0F', title: 'Premium Editor', desc: 'Tiptap-based editor with 2-row toolbar. Inline polls, quizzes, surveys. Unsplash image search. Drag-drop media. Version history.' },
  { icon: '\u26BD', title: 'Football Widgets', desc: '13 embeddable widgets: standings, fixtures, live scores, top scorers, player stats, match center. One script tag, works anywhere.' },
  { icon: '\u{1F3A8}', title: 'Theme System', desc: 'Two premium themes (Midnight Pro dark, Clean Editorial light). Full branding control. Custom CSS variables. Your site, your look.' },
  { icon: '\u{1F4CA}', title: 'Analytics Dashboard', desc: 'Track article performance, audience engagement, content velocity. Know what works.' },
  { icon: '\u{1F916}', title: 'AI Co-Pilot', desc: 'Originality checking, SEO optimization, headline suggestions, fact verification via Player DB with 500+ entities.' },
  { icon: '\u{1F4C5}', title: 'Editorial Calendar', desc: 'Autopilot scheduling based on football fixtures. Calendar fills itself.' },
  { icon: '\u{1F50C}', title: 'Integrations', desc: 'WordPress sync, GA4, newsletter via Resend, Facebook auto-post to multiple pages.' },
]

const standingsData = [
  { pos: 1, team: 'Arsenal', p: 24, w: 17, d: 4, l: 3, gd: '+35', pts: 55 },
  { pos: 2, team: 'Liverpool', p: 23, w: 16, d: 5, l: 2, gd: '+34', pts: 53 },
  { pos: 3, team: 'Man City', p: 24, w: 15, d: 5, l: 4, gd: '+28', pts: 50 },
  { pos: 4, team: 'Chelsea', p: 24, w: 13, d: 6, l: 5, gd: '+18', pts: 45 },
  { pos: 5, team: 'Aston Villa', p: 24, w: 13, d: 4, l: 7, gd: '+12', pts: 43 },
  { pos: 6, team: 'Newcastle', p: 24, w: 12, d: 5, l: 7, gd: '+10', pts: 41 },
]

const fixturesData = [
  { home: 'Arsenal', away: 'Chelsea', time: '15:00', league: 'Premier League', date: 'Sat, Feb 22' },
  { home: 'Liverpool', away: 'Man City', time: '17:30', league: 'Premier League', date: 'Sun, Feb 23' },
  { home: 'Newcastle', away: 'Aston Villa', time: '14:00', league: 'Premier League', date: 'Sat, Feb 22' },
  { home: 'Tottenham', away: 'Man United', time: '20:00', league: 'Premier League', date: 'Sun, Feb 23' },
]

const topScorersData = [
  { pos: 1, name: 'Erling Haaland', team: 'Man City', goals: 18, assists: 4 },
  { pos: 2, name: 'Mohamed Salah', team: 'Liverpool', goals: 17, assists: 11 },
  { pos: 3, name: 'Alexander Isak', team: 'Newcastle', goals: 14, assists: 3 },
  { pos: 4, name: 'Bukayo Saka', team: 'Arsenal', goals: 13, assists: 9 },
  { pos: 5, name: 'Cole Palmer', team: 'Chelsea', goals: 13, assists: 6 },
  { pos: 6, name: 'Ollie Watkins', team: 'Aston Villa', goals: 11, assists: 7 },
]

const newsroomStories = [
  { title: 'Mourinho: wounded king Madrid vulnerable', dis: 65, trend: 'RISING' as const, tags: ['Mourinho', 'Real Madrid'], sources: 4, time: '12m ago' },
  { title: 'Premier League extortion plot exposed', dis: 62, trend: 'STABLE' as const, tags: ['Premier League', 'Legal'], sources: 3, time: '28m ago' },
  { title: 'Luis Enrique slams Demb\u00e9l\u00e9 attitude', dis: 53, trend: 'STABLE' as const, tags: ['PSG', 'Demb\u00e9l\u00e9'], sources: 5, time: '45m ago' },
]

const sidebarMatches = [
  { home: 'Galatasaray', away: 'Juventus', time: '18:45' },
  { home: 'Benfica', away: 'Real Madrid', time: '21:00' },
]

/* ═══════════════════════════════════════════════════
   Components
   ═══════════════════════════════════════════════════ */

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const duration = 1800
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView, target])

  return <span ref={ref}>{prefix}{count}{suffix}</span>
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-[#00D4AA] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════ */

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [demoTab, setDemoTab] = useState<'newsroom' | 'editor' | 'widgets'>('newsroom')
  const [widgetTab, setWidgetTab] = useState<'standings' | 'fixtures' | 'scorers'>('standings')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenu(false)
  }

  return (
    <div className="min-h-screen antialiased" style={{ background: '#FAFAF9', color: '#1A1A1A', scrollBehavior: 'smooth' }}>

      {/* ══════════ NAV ══════════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'shadow-[0_1px_0_rgba(0,0,0,0.06)]' : ''
        }`}
        style={{ background: scrolled ? 'rgba(250,250,249,0.85)' : 'transparent', backdropFilter: scrolled ? 'blur(12px)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none' }}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/landing" className="text-[22px] font-display tracking-tight" style={{ color: '#1A1A1A' }}>
            Diurna<span style={{ color: '#00D4AA' }}>.</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('features')} className="text-[13px] font-medium transition-colors" style={{ color: '#6B6B6B' }} onMouseEnter={e => e.currentTarget.style.color = '#1A1A1A'} onMouseLeave={e => e.currentTarget.style.color = '#6B6B6B'}>Features</button>
            <button onClick={() => scrollTo('pricing')} className="text-[13px] font-medium transition-colors" style={{ color: '#6B6B6B' }} onMouseEnter={e => e.currentTarget.style.color = '#1A1A1A'} onMouseLeave={e => e.currentTarget.style.color = '#6B6B6B'}>Pricing</button>
            <button onClick={() => scrollTo('demo')} className="text-[13px] font-medium transition-colors" style={{ color: '#6B6B6B' }} onMouseEnter={e => e.currentTarget.style.color = '#1A1A1A'} onMouseLeave={e => e.currentTarget.style.color = '#6B6B6B'}>Docs</button>
            <Link href="/login" className="text-[13px] font-medium transition-colors" style={{ color: '#6B6B6B' }}>Sign In</Link>
            <Link
              href="/register"
              className="px-5 py-2 text-[13px] font-semibold text-white rounded-full transition-all hover:opacity-90 hover:-translate-y-px"
              style={{ background: '#00D4AA' }}
            >
              Start Free
            </Link>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 -mr-2" aria-label="Menu">
            <div className="flex flex-col gap-[5px]">
              <span className={`block w-[18px] h-[1.5px] transition-all duration-300 ${mobileMenu ? 'rotate-45 translate-y-[6.5px]' : ''}`} style={{ background: '#1A1A1A' }} />
              <span className={`block w-[18px] h-[1.5px] transition-all duration-300 ${mobileMenu ? 'opacity-0' : ''}`} style={{ background: '#1A1A1A' }} />
              <span className={`block w-[18px] h-[1.5px] transition-all duration-300 ${mobileMenu ? '-rotate-45 -translate-y-[6.5px]' : ''}`} style={{ background: '#1A1A1A' }} />
            </div>
          </button>
        </div>

        <AnimatePresence>
          {mobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
              style={{ background: 'rgba(250,250,249,0.98)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="px-6 py-5 flex flex-col gap-4">
                <button onClick={() => scrollTo('features')} className="text-left text-[15px] font-medium" style={{ color: '#6B6B6B' }}>Features</button>
                <button onClick={() => scrollTo('pricing')} className="text-left text-[15px] font-medium" style={{ color: '#6B6B6B' }}>Pricing</button>
                <button onClick={() => scrollTo('demo')} className="text-left text-[15px] font-medium" style={{ color: '#6B6B6B' }}>Docs</button>
                <Link href="/login" className="text-[15px] font-medium" style={{ color: '#6B6B6B' }} onClick={() => setMobileMenu(false)}>Sign In</Link>
                <Link
                  href="/register"
                  className="mt-1 px-5 py-2.5 text-[14px] font-semibold text-white text-center rounded-full"
                  style={{ background: '#00D4AA' }}
                  onClick={() => setMobileMenu(false)}
                >
                  Start Free
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="pt-28 pb-16 md:pt-36 md:pb-24 px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-medium mb-8"
            style={{ color: '#00A888', border: '1px solid rgba(0,212,170,0.3)', background: 'rgba(0,212,170,0.06)' }}
          >
            <span className="text-[14px]">{'\u26A1'}</span>
            AI-Powered Sports Publishing
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-[42px] sm:text-[56px] md:text-[68px] lg:text-[80px] leading-[1.05] tracking-tight mb-6"
            style={{ color: '#1A1A1A' }}
          >
            Your Newsroom,<br />Powered by AI.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-[16px] md:text-[18px] leading-relaxed max-w-[600px] mx-auto mb-10"
            style={{ color: '#6B6B6B' }}
          >
            From trending topics to published articles in minutes. The complete publishing platform for sports media teams.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 md:mb-20"
          >
            <Link
              href="/register"
              className="w-full sm:w-auto text-center px-8 py-3 text-[14px] font-semibold text-white rounded-full transition-all hover:opacity-90 hover:-translate-y-px hover:shadow-lg"
              style={{ background: '#00D4AA', boxShadow: '0 4px 14px rgba(0,212,170,0.3)' }}
            >
              Start Free
            </Link>
            <button
              onClick={() => scrollTo('demo')}
              className="w-full sm:w-auto px-8 py-3 text-[14px] font-semibold rounded-full transition-all hover:-translate-y-px"
              style={{ color: '#1A1A1A', border: '1px solid #D4D4D8' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#1A1A1A'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#D4D4D8'}
            >
              See it in action
            </button>
          </motion.div>

          {/* Browser Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[960px] mx-auto"
          >
            <div
              className="rounded-2xl overflow-hidden hidden sm:block"
              style={{
                background: '#0F1115',
                boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)',
                transform: 'perspective(2400px) rotateX(2deg)',
              }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#0A0C10', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#FF5F57' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#FFBD2E' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#28CA41' }} />
                </div>
                <div className="flex-1 ml-3 px-3 py-1.5 rounded-md text-[11px] font-mono" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
                  diurna.vercel.app/newsroom
                </div>
              </div>

              {/* Newsroom content */}
              <div className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[14px]">{'\u{1F4F0}'}</span>
                    <span className="text-[14px] font-bold text-white">Newsroom</span>
                    <div className="flex gap-1 ml-2">
                      <span className="px-2.5 py-1 text-[10px] font-semibold rounded-md text-white" style={{ background: 'rgba(0,212,170,0.15)', color: '#00D4AA' }}>News (33)</span>
                      <span className="px-2.5 py-1 text-[10px] font-medium rounded-md" style={{ color: 'rgba(255,255,255,0.35)' }}>Transfers (11)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {newsroomStories.map((story, i) => (
                    <div key={i} className="rounded-lg p-3.5 relative" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono rounded" style={{ background: story.dis >= 60 ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)', color: story.dis >= 60 ? '#f87171' : '#60a5fa' }}>{story.dis}</span>
                        <span className="text-[9px] font-semibold" style={{ color: story.trend === 'RISING' ? '#00D4AA' : 'rgba(255,255,255,0.3)' }}>{story.trend === 'RISING' ? '\u2191 RISING' : '\u2192 STABLE'}</span>
                      </div>
                      <p className="text-[11px] font-semibold leading-snug mb-2.5" style={{ color: 'rgba(255,255,255,0.8)' }}>{story.title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                        {story.tags.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 text-[8px] font-medium rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>{tag}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{story.sources} sources \u00b7 {story.time}</span>
                        {i === 0 && (
                          <span className="px-2 py-1 text-[9px] font-bold rounded text-white" style={{ background: '#00D4AA' }}>Write Article</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile: flat card */}
            <div
              className="rounded-xl overflow-hidden sm:hidden"
              style={{ background: '#0F1115', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
            >
              <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: '#0A0C10', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#FF5F57' }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: '#FFBD2E' }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: '#28CA41' }} />
                </div>
                <div className="flex-1 ml-2 px-2 py-1 rounded text-[9px] font-mono" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }}>
                  diurna.vercel.app/newsroom
                </div>
              </div>
              <div className="p-3">
                {newsroomStories.slice(0, 2).map((story, i) => (
                  <div key={i} className="rounded-lg p-3 mb-2 last:mb-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>{story.dis}</span>
                      <span className="text-[9px] font-semibold" style={{ color: '#00D4AA' }}>{'\u2191'} {story.trend}</span>
                    </div>
                    <p className="text-[11px] font-semibold leading-snug" style={{ color: 'rgba(255,255,255,0.8)' }}>{story.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════ SOCIAL PROOF ══════════ */}
      <section className="py-8 md:py-10 px-6" style={{ borderTop: '1px solid rgba(0,0,0,0.04)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div className="max-w-[1200px] mx-auto text-center">
          <p className="text-[12px] md:text-[13px] mb-4" style={{ color: '#A1A1AA' }}>
            Powered by Lupon Media SSP &mdash; trusted by publishers across Balkans, UAE &amp; MENA
          </p>
          <div className="flex items-center justify-center gap-4 md:gap-8 flex-wrap">
            {['MCM', 'Pubmatic', 'Criteo', 'Magnite', 'Google Ad Manager'].map(name => (
              <span key={name} className="text-[11px] font-semibold tracking-wide uppercase px-3 py-1.5 rounded-md" style={{ color: '#A1A1AA', background: 'rgba(0,0,0,0.03)' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="py-20 md:py-28 px-6" style={{ background: '#F5F5F0' }}>
        <div className="max-w-[1200px] mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="font-display text-[32px] md:text-[44px] tracking-tight mb-4" style={{ color: '#1A1A1A' }}>
              Everything your newsroom needs
            </h2>
            <p className="text-[15px] max-w-[520px] mx-auto leading-relaxed" style={{ color: '#6B6B6B' }}>
              A complete publishing platform designed for sports media teams who want to create better content, faster.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.04}>
                <div
                  className="h-full p-6 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-default"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4" style={{ background: 'rgba(0,212,170,0.08)' }}>
                    {f.icon}
                  </div>
                  <h3 className="text-[15px] font-bold mb-2" style={{ color: '#1A1A1A' }}>{f.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#6B6B6B' }}>{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PRODUCT DEMO ══════════ */}
      <section id="demo" className="py-20 md:py-28 px-6" style={{ background: '#0F1115' }}>
        <div className="max-w-[1200px] mx-auto">
          <FadeIn className="text-center mb-12">
            <h2 className="font-display text-[32px] md:text-[44px] tracking-tight mb-4 text-white">
              See it in action
            </h2>
            <p className="text-[15px] max-w-[520px] mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Three core products. One platform. Everything you need to run a modern sports newsroom.
            </p>
          </FadeIn>

          {/* Demo tabs */}
          <FadeIn delay={0.1}>
            <div className="flex gap-1 rounded-xl p-1 mb-8 w-fit mx-auto" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {(['newsroom', 'editor', 'widgets'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDemoTab(tab)}
                  className="px-5 py-2 text-[13px] font-medium rounded-lg transition-all"
                  style={{
                    background: demoTab === tab ? 'rgba(0,212,170,0.12)' : 'transparent',
                    color: demoTab === tab ? '#00D4AA' : 'rgba(255,255,255,0.35)',
                    border: demoTab === tab ? '1px solid rgba(0,212,170,0.2)' : '1px solid transparent',
                  }}
                >
                  {tab === 'newsroom' ? 'Newsroom' : tab === 'editor' ? 'Editor' : 'Widgets'}
                </button>
              ))}
            </div>

            <div className="max-w-[960px] mx-auto">
              <AnimatePresence mode="wait">

                {/* Newsroom Tab */}
                {demoTab === 'newsroom' && (
                  <motion.div key="newsroom" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                    <div className="rounded-2xl overflow-hidden" style={{ background: '#161820', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex flex-col md:flex-row">
                        {/* Main */}
                        <div className="flex-1 p-4 md:p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-bold text-white">{'\u{1F4F0}'} Newsroom</span>
                              <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded" style={{ background: 'rgba(0,212,170,0.12)', color: '#00D4AA' }}>33 stories</span>
                            </div>
                            <span className="px-3 py-1.5 text-[11px] font-bold rounded-md text-white" style={{ background: '#00D4AA' }}>+ Write Article</span>
                          </div>
                          <div className="flex flex-col gap-2.5">
                            {newsroomStories.map((story, i) => (
                              <div key={i} className="rounded-lg p-3.5 flex items-start gap-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="flex-shrink-0 mt-0.5">
                                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono" style={{ background: story.dis >= 60 ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: story.dis >= 60 ? '#f87171' : '#60a5fa' }}>{story.dis}</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-semibold leading-snug mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>{story.title}</p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-semibold" style={{ color: story.trend === 'RISING' ? '#00D4AA' : 'rgba(255,255,255,0.3)' }}>{story.trend === 'RISING' ? '\u2191' : '\u2192'} {story.trend}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>{'\u00b7'}</span>
                                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{story.sources} sources</span>
                                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>{'\u00b7'}</span>
                                    {story.tags.map(tag => (
                                      <span key={tag} className="px-1.5 py-0.5 text-[9px] font-medium rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>{tag}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Sidebar */}
                        <div className="w-full md:w-[220px] p-4 md:p-5 flex-shrink-0" style={{ borderLeft: '1px solid rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Today&apos;s Matches</div>
                          {sidebarMatches.map((m, i) => (
                            <div key={i} className="flex items-center justify-between py-2 mb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <div>
                                <div className="text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{m.home}</div>
                                <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{m.away}</div>
                              </div>
                              <span className="text-[11px] font-mono font-bold" style={{ color: '#00D4AA' }}>{m.time}</span>
                            </div>
                          ))}
                          <div className="text-[10px] font-bold uppercase tracking-wider mt-4 mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>My Leagues</div>
                          {['Premier League', 'La Liga', 'Champions League'].map(l => (
                            <div key={l} className="text-[11px] py-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{'\u26BD'} {l}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Editor Tab */}
                {demoTab === 'editor' && (
                  <motion.div key="editor" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                    <div className="rounded-2xl overflow-hidden" style={{ background: '#161820', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {/* Toolbar */}
                      <div className="px-4 md:px-5 py-3 flex items-center gap-3 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['B', 'I', 'U', 'H1', 'H2', '\u00b6', '\u{1F517}', '\u{1F5BC}', '\u2014'].map((btn, i) => (
                          <span key={i} className="w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>{btn}</span>
                        ))}
                        <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold" style={{ background: 'rgba(0,212,170,0.1)', color: '#00D4AA' }}>
                          {'\u{1F916}'} AI Score: 94%
                        </span>
                      </div>
                      {/* Article content */}
                      <div className="p-5 md:p-8">
                        <div className="text-[10px] uppercase tracking-wider font-bold mb-3" style={{ color: 'rgba(255,255,255,0.2)' }}>Champions League &middot; Preview</div>
                        <h3 className="font-display text-[22px] md:text-[28px] leading-tight text-white mb-5">
                          Champions League Semi-Final Preview: Arsenal vs Real Madrid
                        </h3>
                        <div className="space-y-3 mb-6">
                          <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Arsenal face their biggest European test in two decades as they welcome Real Madrid to the Emirates for the first leg of the Champions League semi-final. Mikel Arteta&apos;s side arrive in scintillating form, having won 8 of their last 10 matches across all competitions.
                          </p>
                          <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            The Gunners&apos; defensive record has been the foundation of their success &mdash; just 3 goals conceded in 6 Champions League matches this season. William Saliba and Gabriel have formed one of Europe&apos;s most formidable centre-back partnerships, while Declan Rice provides the perfect shield in front of them.
                          </p>
                        </div>
                        <div className="flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                          <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>847 words &middot; 4 min read</span>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 text-[10px] font-semibold rounded" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>{'\u2705'} Originality: 98%</span>
                            <span className="px-2.5 py-1 text-[10px] font-semibold rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>SEO: 92</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Widgets Tab */}
                {demoTab === 'widgets' && (
                  <motion.div key="widgets" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                    <div className="max-w-[720px] mx-auto">
                      {/* Sub-tabs */}
                      <div className="flex gap-1 rounded-lg p-0.5 mb-5 w-fit mx-auto" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        {(['standings', 'fixtures', 'scorers'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setWidgetTab(tab)}
                            className="px-4 py-1.5 text-[12px] font-medium rounded-md transition-all"
                            style={{
                              background: widgetTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
                              color: widgetTab === tab ? 'white' : 'rgba(255,255,255,0.35)',
                            }}
                          >
                            {tab === 'standings' ? 'Standings' : tab === 'fixtures' ? 'Fixtures' : 'Top Scorers'}
                          </button>
                        ))}
                      </div>

                      <div className="rounded-2xl overflow-hidden" style={{ background: '#161820', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[14px]">{'\u26BD'}</span>
                            <span className="text-[13px] font-bold text-white">Premier League</span>
                            <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded-md" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>LIVE</span>
                          </div>
                          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>2025/26</span>
                        </div>

                        <AnimatePresence mode="wait">
                          {widgetTab === 'standings' && (
                            <motion.div key="standings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                              <table className="w-full">
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-left" style={{ color: 'rgba(255,255,255,0.25)' }}>#</th>
                                    <th className="py-2.5 text-[10px] font-semibold uppercase tracking-wider text-left" style={{ color: 'rgba(255,255,255,0.25)' }}>Team</th>
                                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>P</th>
                                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>W</th>
                                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-center hidden sm:table-cell" style={{ color: 'rgba(255,255,255,0.25)' }}>D</th>
                                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-center hidden sm:table-cell" style={{ color: 'rgba(255,255,255,0.25)' }}>L</th>
                                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>GD</th>
                                    <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>Pts</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {standingsData.map((row) => (
                                    <tr key={row.pos} className="transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                      <td className="px-5 py-2.5 text-[12px] font-mono font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>{row.pos}</td>
                                      <td className="py-2.5 text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>{row.team}</td>
                                      <td className="px-3 py-2.5 text-[12px] text-center font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{row.p}</td>
                                      <td className="px-3 py-2.5 text-[12px] text-center font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{row.w}</td>
                                      <td className="px-3 py-2.5 text-[12px] text-center font-mono hidden sm:table-cell" style={{ color: 'rgba(255,255,255,0.35)' }}>{row.d}</td>
                                      <td className="px-3 py-2.5 text-[12px] text-center font-mono hidden sm:table-cell" style={{ color: 'rgba(255,255,255,0.35)' }}>{row.l}</td>
                                      <td className="px-3 py-2.5 text-[12px] text-center font-mono" style={{ color: '#00D4AA' }}>{row.gd}</td>
                                      <td className="px-5 py-2.5 text-[14px] font-bold text-center font-mono text-white">{row.pts}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </motion.div>
                          )}

                          {widgetTab === 'fixtures' && (
                            <motion.div key="fixtures" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                              <div>
                                {fixturesData.map((fix, i) => (
                                  <div key={i} className="px-5 py-3.5 flex items-center justify-between transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <div className="flex-1">
                                      <div className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                                        {fix.home} <span className="font-normal mx-2" style={{ color: 'rgba(255,255,255,0.2)' }}>vs</span> {fix.away}
                                      </div>
                                      <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{fix.date}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-[13px] font-mono font-bold" style={{ color: '#00D4AA' }}>{fix.time}</div>
                                      <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{fix.league}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {widgetTab === 'scorers' && (
                            <motion.div key="scorers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                              <table className="w-full">
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-left" style={{ color: 'rgba(255,255,255,0.25)' }}>#</th>
                                    <th className="py-2.5 text-[10px] font-semibold uppercase tracking-wider text-left" style={{ color: 'rgba(255,255,255,0.25)' }}>Player</th>
                                    <th className="py-2.5 text-[10px] font-semibold uppercase tracking-wider text-left hidden sm:table-cell" style={{ color: 'rgba(255,255,255,0.25)' }}>Team</th>
                                    <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>G</th>
                                    <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>A</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {topScorersData.map((p) => (
                                    <tr key={p.pos} className="transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                      <td className="px-5 py-2.5 text-[12px] font-mono font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.pos}</td>
                                      <td className="py-2.5 text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>{p.name}</td>
                                      <td className="py-2.5 text-[12px] hidden sm:table-cell" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.team}</td>
                                      <td className="px-3 py-2.5 text-[14px] font-bold text-center font-mono text-white">{p.goals}</td>
                                      <td className="px-5 py-2.5 text-[12px] text-center font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.assists}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Embed code */}
                      <div className="mt-5 rounded-xl overflow-hidden" style={{ background: '#0A0C10', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>embed.html</span>
                          <button
                            onClick={() => navigator.clipboard?.writeText('<script src="https://diurna.vercel.app/api/embed/script?widget=standings"></script>')}
                            className="px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors"
                            style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)' }}
                          >
                            Copy
                          </button>
                        </div>
                        <pre className="p-4 text-[12px] font-mono leading-relaxed overflow-x-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          <code>
                            <span style={{ color: '#00D4AA' }}>{'<script'}</span>{' '}
                            <span style={{ color: '#60a5fa' }}>src</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>=</span>
                            <span style={{ color: '#FFBD2E' }}>&quot;https://diurna.vercel.app/api/embed/script?widget=standings&quot;</span>
                            <span style={{ color: '#00D4AA' }}>{'></script>'}</span>
                          </code>
                        </pre>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className="py-20 md:py-28 px-6" style={{ background: '#FAFAF9' }}>
        <div className="max-w-[1200px] mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="font-display text-[32px] md:text-[44px] tracking-tight mb-4" style={{ color: '#1A1A1A' }}>
              Three steps to launch
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative max-w-[900px] mx-auto">
            {/* Dotted connector */}
            <div className="hidden md:block absolute top-[52px] left-[20%] right-[20%] h-px" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #D4D4D8 0, #D4D4D8 6px, transparent 6px, transparent 12px)' }} />

            {[
              { num: '01', icon: '\u{1F517}', title: 'Connect', desc: 'Set up leagues, competitors, topics. Connect your RSS sources and football data feeds.' },
              { num: '02', icon: '\u26A1', title: 'Generate', desc: 'AI surfaces trending stories. One click generates full articles with stats, quotes, and SEO optimization.' },
              { num: '03', icon: '\u{1F680}', title: 'Publish', desc: 'Review in the premium editor, schedule, and embed widgets anywhere. Your content, your way.' },
            ].map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.1} className="text-center relative z-10">
                <div className="w-[72px] h-[72px] mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <span className="text-[28px]">{step.icon}</span>
                </div>
                <div className="text-[11px] font-mono font-bold mb-2" style={{ color: '#00D4AA' }}>{step.num}</div>
                <h3 className="text-[17px] font-bold mb-2" style={{ color: '#1A1A1A' }}>{step.title}</h3>
                <p className="text-[13px] leading-relaxed max-w-[280px] mx-auto" style={{ color: '#6B6B6B' }}>{step.desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ STATS STRIP ══════════ */}
      <section className="py-16 md:py-20 px-6" style={{ background: '#00D4AA' }}>
        <div className="max-w-[1200px] mx-auto">
          <FadeIn>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
              {[
                { target: 65, suffix: '+', prefix: '', label: 'RSS Sources' },
                { target: 50, suffix: '+', prefix: '', label: 'Football Leagues' },
                { target: 13, suffix: '', prefix: '', label: 'Widget Types' },
                { target: 2, suffix: ' min', prefix: '< ', label: 'Per Article' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-[36px] sm:text-[44px] md:text-[52px] font-mono font-bold text-white mb-1">
                    <AnimatedCounter target={stat.target} suffix={stat.suffix} prefix={stat.prefix} />
                  </div>
                  <div className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════ PRICING ══════════ */}
      <section id="pricing" className="py-20 md:py-28 px-6" style={{ background: '#F5F5F0' }}>
        <div className="max-w-[1200px] mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="font-display text-[32px] md:text-[44px] tracking-tight mb-4" style={{ color: '#1A1A1A' }}>
              Plans for every publisher
            </h2>
            <p className="text-[15px] max-w-[520px] mx-auto leading-relaxed" style={{ color: '#6B6B6B' }}>
              Start free, upgrade when you need more. No credit card required.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[960px] mx-auto items-start">
            {/* Starter */}
            <FadeIn>
              <div className="h-full rounded-2xl p-7 flex flex-col" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)' }}>
                <h3 className="text-[17px] font-bold mb-1" style={{ color: '#1A1A1A' }}>Starter</h3>
                <div className="mb-3">
                  <span className="text-[36px] font-mono font-bold" style={{ color: '#1A1A1A' }}>Free</span>
                </div>
                <p className="text-[13px] leading-relaxed mb-6" style={{ color: '#6B6B6B' }}>
                  Perfect for solo journalists getting started with AI publishing.
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {['1 site', '10 AI articles / month', '3 widgets', 'Basic analytics'].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-[13px]" style={{ color: '#6B6B6B' }}>
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="block w-full py-3 text-[13px] font-semibold text-center rounded-full transition-all hover:-translate-y-px"
                  style={{ color: '#1A1A1A', border: '1px solid #D4D4D8' }}
                >
                  Get Started Free
                </Link>
              </div>
            </FadeIn>

            {/* Pro */}
            <FadeIn delay={0.08}>
              <div className="relative md:-mt-2 md:mb-[-8px]">
                <div className="h-full rounded-2xl p-7 flex flex-col" style={{ background: '#FFFFFF', borderTop: '4px solid #00D4AA', border: '1px solid rgba(0,0,0,0.06)', borderTopColor: '#00D4AA', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[17px] font-bold" style={{ color: '#1A1A1A' }}>Pro</h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white" style={{ background: '#00D4AA' }}>MOST POPULAR</span>
                  </div>
                  <div className="mb-3">
                    <span className="text-[36px] font-mono font-bold" style={{ color: '#1A1A1A' }}>$29</span>
                    <span className="text-[14px] ml-1" style={{ color: '#6B6B6B' }}>/month</span>
                  </div>
                  <p className="text-[13px] leading-relaxed mb-6" style={{ color: '#6B6B6B' }}>
                    For growing newsrooms that need full AI power and publishing tools.
                  </p>
                  <ul className="space-y-3 mb-8 flex-1">
                    {['3 sites', '100 AI articles / month', 'All 13 widgets', 'Full analytics', 'Custom branding', 'Calendar autopilot'].map((f) => (
                      <li key={f} className="flex items-center gap-3 text-[13px]" style={{ color: '#6B6B6B' }}>
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className="block w-full py-3 text-[13px] font-semibold text-center text-white rounded-full transition-all hover:opacity-90 hover:-translate-y-px"
                    style={{ background: '#00D4AA', boxShadow: '0 4px 14px rgba(0,212,170,0.25)' }}
                  >
                    Start Pro Trial
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Enterprise */}
            <FadeIn delay={0.16}>
              <div className="h-full rounded-2xl p-7 flex flex-col" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)' }}>
                <h3 className="text-[17px] font-bold mb-1" style={{ color: '#1A1A1A' }}>Enterprise</h3>
                <div className="mb-3">
                  <span className="text-[36px] font-mono font-bold" style={{ color: '#1A1A1A' }}>Custom</span>
                </div>
                <p className="text-[13px] leading-relaxed mb-6" style={{ color: '#6B6B6B' }}>
                  White-label solution for large publishers and media groups.
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {['Unlimited sites', 'Unlimited AI articles', 'Custom widgets', 'API access', 'Revenue integration', 'Dedicated support', 'White-label'].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-[13px]" style={{ color: '#6B6B6B' }}>
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:hello@lupon.media"
                  className="block w-full py-3 text-[13px] font-semibold text-center rounded-full transition-all hover:-translate-y-px"
                  style={{ color: '#1A1A1A', border: '1px solid #D4D4D8' }}
                >
                  Contact Sales
                </a>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="py-20 md:py-28 px-6" style={{ background: '#FAFAF9' }}>
        <div className="max-w-[1200px] mx-auto text-center">
          <FadeIn>
            <h2 className="font-display text-[32px] md:text-[44px] tracking-tight mb-4" style={{ color: '#1A1A1A' }}>
              Ready to transform your<br className="hidden sm:block" /> sports coverage?
            </h2>
            <p className="text-[15px] max-w-[480px] mx-auto mb-10 leading-relaxed" style={{ color: '#6B6B6B' }}>
              Join publishers who are already using AI to create better content, faster.
            </p>
            <Link
              href="/register"
              className="inline-flex px-10 py-3.5 text-[15px] font-semibold text-white rounded-full transition-all hover:opacity-90 hover:-translate-y-px hover:shadow-lg"
              style={{ background: '#00D4AA', boxShadow: '0 4px 14px rgba(0,212,170,0.3)' }}
            >
              Start Free
            </Link>
            <p className="text-[12px] mt-4" style={{ color: '#A1A1AA' }}>No credit card required</p>
          </FadeIn>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="pt-16 pb-8 px-6" style={{ background: '#F0F0EB', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <Link href="/landing" className="text-[20px] font-display tracking-tight" style={{ color: '#1A1A1A' }}>
                Diurna<span style={{ color: '#00D4AA' }}>.</span>
              </Link>
              <p className="text-[13px] mt-3 max-w-[260px] leading-relaxed" style={{ color: '#6B6B6B' }}>
                The AI-powered sports publishing platform by Lupon Media. Create, publish, and monetize &mdash; all in one place.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#A1A1AA' }}>Product</h4>
              <div className="space-y-2.5">
                <button onClick={() => scrollTo('features')} className="block text-[13px] transition-colors" style={{ color: '#6B6B6B' }}>Features</button>
                <button onClick={() => scrollTo('pricing')} className="block text-[13px] transition-colors" style={{ color: '#6B6B6B' }}>Pricing</button>
                <button onClick={() => scrollTo('demo')} className="block text-[13px] transition-colors" style={{ color: '#6B6B6B' }}>Docs</button>
                <Link href="/register" className="block text-[13px] transition-colors" style={{ color: '#6B6B6B' }}>Get Started</Link>
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#A1A1AA' }}>Company</h4>
              <div className="space-y-2.5">
                <a href="https://lupon.media" target="_blank" rel="noopener noreferrer" className="block text-[13px] transition-colors" style={{ color: '#6B6B6B' }}>Lupon Media</a>
                <a href="mailto:hello@lupon.media" className="block text-[13px] transition-colors" style={{ color: '#6B6B6B' }}>Contact</a>
                <Link href="/site/about" className="block text-[13px] transition-colors" style={{ color: '#6B6B6B' }}>About</Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-4" style={{ color: '#A1A1AA' }}>Legal</h4>
              <div className="space-y-2.5">
                <Link href="/site/privacy" className="block text-[13px] transition-colors" style={{ color: '#6B6B6B' }}>Privacy</Link>
                <Link href="/site/impressum" className="block text-[13px] transition-colors" style={{ color: '#6B6B6B' }}>Impressum</Link>
                <a href="#" className="block text-[13px] transition-colors" style={{ color: '#6B6B6B' }}>Terms</a>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 gap-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <p className="text-[12px]" style={{ color: '#A1A1AA' }}>
              &copy; 2026 Diurna. A product by{' '}
              <a href="https://lupon.media" target="_blank" rel="noopener noreferrer" className="font-medium transition-colors" style={{ color: '#6B6B6B' }}>
                Lupon Media
              </a>
              .
            </p>
            <div className="flex gap-2.5">
              <a href="#" aria-label="Twitter" className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <svg className="w-3.5 h-3.5" fill="#6B6B6B" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <svg className="w-3.5 h-3.5" fill="#6B6B6B" viewBox="0 0 24 24">
                  <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
                </svg>
              </a>
              <a href="#" aria-label="GitHub" className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <svg className="w-3.5 h-3.5" fill="#6B6B6B" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
