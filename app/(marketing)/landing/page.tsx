'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import '../landing.css'

const features = [
  { icon: '🤖', title: 'AI Content Generation', desc: 'Generate match previews, transfer analyses, and tactical breakdowns in seconds. Claude AI writes like your best journalist.' },
  { icon: '🧩', title: 'Football Widgets', desc: 'Live scores, standings, polls, and quizzes. Embed anywhere and monetize every impression with Lupon Media SSP.' },
  { icon: '📅', title: 'Smart Calendar', desc: 'AI autopilot schedules articles around match days. Never miss a deadline — content publishes itself.' },
  { icon: '📧', title: 'Newsletter System', desc: 'Built-in Resend-powered email campaigns. Grow your audience with automated newsletters and subscriber management.' },
  { icon: '📈', title: 'Real-time Analytics', desc: 'Track article performance, widget engagement, and revenue metrics. Data-driven decisions for your newsroom.' },
  { icon: '💰', title: 'Ad Monetization', desc: 'Lupon Media SSP integration with Prebid.js, Google MCM, and header bidding. Turn every page view into revenue.' },
]

const standings = [
  { pos: 1, team: 'Real Madrid', p: 28, gd: '+42', pts: 66 },
  { pos: 2, team: 'Barcelona', p: 28, gd: '+38', pts: 63 },
  { pos: 3, team: 'Atl. Madrid', p: 28, gd: '+21', pts: 55 },
  { pos: 4, team: 'Athletic Club', p: 28, gd: '+15', pts: 51 },
  { pos: 5, team: 'Villarreal', p: 28, gd: '+12', pts: 47 },
]

const integrations = [
  { icon: '📝', name: 'WordPress', desc: 'Import & sync' },
  { icon: '📘', name: 'Facebook', desc: 'Auto-post' },
  { icon: '📊', name: 'Google Analytics', desc: 'Traffic tracking' },
  { icon: '📷', name: 'Unsplash', desc: 'Image search' },
  { icon: '📧', name: 'Resend', desc: 'Email delivery' },
  { icon: '⚽', name: 'API-Football', desc: 'Live data' },
  { icon: '🔧', name: 'Prebid.js', desc: 'Header bidding' },
  { icon: '🏢', name: 'Google MCM', desc: 'Ad management' },
]

const barHeights = [35, 50, 42, 65, 55, 78, 60, 85, 70, 92, 80, 95, 88, 75, 100]

export default function LandingPage() {
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // Scroll-based nav background
    const handleScroll = () => {
      if (navRef.current) {
        navRef.current.classList.toggle('scrolled', window.scrollY > 40)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Intersection observer for reveal animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.lp-reveal').forEach((el) => observer.observe(el))

    return () => {
      window.removeEventListener('scroll', handleScroll)
      observer.disconnect()
    }
  }, [])

  return (
    <div className="lp">
      {/* ═══ NAV ═══ */}
      <nav className="lp-nav" ref={navRef}>
        <div className="lp-nav-inner">
          <div className="lp-logo">Diurna<b>.</b></div>
          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#pricing" className="lp-nav-link">Pricing</a>
            <a href="#integrations" className="lp-nav-link">Integrations</a>
            <Link href="/login" className="lp-nav-link">Sign In</Link>
            <Link href="/register" className="lp-nav-cta">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="lp-hero">
        <div className="lp-container">
          <div className="lp-badge">
            <span className="lp-badge-dot" />
            Powered by Lupon Media SSP
          </div>
          <h1>
            The <span className="lp-hero-gradient">AI-Powered</span><br />
            Sports Publishing Platform
          </h1>
          <p>
            Create, publish, and monetize sports content with AI.<br />
            From match previews to live widgets — all powered by Lupon Media SSP.
          </p>
          <div className="lp-hero-ctas">
            <Link href="/register" className="lp-btn-primary">Start Free &rarr;</Link>
            <a href="#pricing" className="lp-btn-outline">Book Demo</a>
          </div>

          {/* Browser Mockup */}
          <div className="lp-browser">
            <div className="lp-browser-frame">
              <div className="lp-browser-bar">
                <div className="lp-browser-dots">
                  <div className="lp-browser-dot" />
                  <div className="lp-browser-dot" />
                  <div className="lp-browser-dot" />
                </div>
                <div className="lp-browser-url">app.diurna.io/dashboard</div>
              </div>
              <div className="lp-browser-content">
                <div className="lp-mock-sidebar">
                  <div className="lp-mock-sidebar-logo">Diurna<b>.</b></div>
                  {['Dashboard', 'Newsroom', 'AI Co-Pilot', 'Widgets', 'Calendar', 'Analytics', 'Settings'].map((item, i) => (
                    <div key={item} className={`lp-mock-nav-item${i === 0 ? ' active' : ''}`}>
                      {['📊','📰','🤖','🧩','📅','📈','⚙️'][i]} {item}
                    </div>
                  ))}
                </div>
                <div className="lp-mock-main">
                  <div className="lp-mock-topbar">
                    <div className="lp-mock-title">Dashboard</div>
                    <div className="lp-mock-btn">+ New Article</div>
                  </div>
                  <div className="lp-mock-stats">
                    {[
                      { val: '2,847', label: 'Articles' },
                      { val: '$12.4k', label: 'Revenue' },
                      { val: '184k', label: 'Page Views' },
                      { val: '$2.40', label: 'eCPM' },
                    ].map((s) => (
                      <div key={s.label} className="lp-mock-stat">
                        <div className="lp-mock-stat-val">{s.val}</div>
                        <div className="lp-mock-stat-label">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="lp-mock-chart">
                    <div className="lp-mock-chart-title">Revenue (last 30 days)</div>
                    <div className="lp-mock-bars">
                      {barHeights.map((h, i) => (
                        <div key={i} className="lp-mock-bar" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TICKER ═══ */}
      <section className="lp-ticker">
        <div className="lp-ticker-label">Trusted by publishers using</div>
        <div className="lp-ticker-track">
          {[...Array(2)].map((_, set) => (
            ['Lupon Media', 'PubMatic', 'Criteo', 'Magnite', 'Google MCM', 'Index Exchange', 'OpenX', 'Xandr'].map((name) => (
              <div key={`${set}-${name}`} className="lp-ticker-item">
                <div className="lp-ticker-icon" style={{ background: 'rgba(0,212,170,.1)', color: '#00D4AA' }}>
                  {name.charAt(0)}
                </div>
                {name}
              </div>
            ))
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="lp-features" id="features">
        <div className="lp-container">
          <div className="lp-reveal">
            <div className="lp-section-label">Features</div>
            <div className="lp-section-title">Everything you need to publish</div>
            <div className="lp-section-desc">
              A complete newsroom platform designed for sports publishers who want to create better content, faster — and monetize every page view.
            </div>
          </div>
          <div className="lp-features-grid">
            {features.map((f, i) => (
              <div key={f.title} className="lp-feature-card lp-reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="lp-feature-icon">{f.icon}</div>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WIDGET DEMO ═══ */}
      <section className="lp-demo">
        <div className="lp-container">
          <div className="lp-demo-grid">
            <div className="lp-reveal">
              <div className="lp-section-label">Monetization</div>
              <div className="lp-section-title">Widgets that generate revenue</div>
              <div className="lp-section-desc">
                Every widget is an ad placement. Standings, live scores, polls — each one runs Lupon Media SSP with header bidding for maximum fill rate and eCPM.
              </div>
              <div style={{ marginTop: 32 }}>
                <Link href="/register" className="lp-btn-primary">Start Monetizing &rarr;</Link>
              </div>
            </div>
            <div className="lp-demo-visual lp-reveal" style={{ transitionDelay: '150ms' }}>
              <div className="lp-demo-widget">
                <div className="lp-demo-widget-head">
                  <div className="lp-demo-widget-title">
                    ⚽ La Liga Standings
                    <span className="lp-demo-widget-badge">LIVE</span>
                  </div>
                </div>
                <table className="lp-demo-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Team</th>
                      <th>P</th>
                      <th>GD</th>
                      <th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row) => (
                      <tr key={row.pos}>
                        <td><span className="lp-demo-pos">{row.pos}</span></td>
                        <td>{row.team}</td>
                        <td>{row.p}</td>
                        <td>{row.gd}</td>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{row.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="lp-demo-ad">
                <div className="lp-demo-callout">$2.40 eCPM</div>
                <div className="lp-demo-ad-label">Lupon Media SSP</div>
                <div className="lp-demo-ad-size">300 x 250</div>
                <div className="lp-demo-ad-text">Header Bidding + Google MCM</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="lp-steps">
        <div className="lp-container">
          <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="lp-section-label">How it works</div>
            <div className="lp-section-title">Three steps to your newsroom</div>
          </div>
          <div className="lp-steps-grid">
            <div className="lp-steps-line" />
            {[
              { num: '1', title: 'Connect your site', desc: 'Add your domain, import from WordPress, or start fresh. Setup takes under 2 minutes.' },
              { num: '2', title: 'AI creates content', desc: 'Generate articles, schedule publishing, and let the AI calendar handle your editorial workflow.' },
              { num: '3', title: 'Monetize with widgets', desc: 'Embed widgets, enable SSP ads, and watch revenue grow. Every impression counts.' },
            ].map((step, i) => (
              <div key={step.num} className="lp-step lp-reveal" style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="lp-step-num">{step.num}</div>
                <div className="lp-step-title">{step.title}</div>
                <div className="lp-step-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-container">
          <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="lp-section-label">Pricing</div>
            <div className="lp-section-title">Plans for every newsroom</div>
            <div className="lp-section-desc" style={{ margin: '0 auto' }}>
              Start free, upgrade when you need more. No credit card required.
            </div>
          </div>
          <div className="lp-pricing-grid">
            {/* Starter */}
            <div className="lp-price-card lp-reveal">
              <div className="lp-price-name">Starter</div>
              <div className="lp-price-amount">Free</div>
              <div className="lp-price-desc">Perfect for solo journalists and small publications getting started.</div>
              <ul className="lp-price-features">
                <li><span className="lp-price-check">&#10003;</span> 5 AI articles per day</li>
                <li><span className="lp-price-check">&#10003;</span> 3 widgets</li>
                <li><span className="lp-price-check">&#10003;</span> Basic analytics</li>
                <li><span className="lp-price-check">&#10003;</span> 1 team member</li>
                <li><span className="lp-price-check">&#10003;</span> Community support</li>
              </ul>
              <Link href="/register" className="lp-price-btn secondary">Get Started Free</Link>
            </div>

            {/* Pro */}
            <div className="lp-price-card featured lp-reveal" style={{ transitionDelay: '80ms' }}>
              <div className="lp-price-name">Pro</div>
              <div className="lp-price-amount">$49<span>/mo</span></div>
              <div className="lp-price-desc">For growing newsrooms that need full AI power and monetization.</div>
              <ul className="lp-price-features">
                <li><span className="lp-price-check">&#10003;</span> Unlimited AI articles</li>
                <li><span className="lp-price-check">&#10003;</span> 13 widget types</li>
                <li><span className="lp-price-check">&#10003;</span> AI content calendar</li>
                <li><span className="lp-price-check">&#10003;</span> Newsletter system</li>
                <li><span className="lp-price-check">&#10003;</span> Full analytics + SSP</li>
                <li><span className="lp-price-check">&#10003;</span> 10 team members</li>
                <li><span className="lp-price-check">&#10003;</span> Priority support</li>
              </ul>
              <Link href="/register" className="lp-price-btn primary">Start Pro Trial</Link>
            </div>

            {/* Enterprise */}
            <div className="lp-price-card lp-reveal" style={{ transitionDelay: '160ms' }}>
              <div className="lp-price-name">Enterprise</div>
              <div className="lp-price-amount">Custom</div>
              <div className="lp-price-desc">White-label solution for large publishers and media groups.</div>
              <ul className="lp-price-features">
                <li><span className="lp-price-check">&#10003;</span> Everything in Pro</li>
                <li><span className="lp-price-check">&#10003;</span> White-label branding</li>
                <li><span className="lp-price-check">&#10003;</span> Custom widget types</li>
                <li><span className="lp-price-check">&#10003;</span> Dedicated SSP setup</li>
                <li><span className="lp-price-check">&#10003;</span> API access</li>
                <li><span className="lp-price-check">&#10003;</span> Unlimited team members</li>
                <li><span className="lp-price-check">&#10003;</span> Dedicated account manager</li>
              </ul>
              <a href="mailto:hello@lupon.media" className="lp-price-btn secondary">Contact Sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ INTEGRATIONS ═══ */}
      <section className="lp-integrations" id="integrations">
        <div className="lp-container">
          <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="lp-section-label">Integrations</div>
            <div className="lp-section-title">Works with your stack</div>
            <div className="lp-section-desc" style={{ margin: '0 auto' }}>
              Connect to the tools you already use. Import, export, and sync seamlessly.
            </div>
          </div>
          <div className="lp-int-grid">
            {integrations.map((int, i) => (
              <div key={int.name} className="lp-int-card lp-reveal" style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="lp-int-icon">{int.icon}</div>
                <div>
                  <div className="lp-int-name">{int.name}</div>
                  <div className="lp-int-desc">{int.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="lp-cta">
        <div className="lp-container">
          <div className="lp-reveal">
            <h2>Ready to transform<br />your newsroom?</h2>
            <p>Join hundreds of sports publishers already using Diurna to create, publish, and monetize.</p>
            <div className="lp-cta-form">
              <input
                type="email"
                className="lp-cta-input"
                placeholder="Enter your email"
              />
              <Link href="/register" className="lp-cta-submit" style={{ border: 'none', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <div className="lp-footer-logo">Diurna<b>.</b></div>
              <div className="lp-footer-tagline">
                The AI-powered sports publishing platform by Lupon Media. Create, publish, and monetize — all in one place.
              </div>
            </div>
            <div>
              <div className="lp-footer-col-title">Product</div>
              <a href="#features" className="lp-footer-link">Features</a>
              <a href="#pricing" className="lp-footer-link">Pricing</a>
              <a href="#integrations" className="lp-footer-link">Integrations</a>
              <Link href="/register" className="lp-footer-link">Get Started</Link>
            </div>
            <div>
              <div className="lp-footer-col-title">Company</div>
              <Link href="/site/about" className="lp-footer-link">About</Link>
              <a href="mailto:hello@lupon.media" className="lp-footer-link">Contact</a>
              <a href="#" className="lp-footer-link">Careers</a>
              <a href="#" className="lp-footer-link">Blog</a>
            </div>
            <div>
              <div className="lp-footer-col-title">Resources</div>
              <a href="#" className="lp-footer-link">Documentation</a>
              <a href="#" className="lp-footer-link">API Reference</a>
              <a href="#" className="lp-footer-link">Help Center</a>
              <a href="#" className="lp-footer-link">Status</a>
            </div>
            <div>
              <div className="lp-footer-col-title">Legal</div>
              <Link href="/site/privacy" className="lp-footer-link">Privacy Policy</Link>
              <Link href="/site/impressum" className="lp-footer-link">Impressum</Link>
              <a href="#" className="lp-footer-link">Terms of Service</a>
              <a href="#" className="lp-footer-link">Cookie Policy</a>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <div className="lp-footer-copy">&copy; 2026 Diurna by Lupon Media. All rights reserved.</div>
            <div className="lp-footer-socials">
              <a href="#" className="lp-footer-social" aria-label="Twitter">X</a>
              <a href="#" className="lp-footer-social" aria-label="GitHub">G</a>
              <a href="#" className="lp-footer-social" aria-label="LinkedIn">in</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
