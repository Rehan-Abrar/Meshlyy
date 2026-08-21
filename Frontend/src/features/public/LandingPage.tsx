import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Logo from '../../components/ui/Logo'
import '../../styles/landing.css'


const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay } }),
}
const fadeIn = {
  hidden: { opacity: 0 },
  show: (delay = 0) => ({ opacity: 1, transition: { duration: 0.5, ease: 'easeOut', delay } }),
}

type WaitlistRole = 'Brand' | 'Creator' | ''

function WaitlistForm({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<WaitlistRole>('Brand')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const textColor = dark ? '#fff' : '#111'
  const mutedColor = dark ? 'rgba(255,255,255,0.55)' : '#6B6B6B'
  const inputBg = dark ? 'rgba(255,255,255,0.08)' : '#fff'
  const inputBorder = dark ? 'rgba(255,255,255,0.18)' : '#E6E6E2'
  const inputBorderFocus = dark ? 'rgba(255,255,255,0.5)' : '#2D1B69'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email.'); return }
    if (!role) { setError('Please select your role.'); return }
    setError('')
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: 'center', padding: compact ? '16px 0' : '24px 0' }}
      >
        <div style={{ fontSize: compact ? 18 : 22, fontWeight: 800, color: textColor, marginBottom: 6, letterSpacing: '-0.3px' }}>
          You're on the list.
        </div>
        <div style={{ fontSize: 14, color: mutedColor, lineHeight: 1.6 }}>
          We'll reach out to <strong style={{ color: dark ? 'rgba(255,255,255,0.85)' : '#111' }}>{email}</strong> when Meshlyy opens up.
        </div>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: compact ? 400 : 480 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', fontSize: 14,
            background: inputBg, border: `1.5px solid ${inputBorder}`,
            borderRadius: 999, outline: 'none', color: textColor,
            fontFamily: 'inherit', transition: 'border-color 0.15s',
            boxSizing: 'border-box',
          }}
          onFocus={e => (e.target.style.borderColor = inputBorderFocus)}
          onBlur={e => (e.target.style.borderColor = inputBorder)}
        />
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', fontSize: 14,
            background: inputBg, border: `1.5px solid ${inputBorder}`,
            borderRadius: 999, outline: 'none', color: textColor,
            fontFamily: 'inherit', transition: 'border-color 0.15s',
            boxSizing: 'border-box',
          }}
          onFocus={e => (e.target.style.borderColor = inputBorderFocus)}
          onBlur={e => (e.target.style.borderColor = inputBorder)}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          {(['Brand', 'Creator'] as WaitlistRole[]).map(r => (
            <button
              key={r} type="button"
              onClick={() => setRole(r)}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 999, fontSize: 13.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                border: role === r
                  ? (dark ? '1.5px solid #fff' : '1.5px solid #2D1B69')
                  : `1.5px solid ${inputBorder}`,
                background: role === r
                  ? (dark ? '#fff' : '#2D1B69')
                  : inputBg,
                color: role === r
                  ? (dark ? '#2D1B69' : '#fff')
                  : mutedColor,
              }}
            >
              {r === 'Brand' ? 'I\'m a Brand' : 'I\'m a Creator'}
            </button>
          ))}
        </div>
        {error && <div style={{ fontSize: 12.5, color: '#ef4444', paddingLeft: 4 }}>{error}</div>}
        <button
          type="submit"
          style={{
            width: '100%', padding: '13px 0', borderRadius: 999, fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', border: 'none', transition: 'opacity 0.15s, transform 0.15s',
            background: dark ? '#fff' : '#2D1B69',
            color: dark ? '#2D1B69' : '#fff',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
        >
          Join the waitlist
        </button>
      </div>
    </form>
  )
}

const replacedTools = [
  { old: 'Gmail / DMs', oldSub: 'for creator outreach', new: 'Meshlyy Inbox' },
  { old: 'Google Sheets', oldSub: 'for tracking campaigns', new: 'Meshlyy Campaigns' },
  { old: 'Notion', oldSub: 'for creative briefs', new: 'M AI' },
  { old: 'LinkedIn', oldSub: 'for discovery', new: 'Meshlyy Search' },
  { old: 'DocuSign', oldSub: 'for agreements', new: 'Meshlyy Contracts' },
  { old: 'PayPal / Wire', oldSub: 'for creator payments', new: 'Meshlyy Pay' },
  { old: 'Looker / Sheets', oldSub: 'for performance reporting', new: 'Meshlyy Analytics' },
]

const footerLinks = {
  Platform: ['Platform', 'Use Cases', 'Matching', 'Campaigns'],
  Company: ['About', 'Contact'],
  Legal: ['Privacy', 'Terms'],
}

function FaqItem({ q, a, delay = 0 }: { q: string; a: string; delay?: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      style={{ borderBottom: '1px solid #E6E6E2' }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left', gap: 16 }}
      >
        <span style={{ fontSize: 15.5, fontWeight: 600, color: '#111', lineHeight: 1.4 }}>{q}</span>
        <span style={{ fontSize: 20, color: '#2D1B69', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{ fontSize: 14.5, color: '#6B6B6B', lineHeight: 1.75, margin: '0 0 22px', maxWidth: 580 }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function LandingPage() {
  const [brandSectionHovered, setBrandSectionHovered] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeNavHref, setActiveNavHref] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const navContainerRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const userClickedRef = useRef(false)

  const navLinks = [
    { label: 'Platform', href: '#platform' },
    { label: 'Why Meshlyy', href: '#cases' },
    { label: 'The Marketplace', href: '#marketplace' },
    { label: 'Intelligent Matching', href: '#fit' },
    { label: 'Campaigns', href: '#campaigns' },
    { label: 'FAQ', href: '#faq' },
  ]

  const sectionIds = ['platform', 'cases', 'marketplace', 'fit', 'campaigns', 'faq', 'waitlist']

  // Move the pill indicator to the active link
  const updateIndicator = useCallback((href: string | null) => {
    const container = navContainerRef.current
    const indicator = indicatorRef.current
    if (!container || !indicator) return
    if (!href) {
      indicator.style.opacity = '0'
      return
    }
    const activeEl = container.querySelector<HTMLElement>(`[data-href="${href}"]`)
    if (!activeEl) return
    const containerRect = container.getBoundingClientRect()
    const linkRect = activeEl.getBoundingClientRect()
    indicator.style.opacity = '1'
    indicator.style.width = `${linkRect.width}px`
    indicator.style.left = `${linkRect.left - containerRect.left}px`
  }, [])

  // Sync indicator on active change and resize
  useEffect(() => {
    updateIndicator(activeNavHref)
    const onResize = () => updateIndicator(activeNavHref)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [activeNavHref, updateIndicator])

  // Scroll-position-based active section detection — stable & reliable
  useEffect(() => {
    let scrollEndTimer: ReturnType<typeof setTimeout> | null = null

    const getActiveSectionFromScroll = () => {
      // If user just clicked a nav link, don't override until scrolling stops
      if (userClickedRef.current) return

      const scrollY = window.scrollY
      const viewportHeight = window.innerHeight

      // If near the very top of the page, deactivate all pills
      if (scrollY < 80) {
        setActiveNavHref(null)
        return
      }

      // Find which section's top is closest to 20% down the viewport
      const triggerY = scrollY + viewportHeight * 0.2

      let bestId: string | null = null
      let bestTop = -Infinity

      sectionIds.forEach(id => {
        const el = document.getElementById(id)
        if (!el) return
        const top = el.getBoundingClientRect().top + scrollY
        if (top <= triggerY && top > bestTop) {
          bestTop = top
          bestId = id
        }
      })

      setActiveNavHref(bestId ? `#${bestId}` : null)
    }

    const handleScroll = () => {
      // If user clicked a nav link, wait for scrolling to stop before re-enabling detection
      if (userClickedRef.current) {
        if (scrollEndTimer) clearTimeout(scrollEndTimer)
        scrollEndTimer = setTimeout(() => {
          userClickedRef.current = false
          getActiveSectionFromScroll()
        }, 400)
        return
      }

      getActiveSectionFromScroll()
    }

    // Run once on mount after a short delay so sections have rendered
    const initTimer = setTimeout(getActiveSectionFromScroll, 120)

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      clearTimeout(initTimer)
      if (scrollEndTimer) clearTimeout(scrollEndTimer)
      window.removeEventListener('scroll', handleScroll)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavClick = (href: string) => {
    setActiveNavHref(href)
    // Lock out scroll-detection until scrolling stops
    userClickedRef.current = true
  }

  const [wipeOrigin, setWipeOrigin] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  const triggerWipe = (e: React.MouseEvent, to: string) => {
    e.preventDefault()
    const btn = e.currentTarget as HTMLElement
    const rect = btn.getBoundingClientRect()
    setWipeOrigin({
      x: rect.left,
      y: rect.top,
      w: rect.width,
      h: rect.height,
    })
    setTimeout(() => navigate(to), 1050)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: '#fff' }}>
      {/* Spacer so fixed nav doesn't cover content on mobile */}
      {isMobile && <div style={{ height: 58 }} />}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .nav-link-land {
          font-size: 13px;
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-weight: 400;
          padding: 6px 11px;
          border-radius: 999px;
          line-height: 1;
          position: relative;
          z-index: 2;
          transition: color 0.2s ease;
          white-space: nowrap;
        }
        .nav-link-land:hover {
          color: #fff;
        }
        .nav-link-land.active {
          color: #fff;
          font-weight: 600;
        }
        .nav-links-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0;
          background: rgba(255,255,255,0.08);
          border-radius: 999px;
          padding: 4px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .nav-links-wrapper::-webkit-scrollbar {
          display: none;
        }
        .nav-pill-indicator {
          position: absolute;
          top: 4px;
          left: 0;
          height: calc(100% - 8px);
          background: rgba(255,255,255,0.18);
          border-radius: 999px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
          transition: left 0.3s cubic-bezier(0.16,1,0.3,1), width 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease;
          z-index: 1;
          pointer-events: none;
        }
        .nav-signin {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13.5px;
          color: rgba(255,255,255,0.9);
          text-decoration: none;
          font-weight: 500;
          padding: 0 18px;
          height: 36px;
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,0.6);
          line-height: 1;
          white-space: nowrap;
          transition: background 0.15s, border-color 0.15s;
        }
        .nav-signin:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.9);
        }
        .nav-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13.5px;
          color: #2D1B69;
          text-decoration: none;
          font-weight: 700;
          padding: 0 20px;
          height: 36px;
          background: #fff;
          border-radius: 999px;
          line-height: 1;
          white-space: nowrap;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .nav-cta:hover {
          transform: translateY(-2px);
          box-shadow:
            0 2px 0 rgba(255, 255, 255, 0.7),
            0 5px 0 rgba(255, 255, 255, 0.4),
            0 9px 0 rgba(255, 255, 255, 0.2),
            0 14px 0 rgba(255, 255, 255, 0.08);
        }
        .hero-btn-primary {
          padding: 14px 30px;
          background: #fff;
          color: #2D1B69;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          line-height: 1;
          gap: 7px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
          border: none;
          font-family: inherit;
        }
        .hero-btn-primary:hover {
          transform: translateY(-4px);
          box-shadow:
            0 2px 0 rgba(255, 255, 255, 0.7),
            0 5px 0 rgba(255, 255, 255, 0.5),
            0 9px 0 rgba(255, 255, 255, 0.3),
            0 14px 0 rgba(255, 255, 255, 0.15),
            0 20px 0 rgba(255, 255, 255, 0.06);
        }
        .hero-btn-primary.shadow-trail {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .hero-btn-primary.shadow-trail.purple-trail:hover {
          transform: translateY(-2px);
          box-shadow:
            0 2px 0 rgba(45, 27, 105, 0.5),
            0 5px 0 rgba(45, 27, 105, 0.3),
            0 9px 0 rgba(45, 27, 105, 0.15),
            0 14px 0 rgba(45, 27, 105, 0.06);
        }
        .hero-btn-primary.shadow-trail.purple-trail:active {
          transform: translateY(2px);
          box-shadow: none;
        }
        .hero-btn-primary.shadow-trail:hover {
          transform: translateY(-2px);
          box-shadow:
            0 2px 0 rgba(255, 255, 255, 0.7),
            0 5px 0 rgba(255, 255, 255, 0.4),
            0 9px 0 rgba(255, 255, 255, 0.2),
            0 14px 0 rgba(255, 255, 255, 0.08);
        }
        .hero-btn-primary.shadow-trail:active {
          transform: translateY(2px);
          box-shadow: none;
        }
        .hero-btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 22px;
          height: 50px;
          background: transparent;
          color: #fff;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 500;
          font-family: inherit;
          text-decoration: none;
          line-height: 1;
          border: 2px solid rgba(255,255,255,0.6);
          transition: background 0.15s, border-color 0.15s;
        }
        .hero-btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.9);
        }
        .feature-row {
          display: grid;
          grid-template-columns: 80px 1fr 1.6fr;
          align-items: center;
          gap: 48px;
          padding: 36px 0;
          border-bottom: 1px solid #E6E6E2;
          transition: background 0.2s;
          cursor: default;
        }
        .feature-row:first-child {
          border-top: 1px solid #E6E6E2;
        }
        .feature-row:hover {
          background: rgba(0,0,0,0.015);
          margin: 0 -48px;
          padding-left: 48px;
          padding-right: 48px;
        }
        .feature-row:hover .feature-num {
          color: #2D1B69;
        }
        .feature-row:hover .feature-icon-wrap {
          background: #2D1B69;
          transform: rotate(-4deg) scale(1.06);
        }
        .niche-pill {
          transition: transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s;
          cursor: default;
        }
        .niche-pill:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }
        .usecase-card {
          padding: 36px 32px;
          border: 1px solid #E6E6E2;
          border-radius: 16px;
          background: #fff;
          transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s, border-color 0.2s;
        }
        .usecase-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.07);
          border-color: #d0d0cc;
        }
        .step-cell {
          padding: 40px 32px;
          transition: background 0.2s;
        }
        .step-cell:hover {
          background: rgba(255,255,255,0.04);
        }
        .testimonial-card {
          padding: 28px;
          border: 1px solid #E6E6E2;
          border-radius: 16px;
          transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s;
        }
        .testimonial-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 36px rgba(0,0,0,0.06);
        }
        .pricing-card {
          border-radius: 16px;
          background: #fff;
          padding: 36px 28px;
          position: relative;
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .pricing-card:hover {
          border-color: #2D1B69 !important;
          box-shadow: 0 4px 40px rgba(45,27,105,0.14) !important;
        }
        .pricing-cta {
          display: block;
          text-align: center;
          padding: 12px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.22s ease, color 0.22s ease, border-color 0.22s ease, transform 0.2s cubic-bezier(0.16,1,0.3,1), opacity 0.15s;
        }
        .pricing-cta:hover {
          transform: translateY(-1px);
          opacity: 0.88;
        }
        .footer-link {
          font-size: 13.5px;
          color: rgba(255,255,255,0.45);
          text-decoration: none;
          display: block;
          padding: 3px 0;
          transition: color 0.15s, transform 0.15s;
        }
        .footer-link:hover {
          color: rgba(255,255,255,0.9);
          transform: translateX(3px);
        }
        .replace-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 0;
          transition: opacity 0.2s;
        }
        .replace-row:hover {
          opacity: 1 !important;
        }
        .mobile-menu-toggle {
          display: none;
          background: none;
          border: none;
          color: #fff;
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
        }
        .mobile-menu-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 998;
        }
        .mobile-menu {
          display: none;
          position: fixed;
          top: 0;
          right: -100%;
          width: 80%;
          max-width: 320px;
          height: 100vh;
          background: #2D1B69;
          z-index: 999;
          padding: 80px 32px 32px;
          transition: right 0.3s ease;
          overflow-y: auto;
        }
        .mobile-menu.open {
          right: 0;
        }
        .mobile-menu a {
          display: block;
          color: #fff;
          text-decoration: none;
          padding: 16px 0;
          font-size: 18px;
          font-weight: 500;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .mobile-menu-close {
          position: absolute;
          top: 24px;
          right: 24px;
          background: none;
          border: none;
          color: #fff;
          font-size: 28px;
          cursor: pointer;
        }
        .landing-section {
          padding-left: 48px;
          padding-right: 48px;
          text-align: center;
        }
        .landing-hero-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 0;
        }
        .landing-hero-stat {
          flex: 1;
          min-width: 140px;
          text-align: center;
          padding: 0 24px;
          border-right: 1px solid rgba(255,255,255,0.12);
        }
        .landing-hero-stat:last-child {
          border-right: none;
        }
        .landing-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .landing-niches-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .landing-pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .landing-testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .landing-workflow-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          overflow: hidden;
        }
        .landing-comparison-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }
        .landing-footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 48px;
        }
        .landing-brand-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0;
        }
        @media (max-width: 1024px) {
          .landing-features-grid,
          .landing-pricing-grid,
          .landing-testimonials-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .landing-footer-grid {
            grid-template-columns: 1fr 1fr 1fr;
            gap: 32px;
          }
        }

        @media (max-width: 768px) {
          /* Nav */
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-toggle {
            display: block !important;
          }
          .mobile-menu {
            display: block !important;
          }

          /* Global section padding — handled via isMobile inline */
          nav > div {
            padding: 0 16px !important;
          }
          footer {
            padding: 48px 20px 32px !important;
          }

          /* Typography — all headings via CSS, no inline needed */
          h1 {
            font-size: 30px !important;
            line-height: 1.1 !important;
            letter-spacing: -0.6px !important;
          }
          h2 {
            font-size: 26px !important;
            line-height: 1.12 !important;
            letter-spacing: -0.4px !important;
          }
          h3 {
            font-size: 20px !important;
            letter-spacing: -0.2px !important;
          }

          /* Hero buttons */
          .hero-btn-primary,
          .hero-btn-secondary {
            width: 100%;
            justify-content: center;
            padding: 15px 20px !important;
            font-size: 14px !important;
          }

          /* Feature rows */
          .feature-row {
            grid-template-columns: 36px 1fr !important;
            gap: 12px !important;
            padding: 20px 0 !important;
          }
          .feature-row .feature-third-col {
            display: none;
          }
          .feature-row:hover {
            margin: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          /* Before/With comparison — stack */
          .landing-comparison-grid {
            grid-template-columns: 1fr !important;
          }
          .landing-comparison-grid > div:first-child {
            border-right: none !important;
            border-bottom: 1px solid #E6E6E2 !important;
            padding-right: 0 !important;
            padding-bottom: 28px !important;
            margin-bottom: 28px !important;
          }
          .landing-comparison-grid > div:last-child {
            padding-left: 0 !important;
          }

          /* Footer */
          .landing-footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 24px !important;
          }
          .landing-footer-grid > div:first-child {
            grid-column: 1 / -1;
          }
          footer > div > div:last-child {
            flex-direction: column !important;
            gap: 12px !important;
            align-items: flex-start !important;
          }

          /* Hide large decorative logo/wordmark in hero — show text only */
          .hero-logo-lockup {
            display: none !important;
          }
        }

        @media (max-width: 480px) {
          section {
            padding: 44px 16px !important;
          }          nav > div {
            padding: 0 14px !important;
          }
          h1 {
            font-size: 26px !important;
            letter-spacing: -0.4px !important;
          }
          h2 {
            font-size: 22px !important;
          }
          h3 {
            font-size: 18px !important;
          }
          .feature-row {
            grid-template-columns: 1fr !important;
            gap: 6px !important;
          }
          .feature-row .feature-num {
            display: none !important;
          }
          .landing-footer-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .hero-btn-primary,
          .hero-btn-secondary {
            font-size: 13.5px !important;
          }
        }
      `}</style>

      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'fit-content',
        zIndex: 50,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        background: 'transparent',
        pointerEvents: 'none',
        paddingTop: (!isMobile && scrolled) ? 12 : 0,
        transition: 'padding-top 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{
          width: (!isMobile && scrolled) ? 'calc(100% - 48px)' : '100%',
          maxWidth: (!isMobile && scrolled) ? '1200px' : '100%',
          background: '#2D1B69',
          borderRadius: (!isMobile && scrolled) ? 999 : 0,
          boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.28)' : 'none',
          borderBottom: scrolled ? 'none' : '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'all',
          transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1), max-width 0.4s cubic-bezier(0.16,1,0.3,1), border-radius 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease',
        }}>
          <div style={{ padding: isMobile ? '0 16px' : '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58, gap: 16 }}>

            {/* Logo */}
            <div style={{ flexShrink: 0 }}>
              <button
                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setActiveNavHref(null) }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}
              >
                <Logo size={48} color="#fff" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 15.5, color: '#fff', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>Meshlyy</span>
              </button>
            </div>

            {/* Nav links */}
            <div className="desktop-nav nav-links-wrapper" ref={navContainerRef} style={{ flex: '0 1 auto' }}>
              <div className="nav-pill-indicator" ref={indicatorRef} />
              {navLinks.map(l => (
                <a
                  key={l.label}
                  href={l.href}
                  data-href={l.href}
                  className={`nav-link-land${activeNavHref === l.href ? ' active' : ''}`}
                  onClick={() => handleNavClick(l.href)}
                >
                  {l.label}
                </a>
              ))}
            </div>

            {/* Auth buttons */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              <div className="desktop-nav" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <a
                  href="#waitlist"
                  className="nav-cta"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  Get early access
                </a>
              </div>
              <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>☰</button>
            </div>

          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && <div className="mobile-menu-overlay" onClick={closeMobileMenu} style={{ display: 'block' }} />}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`} style={{ display: mobileMenuOpen ? 'block' : 'none' }}>
        <button className="mobile-menu-close" onClick={closeMobileMenu}>×</button>
        {navLinks.map(l => (
          <a key={l.label} href={l.href} onClick={closeMobileMenu}>{l.label}</a>
        ))}
        <a href="#waitlist" onClick={closeMobileMenu} style={{ display: 'block', color: '#fff', textDecoration: 'none', padding: '16px 0', fontSize: 18, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          Get early access
        </a>
      </div>

      <section style={{ background: '#2D1B69', paddingTop: isMobile ? 52 : 72, paddingBottom: isMobile ? 56 : 64, paddingLeft: isMobile ? 20 : 48, paddingRight: isMobile ? 20 : 48, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 60% 0%, rgba(255,255,255,0.07) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <motion.div
            initial="hidden" animate="show" custom={0} variants={fadeUp}
            className="hero-logo-lockup"
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, marginBottom: 28 }}
          >
            <Logo size={isMobile ? 80 : 168} color="#fff" />
            <span style={{ fontWeight: 800, fontSize: isMobile ? 32 : 52, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1 }}>Meshlyy</span>
          </motion.div>
          <motion.h1
            initial="hidden" animate="show" custom={0.1} variants={fadeUp}
            style={{ fontSize: isMobile ? 30 : 64, fontWeight: 800, color: '#fff', lineHeight: 1.05, margin: '0 0 24px', letterSpacing: isMobile ? '-0.6px' : '-2px' }}
          >
            The creator marketplace<br />for serious brands.
          </motion.h1>
          <motion.p
            initial="hidden" animate="show" custom={0.22} variants={fadeUp}
            style={{ fontSize: isMobile ? 15 : 18, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, margin: '0 0 44px' }}
          >
            Discover, brief, and collaborate with creators. No Gmail threads, spreadsheets, or agency middlemen.
          </motion.p>
          <motion.div
            initial="hidden" animate="show" custom={0.34} variants={fadeUp}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <a href="#waitlist" className="hero-btn-primary">
              Get early access <ArrowRight size={15} strokeWidth={2.5} />
            </a>
          </motion.div>
        </div>
      </section>

      <section id="platform" style={{ background: '#fff', padding: isMobile ? '48px 18px' : '80px 48px', borderBottom: '1px solid #E6E6E2' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: 64 }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2D1B69', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>Platform</div>
            <h2 style={{ fontSize: 42, fontWeight: 800, color: '#111', letterSpacing: '-0.8px', margin: '0 0 14px', lineHeight: 1.1 }}>
              Everything you need to run<br />creator partnerships.
            </h2>
            <p style={{ fontSize: 15, color: '#6B6B6B', margin: 0, maxWidth: 480, lineHeight: 1.7 }}>
              The creator marketing workflow is fragmented across a dozen disconnected tools. Meshlyy consolidates it into one focused workspace.
            </p>
          </motion.div>

          {/* Feature rows */}
          <div style={{ marginBottom: 0 }}>
            {[
              { title: 'Smart Matching', desc: 'Surface creators who actually fit. Based on audience, niche, engagement quality, and campaign goals. Not just follower count.' },
              { title: 'Campaign Management', desc: 'Build briefs, manage deliverables, communicate with creators, and track progress. All in one place.' },
              { title: 'Performance Analytics', desc: 'See what campaigns are doing in real time. Reach, engagement, and outcomes in one dashboard.' },
              { title: 'Secure Payments', desc: 'Handle creator compensation inside the platform with transparent fees and automated invoicing.' },
            ].map((f, i) => (
              <motion.div
                key={i} className="feature-row"
                initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: i * 0.07 }}
              >
                <span className="feature-num" style={{ fontSize: 13, fontWeight: 700, color: '#ccc', fontFamily: 'DM Mono, monospace', letterSpacing: '0.5px', transition: 'color 0.2s' }}>0{i + 1}</span>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: 0, letterSpacing: '-0.4px' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#6B6B6B', margin: 0, lineHeight: 1.7 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Before / With comparison — moved to #cases section */}
        </div>
      </section>


      <section id="cases" style={{ background: 'rgba(45,27,105,0.03)', padding: isMobile ? '48px 18px' : '80px 48px', borderBottom: '1px solid #E6E6E2' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>

          {/* Section header — centered */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: 56, textAlign: 'center' }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2D1B69', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>Why Meshlyy</div>
            <h2 style={{ fontSize: 42, fontWeight: 800, color: '#111', letterSpacing: '-0.8px', margin: '0 0 14px', lineHeight: 1.1 }}>
              You shouldn't need 7 tools<br />to run one campaign.
            </h2>
            <p style={{ fontSize: 15, color: '#6B6B6B', margin: '0 auto', maxWidth: 460, lineHeight: 1.7 }}>
              The creator marketing workflow is stitched together from tools that don't talk to each other. Meshlyy replaces all of them.
            </p>
          </motion.div>

          {/* Before / With comparison — centered */}
          <div className="landing-comparison-grid" style={{ maxWidth: 860, margin: '0 auto 72px' }}>
            <div style={{ borderRight: '1px solid #E6E6E2', paddingRight: isMobile ? 0 : 56 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9b9b9b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 24 }}>Before Meshlyy</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {replacedTools.map((tool, i) => (
                  <div key={i} className="replace-row" style={{ borderBottom: i < replacedTools.length - 1 ? '1px solid #f0f0f0' : 'none', opacity: 0.5 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 12, height: 1.5, background: '#ccc' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: '#666', textDecoration: 'line-through' }}>{tool.old}</div>
                      <div style={{ fontSize: 11.5, color: '#bbb', marginTop: 1 }}>{tool.oldSub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ paddingLeft: isMobile ? 0 : 56 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2D1B69', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 24 }}>With Meshlyy</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {replacedTools.map((tool, i) => (
                  <div key={i} className="replace-row" style={{ borderBottom: i < replacedTools.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(45,27,105,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={14} strokeWidth={2.5} style={{ color: '#2D1B69' }} />
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#111' }}>{tool.new}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Use cases — large editorial rows, not a card grid */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            style={{ marginBottom: 40, textAlign: 'center' }}
          >
            <h3 style={{ fontSize: 28, fontWeight: 800, color: '#111', letterSpacing: '-0.5px', margin: 0, lineHeight: 1.15 }}>
              Built for every kind of collaboration.
            </h3>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #E6E6E2', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
            {[
              {
                num: '01',
                tag: 'Product launches',
                headline: 'Your product. The right creators. Day one.',
                body: "A launch isn't just a post. It's a coordinated moment. The right creators, the right brief, going live together. Meshlyy makes that reproducible.",
              },
              {
                num: '02',
                tag: 'Brand awareness',
                headline: 'More of the right people. Less noise.',
                body: "Follower counts are a distraction. The question is whether their audience is your audience. Meshlyy filters by the signals that actually predict fit.",
              },
              {
                num: '03',
                tag: 'Content creation',
                headline: 'One brief. A library of content you own.',
                body: "Every collaboration produces content. With the right creators, that content doesn't just live on their feed. It becomes yours to use across every channel.",
              },
            ].map((uc, i, arr) => (
              <motion.div
                key={uc.num}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '32px 1fr' : '72px 1fr',
                  gap: 0,
                  alignItems: 'stretch',
                  borderBottom: i < arr.length - 1 ? '1px solid #E6E6E2' : 'none',
                  transition: 'background 0.15s',
                }}
                whileHover={{ backgroundColor: '#fafafa' } as any}
              >
                {/* Number column */}
                <div style={{ padding: isMobile ? '24px 0 24px 16px' : '36px 0 36px 32px', display: 'flex', alignItems: 'flex-start', borderRight: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: isMobile ? 10 : 12, fontWeight: 700, color: '#ccc', fontFamily: 'DM Mono, monospace', letterSpacing: '0.5px' }}>{uc.num}</span>
                </div>
                {/* Main content */}
                <div style={{ padding: isMobile ? '24px 16px' : '36px 40px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#2D1B69', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>{uc.tag}</div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: '#111', letterSpacing: '-0.5px', margin: '0 0 14px', lineHeight: 1.25 }}>{uc.headline}</h3>
                  <p style={{ fontSize: 14.5, color: '#555', margin: 0, lineHeight: 1.7, maxWidth: 520 }}>{uc.body}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* SECTION 4 — Two sides */}
      <section id="marketplace" style={{ background: '#fff', padding: isMobile ? '48px 18px' : '80px 48px', borderBottom: '1px solid #E6E6E2' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: 56 }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2D1B69', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>The Marketplace</div>
            <h2 style={{ fontSize: 42, fontWeight: 800, color: '#111', letterSpacing: '-0.8px', margin: 0, lineHeight: 1.1 }}>
              Two sides. One platform.
            </h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 0 : 2, alignItems: 'stretch' }}>

            {/* For Brands */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
              style={{ position: 'relative', overflow: 'hidden', padding: isMobile ? '40px 24px' : '52px 48px', background: 'rgba(45,27,105,0.04)', borderRadius: isMobile ? '16px 16px 0 0' : '16px 0 0 16px', border: '1px solid rgba(45,27,105,0.1)', display: 'flex', flexDirection: 'column' }}
              onMouseEnter={() => setBrandSectionHovered(true)}
              onMouseLeave={() => setBrandSectionHovered(false)}
            >
              <motion.div
                animate={brandSectionHovered ? { x: 30, y: -20, scale: 1.2 } : { x: 0, y: 0, scale: 1 }}
                transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                style={{ position: 'absolute', width: 400, height: 400, top: -160, right: -120, background: 'radial-gradient(circle, rgba(45,27,105,0.1) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }}
              />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2D1B69', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 32 }}>For Brands</div>
                <h3 style={{ fontSize: 36, fontWeight: 800, color: '#111', letterSpacing: '-0.8px', margin: '0 0 24px', lineHeight: 1.1 }}>
                  Stop searching.<br />Start shortlisting.
                </h3>
                <p style={{ fontSize: 15, color: '#555', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 380 }}>
                  Define what you need. Meshlyy surfaces creators who actually match. By niche, audience, engagement, and content style. Not just whoever has the most followers.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 40 }}>
                  {[
                    { step: '01', label: 'Create a campaign brief' },
                    { step: '02', label: 'Discover matched creators' },
                    { step: '03', label: 'Build a shortlist' },
                    { step: '04', label: 'Launch and measure' },
                  ].map((s, i, arr) => (
                    <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(45,27,105,0.08)' : 'none' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(45,27,105,0.35)', fontFamily: 'DM Mono, monospace', width: 22, flexShrink: 0 }}>{s.step}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* For Creators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
              style={{ padding: isMobile ? '40px 24px' : '52px 48px', background: '#2D1B69', borderRadius: isMobile ? '0 0 16px 16px' : '0 16px 16px 0', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 85% 10%, rgba(255,255,255,0.08) 0%, transparent 55%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 32 }}>For Creators</div>
                <h3 style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '-0.8px', margin: '0 0 24px', lineHeight: 1.1 }}>
                  Build once.<br />Get found forever.
                </h3>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, margin: '0 0 40px', maxWidth: 380 }}>
                  Your profile does the work. Set your niche, rate, and the kind of brands you want to work with. Relevant invitations come to you. No cold pitches, no chasing.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 40 }}>
                  {[
                    { step: '01', label: 'Build your creator profile' },
                    { step: '02', label: 'Get discovered by brands' },
                    { step: '03', label: 'Receive relevant invitations' },
                    { step: '04', label: 'Manage and collaborate' },
                  ].map((s, i, arr) => (
                    <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', fontFamily: 'DM Mono, monospace', width: 22, flexShrink: 0 }}>{s.step}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* SECTION 3 — Built around fit */}
      <section id="fit" style={{ background: 'rgba(45,27,105,0.03)', padding: isMobile ? '48px 18px' : '80px 48px', borderBottom: '1px solid #E6E6E2' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

          {/* Problem narrative */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: 52 }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2D1B69', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>Intelligent Matching</div>
            <h2 style={{ fontSize: isMobile ? 26 : 46, fontWeight: 800, color: '#111', letterSpacing: '-1.1px', margin: '0 0 18px', lineHeight: 1.08 }}>
              Built around fit,<br />not follower count.
            </h2>
            <p style={{ fontSize: 17, color: '#6B6B6B', lineHeight: 1.7, margin: 0, maxWidth: 560 }}>
              Finding a creator isn't difficult. <strong style={{ color: '#111' }}>Finding the right creator is.</strong> Both sides have specific needs. A match only works when both are met.
            </p>
          </motion.div>

          {/* Two-sided requirements — editorial typographic treatment */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 0, marginBottom: 52, border: '1px solid #E6E6E2', borderRadius: 14, overflow: 'hidden' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.05 }}
              style={{ padding: isMobile ? '28px 24px' : '36px 40px', borderRight: isMobile ? 'none' : '1px solid #E6E6E2', borderBottom: isMobile ? '1px solid #E6E6E2' : 'none', background: '#fff' }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9b9b9b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 24 }}>A brand needs a creator who fits their</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {['Audience demographics', 'Content niche', 'Campaign goals', 'Budget range', 'Location', 'Content style'].map((t, i, arr) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2D1B69', opacity: 0.5, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>{t}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.12 }}
              style={{ padding: isMobile ? '28px 24px' : '36px 40px', background: '#fafafa' }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9b9b9b', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 24 }}>A creator needs a brand that fits their</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {['Content niche', 'Audience type', 'Creative style', 'Personal interests', 'Goals and values'].map((t, i, arr) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #eee' : 'none' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2D1B69', opacity: 0.5, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>{t}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Bridge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.18 }}
            style={{ marginBottom: 64, padding: '24px 32px', background: '#111', borderRadius: 12 }}
          >
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 4px' }}>
              Too often, the right people never find each other.
            </p>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.2px' }}>
              Meshlyy evaluates signals across both sides to surface partnerships that actually make sense.
            </p>
          </motion.div>

          {/* Matching diagram — horizontal on desktop, vertical on mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}
          >
            {isMobile ? (
              /* ── MOBILE: vertical layout ── */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%', maxWidth: 320 }}>

                {/* Signal pills — stacked, each with dot + line going down */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>
                  {['Audience', 'Niche', 'Content', 'Location', 'Engagement', 'Goals', 'Brand Fit'].map((sig, i, arr) => (
                    <motion.div
                      key={sig}
                      initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.04 * i }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
                    >
                      {/* Pill row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px', width: '100%', justifyContent: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2D1B69', flexShrink: 0, boxShadow: '0 0 0 3px rgba(45,27,105,0.15)' }} />
                        <div style={{ padding: '8px 18px', background: '#fff', border: '1px solid #E6E6E2', borderRadius: 999, fontSize: 13, fontWeight: 600, color: '#333', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                          {sig}
                        </div>
                      </div>
                      {/* Vertical connector line below pill */}
                      {i < arr.length - 1 && (
                        <div style={{ width: 1.5, height: 16, background: 'rgba(45,27,105,0.2)', margin: '2px 0' }} />
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Trunk line into logo */}
                <div style={{ width: 1.5, height: 24, background: 'rgba(45,27,105,0.3)' }} />

                {/* Logo node */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
                  style={{ width: 88, height: 88, borderRadius: '50%', background: '#2D1B69', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 8px rgba(45,27,105,0.07), 0 0 0 16px rgba(45,27,105,0.04), 0 12px 40px rgba(45,27,105,0.38)', zIndex: 3 }}
                >
                  <Logo size={44} color="#fff" />
                </motion.div>

                {/* Trunk line out of logo */}
                <div style={{ width: 1.5, height: 24, background: 'rgba(45,27,105,0.3)' }} />

                {/* Output pill */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                  style={{ padding: '14px 28px', background: '#2D1B69', borderRadius: 999, fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px', whiteSpace: 'nowrap', boxShadow: '0 6px 28px rgba(45,27,105,0.38)', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
                  Potential Match
                </motion.div>
              </div>
            ) : (
              /* ── DESKTOP: original horizontal layout ── */
              <>
                {/* Left signals */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', zIndex: 2 }}>
                    {['Audience', 'Niche', 'Content', 'Location', 'Engagement', 'Goals', 'Brand Fit'].map((sig, i) => (
                      <motion.div
                        key={sig}
                        initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.05 * i }}
                        style={{ height: 48, display: 'flex', alignItems: 'center' }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2D1B69', flexShrink: 0, boxShadow: '0 0 0 3px rgba(45,27,105,0.15)' }} />
                        <div style={{ width: 16, height: 1.5, background: 'rgba(45,27,105,0.25)', flexShrink: 0 }} />
                        <div style={{ padding: '7px 16px', background: '#fff', border: '1px solid #E6E6E2', borderRadius: 999, fontSize: 13, fontWeight: 600, color: '#333', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                          {sig}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <svg width="72" height={7 * 48} viewBox={`0 0 72 ${7 * 48}`} fill="none" style={{ flexShrink: 0, overflow: 'visible' }}>
                    {[0,1,2,3,4,5,6].map(i => {
                      const y = i * 48 + 24
                      const midY = 3 * 48 + 24
                      return (
                        <g key={i}>
                          <line x1="0" y1={y} x2="48" y2={y} stroke="rgba(45,27,105,0.2)" strokeWidth="1.5" />
                          {i !== 3 && <line x1="48" y1={y} x2="48" y2={midY} stroke="rgba(45,27,105,0.2)" strokeWidth="1.5" />}
                        </g>
                      )
                    })}
                    <line x1="48" y1={3*48+24} x2="72" y2={3*48+24} stroke="rgba(45,27,105,0.35)" strokeWidth="1.5" />
                    <circle cx="48" cy={3*48+24} r="3.5" fill="#2D1B69" opacity="0.4" />
                  </svg>
                </div>

                {/* Logo node */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
                  style={{ width: 112, height: 112, borderRadius: '50%', background: '#2D1B69', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 0 10px rgba(45,27,105,0.07), 0 0 0 20px rgba(45,27,105,0.04), 0 16px 56px rgba(45,27,105,0.38)', zIndex: 3 }}
                >
                  <Logo size={58} color="#fff" />
                </motion.div>

                {/* Output */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <svg width="72" height={7 * 48} viewBox={`0 0 72 ${7 * 48}`} fill="none" style={{ flexShrink: 0 }}>
                    <line x1="0" y1={3*48+24} x2="72" y2={3*48+24} stroke="rgba(45,27,105,0.35)" strokeWidth="1.5" />
                    <circle cx="4" cy={3*48+24} r="3.5" fill="#2D1B69" opacity="0.4" />
                  </svg>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                    style={{ padding: '14px 28px', background: '#2D1B69', borderRadius: 999, fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.2px', whiteSpace: 'nowrap', boxShadow: '0 6px 28px rgba(45,27,105,0.38)', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
                    Potential Match
                  </motion.div>
                </div>
              </>
            )}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ fontSize: 15, color: '#9b9b9b', marginTop: 52, fontStyle: 'italic', textAlign: 'center' }}
          >
            Better signals. Better matches. Better collaborations.
          </motion.p>
        </div>
      </section>

      {/* SECTION 5 — Campaigns */}
      <section id="campaigns" style={{ background: '#fff', padding: isMobile ? '48px 18px' : '80px 48px', borderBottom: '1px solid #E6E6E2' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
            style={{ marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2D1B69', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>Campaigns</div>
            <h2 style={{ fontSize: isMobile ? 26 : 46, fontWeight: 800, color: '#111', letterSpacing: '-1.1px', margin: 0, lineHeight: 1.08 }}>
              Turn a match into<br />a real collaboration.
            </h2>
            <p style={{ fontSize: 15, color: '#6B6B6B', margin: 0, maxWidth: 480, lineHeight: 1.7 }}>
              Once a fit is identified, Meshlyy gives both sides the tools to move from discovery to live collaboration.
            </p>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.05 }}
              style={{ padding: isMobile ? '28px 24px' : '36px', background: 'rgba(45,27,105,0.05)', borderRadius: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#2D1B69', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 16 }}>For Brands</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111', letterSpacing: '-0.3px', marginBottom: 20 }}>Create. Discover. Shortlist. Collaborate.</div>
              <p style={{ fontSize: 14, color: '#6B6B6B', lineHeight: 1.7, margin: '0 0 24px' }}>
                Create campaigns, define requirements, discover potential creators, and move toward collaboration.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {['Create Campaign', 'Creator Discovery', 'Shortlist', 'Connection', 'Collaboration'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid rgba(45,27,105,0.1)' : 'none' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#2D1B69', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#333' }}>{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.12 }}
              style={{ padding: isMobile ? '28px 24px' : '36px', background: '#2D1B69', borderRadius: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 16 }}>For Creators</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', marginBottom: 20 }}>Discover. Apply. Connect. Collaborate.</div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: '0 0 24px' }}>
                Find relevant campaigns, express interest, connect with brands, and manage opportunities.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {['Discover Campaigns', 'Express Interest', 'Connect with Brands', 'Manage Invitations', 'Collaborate'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ background: '#fff', padding: isMobile ? '48px 18px' : '80px 48px', borderBottom: '1px solid #E6E6E2' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
            style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2D1B69', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>FAQ</div>
            <h2 style={{ fontSize: isMobile ? 26 : 46, fontWeight: 800, color: '#111', letterSpacing: '-1.1px', margin: 0, lineHeight: 1.08 }}>Questions? We've got you.</h2>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { q: 'What is Meshlyy?', a: 'Meshlyy is a creator-brand collaboration platform that helps brands and creators discover relevant partnerships through intelligent matching.' },
              { q: 'Who is Meshlyy for?', a: 'Meshlyy is built for both sides of the creator economy. Brands looking for creators and creators looking for brand opportunities.' },
              { q: "How does Meshlyy's matching work?", a: 'Meshlyy considers relevant information such as niche, audience, location, engagement, content, campaign goals, and other factors to help identify potential fits.' },
              { q: 'Is Meshlyy available in Pakistan?', a: 'Yes. Meshlyy is initially focused on the Pakistani market.' },
              { q: 'Can creators join Meshlyy?', a: 'Yes. Creators can build their profiles, showcase their work, discover relevant opportunities, and connect with brands.' },
              { q: 'Can brands find creators on Meshlyy?', a: 'Yes. Brands can define their campaign requirements and discover creators who may be relevant to their campaigns.' },
              { q: 'How do collaborations work?', a: 'Brands and creators discover each other, connect around relevant opportunities, and move toward a collaboration through Meshlyy.' },
            ].map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} delay={i * 0.06} />
            ))}
          </div>
        </div>
      </section>

      {/* ── original final CTA (kept) ── */}
      {/* WAITLIST */}
      <section id="waitlist" style={{ background: '#2D1B69', padding: isMobile ? '64px 20px' : '80px 48px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', marginBottom: 24 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Early access</span>
            </div>
            <h2 style={{ fontSize: isMobile ? 28 : 40, fontWeight: 800, color: '#fff', letterSpacing: '-0.8px', margin: '0 0 12px', lineHeight: 1.1 }}>
              Meshlyy is coming.
            </h2>
            <p style={{ fontSize: isMobile ? 14 : 16, color: 'rgba(255,255,255,0.6)', margin: '0 0 36px', lineHeight: 1.7 }}>
              Be the first to know when we launch. Join the waitlist and we'll reach out when it's ready.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <WaitlistForm dark />
            </div>
          </motion.div>
        </div>
      </section>

      <footer style={{ background: '#0a0a0a', padding: '48px 48px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="landing-footer-grid" style={{ marginBottom: 40, paddingBottom: 36, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <Logo size={28} color="#fff" />
                <span style={{ fontWeight: 700, fontSize: 15.5, color: '#fff', letterSpacing: '-0.3px' }}>Meshlyy</span>
              </div>
              <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, margin: '0 0 24px', maxWidth: 280 }}>
                The modern influencer marketing platform. Connecting brands with creators who care about their work.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
              {['L', 'I'].map((s, idx) => (
                  <a key={s} href="#" title={idx === 0 ? 'LinkedIn' : 'Instagram'} style={{ width: 34, height: 34, borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 12, fontWeight: 600, transition: 'border-color 0.15s, color 0.15s, transform 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 18 }}>{category}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {links.map(link => (
                    <a key={link} href="#" className="footer-link">{link}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.2)' }}>© 2025 Meshlyy, Inc. All rights reserved.</div>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacy', 'Terms', 'Cookies'].map(l => (
                <a key={l} href="#" style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.25)')}
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Full-screen wipe overlay — pill expands from button */}
      <AnimatePresence>
        {wipeOrigin && (() => {
          const vw = window.innerWidth
          const vh = window.innerHeight
          // How much we need to scale to cover the full screen
          const scaleX = (vw * 2.2) / wipeOrigin.w
          const scaleY = (vh * 2.2) / wipeOrigin.h
          const scale = Math.max(scaleX, scaleY)
          return (
            <motion.div
              key="wipe"
              initial={{ scaleX: 1, scaleY: 1, opacity: 1 }}
              animate={{ scaleX: scale, scaleY: scale, opacity: 1 }}
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed',
                top: wipeOrigin.y,
                left: wipeOrigin.x,
                width: wipeOrigin.w,
                height: wipeOrigin.h,
                borderRadius: 999,
                background: '#fff',
                zIndex: 9999,
                pointerEvents: 'none',
                transformOrigin: 'center',
              }}
            />
          )
        })()}
      </AnimatePresence>

    </div>
  )
}
