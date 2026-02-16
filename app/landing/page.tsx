'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence, useInView } from 'framer-motion'

// ═══════════════════════════════════
// DATA
// ═══════════════════════════════════

const features = [
  { icon: '\u{1F9E0}', title: 'Smart Newsroom', desc: 'AI monitors Google Trends, competitor RSS feeds, and football fixtures to surface what\'s trending. Never miss a story.' },
  { icon: '\u26A1', title: 'One-Click Article Generation', desc: 'Select a trending topic, click generate. Claude AI writes SEO-optimized articles with proper structure, quotes, and stats.' },
  { icon: '\u270F\uFE0F', title: 'Premium Editor', desc: 'Tiptap-based editor with 2-row toolbar, inline polls/quiz/surveys, Unsplash image search, and drag-drop media.' },
  { icon: '\u26BD', title: 'Football Widgets', desc: '13 ready-made widgets: standings, fixtures, live scores, top scorers, player stats. Embed anywhere with one script tag.' },
  { icon: '\u{1F3A8}', title: 'Theme System', desc: 'Two premium themes (Midnight Pro dark, Clean Editorial light) with full branding control. Your site, your look.' },
  { icon: '\u{1F4CA}', title: 'Analytics Dashboard', desc: 'Track article performance, audience engagement, and content velocity. Know what works.' },
  { icon: '\u{1F916}', title: 'AI Co-Pilot', desc: 'Originality checking, headline suggestions, SEO optimization, and content improvement \u2014 all built in.' },
  { icon: '\u{1F4C5}', title: 'Editorial Calendar', desc: 'Autopilot scheduling based on football fixtures. Content calendar that fills itself.' },
  { icon: '\u{1F50C}', title: 'Integrations', desc: 'WordPress sync, Google Analytics 4, newsletter via Resend, Facebook publishing. Connect your stack.' },
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

const mockupTopics = [
  { topic: 'Champions League Final', score: 94 },
  { topic: 'Premier League Transfer', score: 87 },
  { topic: 'Mbappe Real Madrid', score: 82 },
  { topic: 'World Cup Qualifiers', score: 76 },
  { topic: "Ballon d'Or 2025", score: 71 },
]

const mockupCards = [
  { title: 'Champions League Final Preview: Real Madrid vs Arsenal', score: 94, cat: 'Sport', velocity: '\u2191', color: 'text-red-400 bg-red-500/10' },
  { title: 'Premier League Transfer Window: Top 10 Deals to Watch', score: 87, cat: 'Sport', velocity: '\u2191', color: 'text-orange-400 bg-orange-500/10' },
  { title: 'Trump Announces New Trade Deal with European Union', score: 82, cat: 'Politics', velocity: '\u2192', color: 'text-orange-400 bg-orange-500/10' },
  { title: 'OpenAI Releases GPT-5 with Real-Time Capabilities', score: 76, cat: 'Tech', velocity: '\u2191', color: 'text-blue-400 bg-blue-500/10' },
  { title: 'Mbappe Breaks La Liga All-Time Scoring Record', score: 71, cat: 'Sport', velocity: '\u2193', color: 'text-blue-400 bg-blue-500/10' },
  { title: 'Euro 2028 Host Cities Officially Revealed by UEFA', score: 65, cat: 'Sport', velocity: '\u2192', color: 'text-blue-400 bg-blue-500/10' },
]

// ═══════════════════════════════════
// ANIMATION HELPERS
// ═══════════════════════════════════

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0 })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const duration = 2000
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

  return <span ref={ref}>{count}{suffix}</span>
}

// ═══════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<'standings' | 'fixtures' | 'scorers'>('standings')
  const [scrolled, setScrolled] = useState(false)

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
    <div className="min-h-screen bg-[#0A0A0B] text-white antialiased" style={{ scrollBehavior: 'smooth' }}>
      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float-orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float-orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(1.05); }
          66% { transform: translate(20px, -35px) scale(0.95); }
        }
        @keyframes mockup-hover {
          0%, 100% { transform: perspective(2000px) rotateX(8deg) rotateY(-4deg) translateY(0px); }
          50% { transform: perspective(2000px) rotateX(8deg) rotateY(-4deg) translateY(-10px); }
        }
        .gradient-text {
          background: linear-gradient(135deg, #3B82F6, #8B5CF6, #EC4899, #3B82F6);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-shift 8s ease infinite;
        }
        .orb-1 { animation: float-orb-1 20s ease-in-out infinite; }
        .orb-2 { animation: float-orb-2 25s ease-in-out infinite; }
        .orb-3 { animation: float-orb-1 18s ease-in-out infinite 5s; }
        .mockup-float { animation: mockup-hover 6s ease-in-out infinite; }
        .mockup-float:hover { animation-play-state: paused; transform: perspective(2000px) rotateX(2deg) rotateY(-2deg); }
      `}</style>

      {/* ═══════════════════════════════════ */}
      {/* NAVIGATION                         */}
      {/* ═══════════════════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/[0.06]' : ''}`}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/landing" className="text-xl font-display gradient-text font-bold tracking-tight">
            Diurna
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('features')} className="text-sm text-white/50 hover:text-white transition-colors">Features</button>
            <button onClick={() => scrollTo('pricing')} className="text-sm text-white/50 hover:text-white transition-colors">Pricing</button>
            <button onClick={() => scrollTo('demo')} className="text-sm text-white/50 hover:text-white transition-colors">Docs</button>
            <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">Sign In</Link>
            <Link href="/register" className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-500 to-violet-500 rounded-lg hover:opacity-90 transition-opacity">
              Start Free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2" aria-label="Menu">
            <div className="flex flex-col gap-1.5">
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${mobileMenu ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${mobileMenu ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${mobileMenu ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#0A0A0B]/95 backdrop-blur-xl border-b border-white/[0.06] overflow-hidden"
            >
              <div className="px-6 py-5 flex flex-col gap-4">
                <button onClick={() => scrollTo('features')} className="text-sm text-white/60 hover:text-white text-left">Features</button>
                <button onClick={() => scrollTo('pricing')} className="text-sm text-white/60 hover:text-white text-left">Pricing</button>
                <button onClick={() => scrollTo('demo')} className="text-sm text-white/60 hover:text-white text-left">Docs</button>
                <Link href="/login" className="text-sm text-white/60 hover:text-white" onClick={() => setMobileMenu(false)}>Sign In</Link>
                <Link href="/register" className="mt-1 px-4 py-2.5 text-sm font-semibold text-center bg-gradient-to-r from-blue-500 to-violet-500 rounded-lg" onClick={() => setMobileMenu(false)}>
                  Start Free
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ═══════════════════════════════════ */}
      {/* HERO                               */}
      {/* ═══════════════════════════════════ */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-20 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-[-200px] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-500/[0.07] blur-[120px] orb-1 pointer-events-none" />
        <div className="absolute top-[-100px] right-[10%] w-[500px] h-[500px] rounded-full bg-violet-500/[0.07] blur-[120px] orb-2 pointer-events-none" />
        <div className="absolute top-[200px] left-[50%] w-[400px] h-[400px] rounded-full bg-pink-500/[0.04] blur-[100px] orb-3 pointer-events-none" />

        <div className="max-w-[1200px] mx-auto px-6 text-center relative z-10">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-white/50 mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            AI-Powered Sports Publishing
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.05] mb-6"
          >
            The <span className="gradient-text">AI Newsroom</span> for
            <br className="hidden sm:block" /> Sports Publishers
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            className="text-base md:text-lg text-white/50 max-w-[640px] mx-auto mb-10 leading-relaxed"
          >
            From trending topics to published articles in minutes. AI-powered content
            generation, real-time football data, and embeddable widgets &mdash; all in one platform.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 md:mb-20"
          >
            <Link
              href="/register"
              className="w-full sm:w-auto text-center px-8 py-3.5 text-sm font-semibold bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all hover:-translate-y-0.5"
            >
              Start Free Trial
            </Link>
            <button
              onClick={() => scrollTo('demo')}
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold border border-white/[0.12] rounded-xl text-white/80 hover:bg-white/[0.04] hover:border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.841z" />
              </svg>
              Watch Demo
            </button>
          </motion.div>

          {/* ─── Browser Mockup: Smart Newsroom ─── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
            className="hidden sm:block max-w-[960px] mx-auto"
          >
            <div
              className="mockup-float rounded-2xl border border-white/[0.08] bg-[#111113] overflow-hidden"
              style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 80px rgba(59,130,246,0.06)' }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0D0D0F] border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#28CA41]" />
                </div>
                <div className="flex-1 ml-3 px-3 py-1 bg-white/[0.04] rounded-md text-[11px] font-mono text-white/30">
                  app.diurna.io/newsroom
                </div>
              </div>

              {/* Newsroom UI */}
              <div className="p-4 md:p-5">
                {/* Header bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-white">Smart Newsroom</h3>
                    <div className="flex bg-white/[0.04] rounded-lg p-0.5">
                      <div className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-md text-[10px] font-semibold text-blue-400">
                        Trending
                      </div>
                      <div className="px-3 py-1 text-[10px] font-medium text-white/30">Feed</div>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-violet-500 rounded-md text-[10px] font-bold text-white">
                    + Generate
                  </div>
                </div>

                {/* Hot topics bar */}
                <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                  {mockupTopics.map((t, i) => (
                    <div key={i} className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-full">
                      <span className="text-[9px]">{'\u{1F525}'}</span>
                      <span className="text-[10px] font-medium text-white/60 whitespace-nowrap">{t.topic}</span>
                      <span className="text-[10px] font-mono font-bold text-orange-400">{t.score}</span>
                    </div>
                  ))}
                </div>

                {/* Smart cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {mockupCards.slice(0, typeof window !== 'undefined' && window.innerWidth < 640 ? 3 : 6).map((card, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 relative">
                      <div className={`absolute top-2 right-2 w-7 h-7 rounded-full ${card.color} flex items-center justify-center text-[9px] font-mono font-bold`}>
                        {card.score}
                      </div>
                      <span className="inline-block px-1.5 py-0.5 text-[8px] font-semibold bg-white/[0.06] text-white/40 rounded mb-1.5">
                        {card.cat}
                      </span>
                      <p className="text-[10px] font-medium text-white/70 leading-tight line-clamp-2 pr-6">{card.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[8px] text-white/30">
                          {card.velocity} {card.velocity === '\u2191' ? 'Rising' : card.velocity === '\u2192' ? 'Peaked' : 'Falling'}
                        </span>
                        <span className="text-[8px] text-white/20">{'\u2022'}</span>
                        <span className="text-[8px] text-white/30">{2 + i} sources</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-[800px] mx-auto"
          >
            {[
              { value: '1,200+', label: 'Articles Generated' },
              { value: '50+', label: 'Football Leagues' },
              { value: '13', label: 'Embeddable Widgets' },
              { value: '< 2 min', label: 'Avg. Article Time' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xl md:text-2xl font-mono font-bold text-white">{stat.value}</div>
                <div className="text-xs text-white/40 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* FEATURES GRID                      */}
      {/* ═══════════════════════════════════ */}
      <section id="features" className="py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400 mb-4">Features</p>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4">
              Everything your newsroom needs
            </h2>
            <p className="text-white/50 max-w-[520px] mx-auto leading-relaxed">
              A complete publishing platform designed for sports media teams who want to create better content, faster.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.05}>
                <div className="group h-full p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-lg mb-4">
                    {f.icon}
                  </div>
                  <h3 className="text-[15px] font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* LIVE WIDGET DEMO                   */}
      {/* ═══════════════════════════════════ */}
      <section id="demo" className="py-16 md:py-20 bg-[#0D0D0F] border-y border-white/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6">
          <FadeIn className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400 mb-4">Live Demo</p>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4">
              Football Widgets That Just Work
            </h2>
            <p className="text-white/50 max-w-[520px] mx-auto leading-relaxed">
              13 embeddable widgets, real-time data from 50+ leagues. Copy one line of code.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="max-w-[720px] mx-auto">
              {/* Tabs */}
              <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 mb-6 w-fit mx-auto overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {(['standings', 'fixtures', 'scorers'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                      activeTab === tab
                        ? 'bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white border border-white/[0.08]'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {tab === 'standings' ? 'Standings' : tab === 'fixtures' ? 'Fixtures' : 'Top Scorers'}
                  </button>
                ))}
              </div>

              {/* Widget card */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#111113] overflow-hidden">
                {/* Widget header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{'\u26BD'}</span>
                    <span className="text-sm font-bold text-white">Premier League</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 rounded-md">LIVE</span>
                  </div>
                  <span className="text-[10px] text-white/30">2024/25</span>
                </div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                  {activeTab === 'standings' && (
                    <motion.div key="standings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/[0.04]">
                            <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-left w-8">#</th>
                            <th className="py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-left">Team</th>
                            <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-center">P</th>
                            <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-center">W</th>
                            <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-center hidden sm:table-cell">D</th>
                            <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-center hidden sm:table-cell">L</th>
                            <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-center">GD</th>
                            <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-center">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standingsData.map((row) => (
                            <tr key={row.pos} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                              <td className="px-5 py-2.5 text-xs font-mono font-bold text-white/30">{row.pos}</td>
                              <td className="py-2.5 text-[13px] font-semibold text-white/80">{row.team}</td>
                              <td className="px-3 py-2.5 text-xs text-white/40 text-center font-mono">{row.p}</td>
                              <td className="px-3 py-2.5 text-xs text-white/40 text-center font-mono">{row.w}</td>
                              <td className="px-3 py-2.5 text-xs text-white/40 text-center font-mono hidden sm:table-cell">{row.d}</td>
                              <td className="px-3 py-2.5 text-xs text-white/40 text-center font-mono hidden sm:table-cell">{row.l}</td>
                              <td className="px-3 py-2.5 text-xs text-emerald-400/80 text-center font-mono">{row.gd}</td>
                              <td className="px-5 py-2.5 text-sm font-bold text-white text-center font-mono">{row.pts}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}

                  {activeTab === 'fixtures' && (
                    <motion.div key="fixtures" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="divide-y divide-white/[0.03]">
                        {fixturesData.map((fix, i) => (
                          <div key={i} className="px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                            <div className="flex-1">
                              <div className="text-[13px] font-semibold text-white/80">
                                {fix.home} <span className="text-white/20 font-normal mx-2">vs</span> {fix.away}
                              </div>
                              <div className="text-[10px] text-white/30 mt-0.5">{fix.date}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-mono font-bold text-blue-400">{fix.time}</div>
                              <div className="text-[10px] text-white/30">{fix.league}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'scorers' && (
                    <motion.div key="scorers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/[0.04]">
                            <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-left w-8">#</th>
                            <th className="py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-left">Player</th>
                            <th className="py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-left hidden sm:table-cell">Team</th>
                            <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-center">G</th>
                            <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 text-center">A</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topScorersData.map((p) => (
                            <tr key={p.pos} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                              <td className="px-5 py-2.5 text-xs font-mono font-bold text-white/30">{p.pos}</td>
                              <td className="py-2.5 text-[13px] font-semibold text-white/80">{p.name}</td>
                              <td className="py-2.5 text-xs text-white/40 hidden sm:table-cell">{p.team}</td>
                              <td className="px-3 py-2.5 text-sm font-bold text-white text-center font-mono">{p.goals}</td>
                              <td className="px-5 py-2.5 text-xs text-white/40 text-center font-mono">{p.assists}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Embed code block */}
              <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#0D0D0F] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                  <span className="text-[10px] font-mono text-white/30">embed.html</span>
                  <button
                    onClick={() => navigator.clipboard?.writeText('<script src="https://app.diurna.io/api/embed/script?article=YOUR_ID"></script>')}
                    className="px-2.5 py-1 text-[10px] font-medium text-white/30 hover:text-white/60 bg-white/[0.04] rounded-md transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <pre className="p-4 text-[13px] font-mono leading-relaxed overflow-x-auto">
                  <code>
                    <span className="text-violet-400">{'<script'}</span>
                    {' '}<span className="text-blue-300">src</span>
                    <span className="text-white/40">=</span>
                    <span className="text-emerald-400">&quot;https://app.diurna.io/api/embed/script?article=YOUR_ID&quot;</span>
                    <span className="text-violet-400">{'></script>'}</span>
                  </code>
                </pre>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* HOW IT WORKS                       */}
      {/* ═══════════════════════════════════ */}
      <section className="py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <FadeIn className="text-center mb-16 md:mb-20">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400 mb-4">How It Works</p>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight">
              Three steps to launch
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-blue-500/40 via-violet-500/40 to-pink-500/40" />

            {[
              { num: '01', title: 'Connect', desc: 'Sign up, connect your football leagues, set your topics and competitors to track.' },
              { num: '02', title: 'Generate', desc: 'AI surfaces trending stories. One click generates full articles with stats, quotes, and SEO optimization.' },
              { num: '03', title: 'Publish', desc: 'Review in our premium editor, schedule or publish instantly. Embed widgets anywhere.' },
            ].map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.1} className="text-center relative z-10">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#111113] border border-white/[0.08] flex items-center justify-center hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all duration-300">
                  <span className="text-xl font-mono font-bold gradient-text">{step.num}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/40 max-w-[280px] mx-auto leading-relaxed">{step.desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* SOCIAL PROOF / STATS               */}
      {/* ═══════════════════════════════════ */}
      <section className="py-16 md:py-20 bg-[#0D0D0F] border-y border-white/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <FadeIn>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 mb-12">
              {[
                { target: 50, suffix: '+', prefix: '', label: 'Football Leagues' },
                { target: 13, suffix: '', prefix: '', label: 'Widget Types' },
                { target: 2, suffix: '', prefix: '', label: 'Premium Themes' },
                { target: 2, suffix: ' min', prefix: '< ', label: 'Per Article' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold text-white mb-2">
                    {stat.prefix}<AnimatedCounter target={stat.target} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-white/40">{stat.label}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-white/30 max-w-[600px] mx-auto">
              Powered by{' '}
              <a href="https://lupon.media" target="_blank" rel="noopener noreferrer" className="text-white/50 font-semibold hover:text-white/70 transition-colors">
                Lupon Media
              </a>
              {' '}&mdash; trusted SSP partner with MCM, Pubmatic, Criteo, and Magnite integrations.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* PRICING                            */}
      {/* ═══════════════════════════════════ */}
      <section id="pricing" className="py-16 md:py-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400 mb-4">Pricing</p>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4">
              Plans for every publisher
            </h2>
            <p className="text-white/50 max-w-[520px] mx-auto leading-relaxed">
              Start free, upgrade when you need more. No credit card required.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 max-w-[960px] mx-auto items-start">
            {/* Starter */}
            <FadeIn>
              <div className="h-full rounded-2xl border border-white/[0.06] bg-[#111113] p-7 flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-1">Starter</h3>
                <div className="mb-3">
                  <span className="text-4xl font-mono font-bold text-white">Free</span>
                </div>
                <p className="text-sm text-white/40 mb-6 leading-relaxed">
                  Perfect for solo journalists getting started with AI publishing.
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {['1 site', '10 AI articles / month', '3 widgets', 'Basic analytics'].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white/60">
                      <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className="block w-full py-3 text-sm font-semibold text-center rounded-xl border border-white/[0.1] text-white/70 hover:bg-white/[0.04] hover:border-white/20 transition-all"
                >
                  Get Started Free
                </Link>
              </div>
            </FadeIn>

            {/* Pro - Featured */}
            <FadeIn delay={0.1}>
              <div className="relative md:scale-105 md:z-10">
                {/* Gradient border wrapper */}
                <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-blue-500/50 to-violet-500/50" />
                <div className="relative h-full rounded-2xl bg-[#111113] p-7 flex flex-col">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-bold bg-gradient-to-r from-blue-500 to-violet-500 rounded-full whitespace-nowrap">
                    MOST POPULAR
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Pro</h3>
                  <div className="mb-3">
                    <span className="text-4xl font-mono font-bold text-white">$29</span>
                    <span className="text-sm text-white/40 ml-1">/month</span>
                  </div>
                  <p className="text-sm text-white/40 mb-6 leading-relaxed">
                    For growing newsrooms that need full AI power and publishing tools.
                  </p>
                  <ul className="space-y-3 mb-8 flex-1">
                    {['3 sites', '100 AI articles / month', 'All 13 widgets', 'Full analytics', 'Custom branding', 'Calendar autopilot'].map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm text-white/60">
                        <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className="block w-full py-3 text-sm font-semibold text-center rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 hover:opacity-90 transition-opacity"
                  >
                    Start Pro Trial
                  </Link>
                </div>
              </div>
            </FadeIn>

            {/* Enterprise */}
            <FadeIn delay={0.2}>
              <div className="h-full rounded-2xl border border-white/[0.06] bg-[#111113] p-7 flex flex-col">
                <h3 className="text-lg font-semibold text-white mb-1">Enterprise</h3>
                <div className="mb-3">
                  <span className="text-4xl font-mono font-bold text-white">Custom</span>
                </div>
                <p className="text-sm text-white/40 mb-6 leading-relaxed">
                  White-label solution for large publishers and media groups.
                </p>
                <ul className="space-y-3 mb-8 flex-1">
                  {['Unlimited sites', 'Unlimited AI articles', 'Custom widgets', 'API access', 'Revenue integration', 'Dedicated support', 'White-label'].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white/60">
                      <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:hello@lupon.media"
                  className="block w-full py-3 text-sm font-semibold text-center rounded-xl border border-white/[0.1] text-white/70 hover:bg-white/[0.04] hover:border-white/20 transition-all"
                >
                  Contact Sales
                </a>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* FINAL CTA                          */}
      {/* ═══════════════════════════════════ */}
      <section className="py-16 md:py-20 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/[0.06] blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-violet-500/[0.06] blur-[100px] pointer-events-none" />

        <div className="max-w-[1200px] mx-auto px-6 text-center relative z-10">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight mb-4">
              Ready to Transform Your
              <br className="hidden sm:block" /> Sports Coverage?
            </h2>
            <p className="text-white/50 max-w-[520px] mx-auto mb-10 leading-relaxed">
              Join publishers who are already using AI to 10x their content output.
            </p>
            <Link
              href="/register"
              className="inline-flex w-full sm:w-auto justify-center px-10 py-4 text-base font-semibold bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all hover:-translate-y-0.5"
            >
              Start Free Trial
            </Link>
            <p className="text-xs text-white/30 mt-4">No credit card required. Setup in under 2 minutes.</p>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════ */}
      {/* FOOTER                             */}
      {/* ═══════════════════════════════════ */}
      <footer className="pt-16 pb-8 border-t border-white/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <Link href="/landing" className="text-xl font-display gradient-text font-bold tracking-tight">
                Diurna
              </Link>
              <p className="text-sm text-white/30 mt-3 max-w-[260px] leading-relaxed">
                The AI-powered sports publishing platform by Lupon Media. Create, publish, and monetize &mdash; all in one place.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-white/50 mb-4">Product</h4>
              <div className="space-y-2.5">
                <button onClick={() => scrollTo('features')} className="block text-sm text-white/30 hover:text-white/60 transition-colors">Features</button>
                <button onClick={() => scrollTo('pricing')} className="block text-sm text-white/30 hover:text-white/60 transition-colors">Pricing</button>
                <button onClick={() => scrollTo('demo')} className="block text-sm text-white/30 hover:text-white/60 transition-colors">Docs</button>
                <Link href="/register" className="block text-sm text-white/30 hover:text-white/60 transition-colors">Get Started</Link>
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-white/50 mb-4">Company</h4>
              <div className="space-y-2.5">
                <a href="https://lupon.media" target="_blank" rel="noopener noreferrer" className="block text-sm text-white/30 hover:text-white/60 transition-colors">Lupon Media</a>
                <a href="mailto:hello@lupon.media" className="block text-sm text-white/30 hover:text-white/60 transition-colors">Contact</a>
                <Link href="/site/about" className="block text-sm text-white/30 hover:text-white/60 transition-colors">About</Link>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-white/50 mb-4">Legal</h4>
              <div className="space-y-2.5">
                <Link href="/site/privacy" className="block text-sm text-white/30 hover:text-white/60 transition-colors">Privacy</Link>
                <Link href="/site/impressum" className="block text-sm text-white/30 hover:text-white/60 transition-colors">Impressum</Link>
                <a href="#" className="block text-sm text-white/30 hover:text-white/60 transition-colors">Terms</a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-white/[0.04] gap-4">
            <p className="text-xs text-white/20">
              &copy; 2025 Diurna. A product by{' '}
              <a href="https://lupon.media" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/50 transition-colors">
                Lupon Media
              </a>
              .
            </p>
            <div className="flex gap-3">
              <a href="#" aria-label="Twitter" className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] hover:border-white/[0.12] transition-all">
                <svg className="w-3.5 h-3.5 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] hover:border-white/[0.12] transition-all">
                <svg className="w-3.5 h-3.5 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
                </svg>
              </a>
              <a href="#" aria-label="GitHub" className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] hover:border-white/[0.12] transition-all">
                <svg className="w-3.5 h-3.5 text-white/40" fill="currentColor" viewBox="0 0 24 24">
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
