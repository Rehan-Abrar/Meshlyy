import { useState, useRef, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuroraBackground from '../../components/common/AuroraBackground';
import Button from '../../components/common/Button';
import { apiClient } from '../../utils/apiClient';
import logo from '../../assets/logo.png';
import logoHero from '../../assets/logo-hero.png';
import img1 from '../../assets/website/1.png';
import img4 from '../../assets/website/4.png';
import img6 from '../../assets/website/6.png';
import img8 from '../../assets/website/8.png';
import img9 from '../../assets/website/9.png';
import img10 from '../../assets/website/10.png';
import img11 from '../../assets/website/11.png';
import shahveerPhoto from '../../assets/partners/shahveer.jpg';
import dayyanPhoto from '../../assets/partners/dayyan.jpg';
import jafPerfumesPhoto from '../../assets/partners/jaf_perfumes.jpg';
import zeroDegreePhoto from '../../assets/partners/0degree.jpg';
import styles from './LandingPage.module.css';

/* ─── Sub-components ─────────────────────────────────────────── */

const MARQUEE_ITEMS = [
  'AI Fit Scoring', 'Instagram', 'TikTok', 'YouTube', 'Brand Safety',
  'ROI Analytics', 'Creator Discovery', 'Campaign Co-pilot', 'Real-Time Matching',
];

const MARKET_STATS = [
  { number: '$1.5B+', label: 'Creator-commerce opportunity' },
  { number: '250K+', label: 'Regular creators in Pakistan' },
  { number: '2M+', label: 'Brands and SMEs' },
  { number: '80M+', label: 'Social media users' },
];

const FEATURED_CREATORS = [
  {
    initials: 'SJ',
    name: 'Shahveer Jafry',
    photo: shahveerPhoto,
    niche: 'Fashion · Lifestyle',
    stat: '4.3M',
    sub: 'followers · 667K avg views/post',
    variant: 'violet',
  },
  {
    initials: 'DY',
    name: 'Dayyan',
    photo: dayyanPhoto,
    niche: 'Entertainment · Viral',
    stat: '1.6M',
    sub: 'avg views/video · 500K+ followers',
    variant: 'cyan',
  },
];

const MORE_CREATORS = [
  { name: 'Rubab Malik', stat: '45K', niche: 'Fashion' },
  { name: 'Meerab Fatima', stat: '29K', niche: 'Fashion' },
  { name: 'Mahnoor Waseem', stat: '14K', niche: 'Beauty' },
  { name: 'Hadia Afzal', stat: '6.6K', niche: 'Lifestyle' },
  { name: 'Irta', stat: '', niche: 'Art' },
  { name: 'Minahil Faisal', stat: '', niche: 'Fashion' },
  { name: 'Habiba Kaneez', stat: '', niche: 'Lifestyle' },
  { name: 'Saud Sheikh', stat: '', niche: 'Content' },
  { name: 'Abdullah Sultan', stat: '', niche: 'Creative' },
  { name: 'Rana Nasrullah', stat: '', niche: 'Food' },
  { name: 'Aun Laique', stat: '', niche: 'Lifestyle' },
];

const FEATURED_BRANDS = [
  { initials: 'JAF', name: 'JAF Perfumes', photo: jafPerfumesPhoto, cat: 'Fragrance · Beauty' },
  { initials: '0°', name: 'Zero Degree', photo: zeroDegreePhoto, cat: 'Food · F&B' },
];

const BRAND_BENTO = [
  { label: 'Discovery', title: '40+ match signals', desc: 'Audience quality, brand affinity, content style — scored in one view.' },
  { label: 'Speed', title: '10 min shortlists', desc: 'Skip the DM chaos. Start with ranked creators who actually fit.' },
  { label: 'Analytics', title: 'Real-time ROI', desc: 'Track engagement and reach before you sign a deal.' },
  { label: 'Co-pilot', title: 'AI briefs', desc: 'Smart brief generation and campaign strategy built in.' },
];

const CREATOR_BENTO = [
  { label: 'Matches', title: 'Brand-fit recs', desc: 'Get surfaced to brands that align with your niche and audience.' },
  { label: 'Pitch', title: 'AI assistant', desc: 'Write sharper proposals and content ideas in minutes.' },
  { label: 'Campaigns', title: 'Exclusive deals', desc: 'Access brand campaigns you won\'t find in DMs.' },
  { label: 'Profile', title: 'Trust signals', desc: 'Verified stats brands actually believe.' },
];

const EARLY_BRANDS = [
  { name: 'Gen', cat: 'Fashion' },
  { name: 'Void Leather', cat: 'Leather · Fashion' },
  { name: 'MN Textile', cat: 'Textile · Fashion' },
  { name: 'Wear Howl', cat: 'Fashion' },
  { name: 'Blush × Beads', cat: 'Beauty · Accessories' },
  { name: 'Black Studio', cat: 'Creative · Fashion' },
  { name: 'Meatex Executive', cat: 'F&B · Dining' },
  { name: 'Grance Cosmetics', cat: 'Cosmetics · Beauty' },
];

const PARALLAX_TRAVEL_RATIO = 0.16;
const PARALLAX_MIN_SCALE = 100;
const PARALLAX_MAX_SCALE = 102;

const ParallaxSection = ({
  className = '',
  imageKey,
  imageSrc = null,
  overlayTone = 'default',
  children,
  ...rest
}) => (
  <section
    data-parallax-section
    className={`${styles.parallaxSection} ${className}`}
    {...rest}
  >
    <div className={styles.parallaxBg} aria-hidden="true">
      {imageSrc ? (
        <img src={imageSrc} alt="" className={styles.parallaxImg} loading="lazy" />
      ) : (
        <div className={`${styles.parallaxPlaceholder} ${styles[`parallaxPlaceholder--${imageKey}`]}`} />
      )}
      <div className={`${styles.parallaxOverlay} ${styles[`parallaxOverlay--${overlayTone}`]}`} />
    </div>
    <div className={styles.parallaxContent}>{children}</div>
  </section>
);

const Reveal = ({ children, className = '', delay = 0 }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.revealVisible : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const StatPill = ({ number, label }) => (
  <div className={styles.statPill}>
    <span className={styles.statNumber}>{number}</span>
    <span className={styles.statLabel}>{label}</span>
  </div>
);

const StepCard = ({ number, title, desc }) => (
  <div className={styles.stepCard}>
    <div className={styles.stepNumber}>{number}</div>
    <h3 className={styles.stepTitle}>{title}</h3>
    <p className={styles.stepDesc}>{desc}</p>
  </div>
);

const FeatureCard = ({ icon, title, desc }) => (
  <div className={styles.featureCard}>
    <div className={styles.featureCardIcon}>{icon}</div>
    <h3 className={styles.featureCardTitle}>{title}</h3>
    <p className={styles.featureCardDesc}>{desc}</p>
  </div>
);

const AudienceBento = ({ activeTab, onTabChange, onCta }) => {
  const isBrand = activeTab === 'brand';
  const tiles = isBrand ? BRAND_BENTO : CREATOR_BENTO;

  return (
    <div className={styles.audienceBento}>
      <div className={styles.audienceTabs} role="tablist" aria-label="Choose your side">
        <button
          type="button"
          role="tab"
          aria-selected={isBrand}
          className={`${styles.audienceTab} ${isBrand ? styles.audienceTabActive : ''} ${styles['audienceTab--brand']}`}
          onClick={() => onTabChange('brand')}
        >
          For Brands
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!isBrand}
          className={`${styles.audienceTab} ${!isBrand ? styles.audienceTabActive : ''} ${styles['audienceTab--creator']}`}
          onClick={() => onTabChange('creator')}
        >
          For Creators
        </button>
      </div>

      <div
        className={`${styles.audienceBentoGrid} ${isBrand ? styles['audienceBentoGrid--brand'] : styles['audienceBentoGrid--creator']}`}
        role="tabpanel"
      >
        <div className={`${styles.bentoHero} ${isBrand ? styles['bentoHero--brand'] : styles['bentoHero--creator']}`}>
          <span className={styles.bentoHeroTag}>{isBrand ? 'Brand superpower' : 'Creator superpower'}</span>
          <h3 className={styles.bentoHeroTitle}>
            {isBrand
              ? 'Turn influencer marketing into a growth machine'
              : 'Get discovered by brands that actually fit you'}
          </h3>
          <p className={styles.bentoHeroDesc}>
            {isBrand
              ? 'One workspace for discovery, vetting, outreach, and ROI — without the spreadsheet chaos.'
              : 'Build a profile brands trust, get matched faster, and land campaigns that fit your voice.'}
          </p>
          <button
            type="button"
            className={`${styles.audienceBtn} ${isBrand ? styles['audienceBtn--brand'] : styles['audienceBtn--creator']}`}
            onClick={onCta}
          >
            {isBrand ? 'Start as a Brand' : 'Join as a Creator'} →
          </button>
        </div>

        {tiles.map((tile, i) => (
          <div
            key={tile.title}
            className={`${styles.bentoTile} ${i === 0 ? styles.bentoTileWide : ''}`}
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            <span className={styles.bentoTileLabel}>{tile.label}</span>
            <h4 className={styles.bentoTileTitle}>{tile.title}</h4>
            <p className={styles.bentoTileDesc}>{tile.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Icons ──────────────────────────────────────────────────── */

const BrainIcon = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const ChartIcon = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18" />
  </svg>
);

const ZapIcon = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

/* ─── Main Component ─────────────────────────────────────────── */

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pageRef = useRef(null);

  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistRole, setWaitlistRole] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');
  const [audienceTab, setAudienceTab] = useState('brand');

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    const sections = root.querySelectorAll('[data-parallax-section]');
    if (!sections.length) return undefined;

    let ticking = false;

    const update = () => {
      const vh = window.innerHeight;
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const total = rect.height + vh;
        const progress = Math.max(0, Math.min(1, (vh - rect.top) / total));
        const travel = rect.height * PARALLAX_TRAVEL_RATIO;
        const yPx = (progress - 0.5) * 2 * travel;
        const scale = PARALLAX_MIN_SCALE + (PARALLAX_MAX_SCALE - PARALLAX_MIN_SCALE) * progress;
        section.style.setProperty('--bg-y', `${yPx.toFixed(1)}px`);
        section.style.setProperty('--bg-zoom', (scale / 100).toFixed(3));
      });
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    setWaitlistError('');
    if (!waitlistEmail.trim()) { setWaitlistError('Please enter your email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(waitlistEmail)) { setWaitlistError('Please enter a valid email address.'); return; }
    setWaitlistLoading(true);
    try {
      await apiClient.post('/waitlist', { email: waitlistEmail.trim(), role: waitlistRole || undefined });
      setWaitlistSuccess(true);
    } catch (err) {
      setWaitlistError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setWaitlistLoading(false);
    }
  };

  if (user) return <Navigate to={`/${user.role}/dashboard`} replace />;

  return (
    <div className={styles.page} ref={pageRef}>

      {/* ── HERO ────────────────────────────────────────── */}
      <AuroraBackground>
        <ParallaxSection className={styles.hero} imageKey="hero" imageSrc={img11} overlayTone="hero" aria-labelledby="hero-headline">
          <div className={styles.heroMesh} aria-hidden="true" />
          <div className={styles.heroInner}>
            <div className={styles.heroContent}>
              <div className={styles.eyebrow}>
                <span className={styles.eyebrowPill}>
                  <span className={styles.eyebrowDot} />
                  AI-Powered Influencer Marketing
                </span>
              </div>

              <h1 id="hero-headline" className={styles.heroHeadline}>
                Where Brands<br />
                <span className={styles.heroAccent}>Meet Creators</span>
              </h1>

              <p className={styles.heroSub}>
                Find creators who actually fit your brand, scored on audience, content,
                and brand safety. Skip the DMs and spreadsheets. Launch campaigns faster.
              </p>

              <div className={styles.heroCTA}>
                <Button variant="primary" size="lg" onClick={() => navigate('/role-select')}>
                  Get Started Free
                </Button>
                <Button variant="secondary" size="lg" className={styles.heroSignIn} onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              </div>

              <div className={styles.heroNote}>
                <div className={styles.avatarStack} aria-hidden="true">
                  {['SJ', 'DY', 'RM', 'JP'].map((initials) => (
                    <span key={initials} className={styles.avatar}>{initials}</span>
                  ))}
                </div>
                <span>Early access open</span>
                <span className={styles.heroNoteSep}>·</span>
                <span className={styles.heroNoteDot} />
                <span>30-day free trial</span>
              </div>

              <div className={styles.statsGlass}>
                <StatPill number="40+" label="Match Signals" />
                <div className={styles.statDivider} />
                <StatPill number="10 min" label="To Shortlist" />
                <div className={styles.statDivider} />
                <StatPill number="30 days" label="Free Trial" />
              </div>
            </div>

            <div className={styles.heroVisual}>
              <div className={styles.heroLogoWrap}>
                <img src={logoHero} alt="Meshlyy" className={styles.heroLogo} loading="lazy" aria-hidden="true" />
                <div className={styles.heroGlowRing} aria-hidden="true" />
              </div>

              {/* Floating proof cards */}
              <div className={`${styles.floatCard} ${styles.floatCardTop}`} aria-hidden="true">
                <span className={styles.floatCardIcon}>✦</span>
                <span className={styles.floatCardText}>Live API <strong>verification</strong></span>
              </div>
              <div className={`${styles.floatCard} ${styles.floatCardBottom}`} aria-hidden="true">
                <span className={styles.floatCardIcon}>↑</span>
                <span className={styles.floatCardText}>1 week → <strong>10 min</strong></span>
              </div>
              <div className={`${styles.floatCard} ${styles.floatCardMid}`} aria-hidden="true">
                <span className={styles.floatCardIcon}>⚡</span>
                <span className={styles.floatCardText}>1 person, not <strong>4–5</strong></span>
              </div>
            </div>
          </div>
        </ParallaxSection>
      </AuroraBackground>

      {/* ── MARQUEE ─────────────────────────────────────── */}
      <div className={styles.marqueeWrap} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={`${item}-${i}`} className={styles.marqueeItem}>
              <span className={styles.marqueeDot} />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── MARKET CONTEXT ────────────────────────────── */}
      <ParallaxSection
        className={styles.marketSection}
        imageKey="market"
        imageSrc={img4}
        aria-labelledby="market-heading"
      >
        <div className={styles.sectionInner}>
          <Reveal>
            <div className={styles.sectionLabel}>Why Meshlyy</div>
            <h2 id="market-heading" className={styles.sectionHeadline}>
              Pakistan's creator economy is ready for better tools
            </h2>
            <p className={styles.sectionSub}>
              80M+ users and a $1.5B+ market — yet Pakistan still holds less than 1% of global
              creator commerce. Most partnerships still start in inboxes and end in guesswork.
              Meshlyy brings verified data in between.
            </p>
          </Reveal>

          <div className={styles.marketGrid}>
            {MARKET_STATS.map((item, i) => (
              <Reveal key={item.label} delay={i * 60}>
                <div className={styles.marketCard}>
                  <div className={styles.marketNumber}>{item.number}</div>
                  <div className={styles.marketLabel}>{item.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className={styles.marketTagline}>
            <strong>Big opportunity.</strong> Smarter way to match.
          </p>
        </div>
      </ParallaxSection>

      {/* ── AUDIENCE SPLIT ──────────────────────────────── */}
      <section className={styles.audienceSection} aria-labelledby="audience-heading">
        <div className={styles.sectionInner}>
          <Reveal>
            <div className={styles.sectionLabel}>Built for both sides</div>
            <h2 id="audience-heading" className={styles.sectionHeadline}>
              One platform. Two superpowers.
            </h2>
            <p className={styles.sectionSub}>
              Whether you're growing a brand or building a creator career, Meshlyy gives you an unfair advantage.
            </p>
          </Reveal>

          <Reveal delay={100}>
            <AudienceBento
              activeTab={audienceTab}
              onTabChange={setAudienceTab}
              onCta={() => navigate('/role-select')}
            />
          </Reveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <ParallaxSection
        className={styles.howSection}
        imageKey="how"
        imageSrc={img1}
        aria-labelledby="how-heading"
      >
        <div className={styles.howBg} aria-hidden="true" />
        <div className={styles.sectionInner}>
          <Reveal>
            <div className={styles.sectionLabel}>How It Works</div>
            <h2 id="how-heading" className={styles.sectionHeadline}>
              From sign-up to deal — in minutes
            </h2>
            <p className={styles.sectionSub}>
              Meshlyy removes the friction from influencer partnerships. Here's how simple it is.
            </p>
          </Reveal>

          <div className={styles.stepsGrid}>
            <StepCard
              number="01"
              title="Create your profile"
              desc="Set up your brand or creator profile in under 5 minutes. Tell us your niche, goals, and audience."
            />
            <div className={styles.stepConnector} aria-hidden="true" />
            <StepCard
              number="02"
              title="Get AI-matched"
              desc="Our model scores 40+ signals — audience quality, brand affinity, content style — to surface your top matches instantly."
            />
            <div className={styles.stepConnector} aria-hidden="true" />
            <StepCard
              number="03"
              title="Close the deal"
              desc="Connect, negotiate, and launch campaigns directly in the platform. Track performance in real-time."
            />
          </div>
        </div>
      </ParallaxSection>

      {/* ── FEATURES ────────────────────────────────────── */}
      <ParallaxSection
        className={styles.featuresSection}
        imageKey="features"
        imageSrc={img10}
        aria-labelledby="features-heading"
      >
        <div className={styles.sectionInner}>
          <Reveal>
            <div className={styles.sectionLabel}>The Tech</div>
            <h2 id="features-heading" className={styles.sectionHeadline}>
              AI that does the heavy lifting
            </h2>
          </Reveal>

          <div className={styles.featuresGrid}>
            <FeatureCard
              icon={<BrainIcon />}
              title="AI Fit Scoring"
              desc="Every brand-creator pair gets a precision match score built from 40+ signals: audience demographics, engagement quality, brand safety, content style, and historical performance."
            />
            <FeatureCard
              icon={<ChartIcon />}
              title="Real-Time Analytics"
              desc="Track engagement, reach, and ROI before you sign a deal. Data-first decisions — not gut feel. See exactly which partnerships move the needle."
            />
            <FeatureCard
              icon={<ZapIcon />}
              title="Campaign Co-pilot"
              desc="AI-powered brief generation, optimization suggestions, and content strategy built into every campaign. Less grunt work, more impact."
            />
            <FeatureCard
              icon={<ShieldIcon />}
              title="Brand Safety Layer"
              desc="Automated content scanning and creator vetting catches red flags before they become problems. Every partnership is protected."
            />
          </div>
        </div>
      </ParallaxSection>

      {/* ── COMPARE ─────────────────────────────────────── */}
      <section className={styles.compareSection} aria-labelledby="compare-heading">
        <div className={styles.sectionInner}>
          <div className={styles.compareLayout}>
            <div className={styles.compareCopy}>
              <Reveal>
                <div className={styles.sectionLabel}>Speed</div>
                <h2 id="compare-heading" className={styles.sectionHeadline}>
                  Stop spending a week finding the right creator
                </h2>
                <p className={styles.sectionSub}>
                  What used to take days of outreach and spreadsheet chaos now starts with a ranked shortlist in minutes.
                </p>
              </Reveal>

              <div className={styles.compareGrid}>
                <Reveal delay={80}>
                  <div className={`${styles.compareCard} ${styles['compareCard--bad']}`}>
                    <div className={styles.compareTag}>Without Meshlyy</div>
                    <div className={`${styles.compareTime} ${styles['compareTime--bad']}`}>1 week</div>
                    <div className={styles.compareFacts}>
                      <div className={styles.compareFact}>
                        4–5 people search, DM, compare
                        <span>Screenshots instead of verified signals</span>
                      </div>
                      <div className={styles.compareFact}>
                        Spreadsheets instead of ranked fit
                        <span>No trust signal on audience quality</span>
                      </div>
                    </div>
                  </div>
                </Reveal>
                <Reveal delay={160}>
                  <div className={`${styles.compareCard} ${styles['compareCard--good']}`}>
                    <div className={styles.compareTag}>With Meshlyy</div>
                    <div className={`${styles.compareTime} ${styles['compareTime--good']}`}>10 min</div>
                    <div className={styles.compareFacts}>
                      <div className={styles.compareFact}>
                        1 person starts with a shortlist
                        <span>Trust signals inside each profile</span>
                      </div>
                      <div className={styles.compareFact}>
                        Workflow continues from the same place
                        <span>Ranked creators with brand safety checks</span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>

            <Reveal delay={120} className={styles.compareVisualWrap}>
              <div className={styles.compareVisual}>
                <img src={img8} alt="" className={styles.compareImage} loading="lazy" />
                <div className={styles.compareImageGlow} aria-hidden="true" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── TRUST / PROOF ───────────────────────────────── */}
      <ParallaxSection
        className={styles.trustSection}
        imageKey="trust"
        imageSrc={img9}
        aria-labelledby="trust-heading"
      >
        <div className={styles.sectionInner}>
          <Reveal>
            <div className={styles.sectionLabel}>Who's on Meshlyy</div>
            <h2 id="trust-heading" className={styles.sectionHeadline}>
              Creators and brands already building here
            </h2>
            <p className={styles.sectionSub}>
              From fashion and lifestyle to F&B and beauty — real profiles, real campaigns, early access.
            </p>
          </Reveal>

          <div className={styles.featuredCreators}>
            {FEATURED_CREATORS.map((creator, i) => (
              <Reveal key={creator.name} delay={i * 80}>
                <article className={`${styles.featuredCreator} ${styles[`featuredCreator--${creator.variant}`]}`}>
                  <div className={styles.featuredTop}>
                    {creator.photo ? (
                      <img src={creator.photo} alt="" className={styles.featuredAvatarImg} loading="lazy" />
                    ) : (
                      <span className={styles.featuredAvatar}>{creator.initials}</span>
                    )}
                    <div>
                      <div className={styles.featuredName}>{creator.name}</div>
                      <div className={styles.featuredNiche}>{creator.niche}</div>
                    </div>
                  </div>
                  <div className={styles.featuredStat}>{creator.stat}</div>
                  <div className={styles.featuredSub}>{creator.sub}</div>
                </article>
              </Reveal>
            ))}
          </div>

          <div className={styles.creatorChips}>
            {MORE_CREATORS.map((creator) => (
              <span key={creator.name} className={styles.creatorChip}>
                {creator.name}
                {creator.stat && <span className={styles.creatorChipStat}>{creator.stat}</span>}
                <span className={styles.creatorChipTag}>{creator.niche}</span>
              </span>
            ))}
          </div>

          <div className={styles.brandSection}>
            <div className={styles.brandSectionLabel}>Brands on the platform</div>
            <div className={styles.brandFeaturedRow}>
              {FEATURED_BRANDS.map((brand) => (
                <div key={brand.name} className={`${styles.brandCard} ${styles['brandCard--featured']}`}>
                  {brand.photo ? (
                    <img src={brand.photo} alt="" className={styles.brandLogoImg} loading="lazy" />
                  ) : (
                    <span className={styles.brandLogo}>{brand.initials}</span>
                  )}
                  <div>
                    <div className={styles.brandName}>{brand.name}</div>
                    <div className={styles.brandCat}>{brand.cat}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.brandGrid}>
              {EARLY_BRANDS.map((brand) => (
                <div key={brand.name} className={styles.brandCard}>
                  <div className={styles.brandName}>{brand.name}</div>
                  <div className={styles.brandCat}>{brand.cat}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ParallaxSection>

      {/* ── PRICING ─────────────────────────────────────── */}
      <ParallaxSection
        className={styles.pricingSection}
        imageKey="pricing"
        aria-labelledby="pricing-heading"
      >
        <div className={styles.sectionInner}>
          <Reveal>
            <div className={styles.sectionLabel}>Pricing</div>
            <h2 id="pricing-heading" className={styles.sectionHeadline}>
              Plans that pay for themselves
            </h2>
            <p className={styles.sectionSub}>
              Both sides pay because both sides reduce risk — one closed deal can cover a full year.
              Start with a 30-day free trial.
            </p>
          </Reveal>

          <div className={styles.pricingGrid}>
            <Reveal delay={80}>
              <div className={styles.pricingCard}>
                <div className={styles.pricingAmount}>$25–35<small>/mo</small></div>
                <div className={styles.pricingTier}>For Brands</div>
                <p className={styles.pricingDesc}>
                  Discover, compare, and launch campaigns with AI-ranked creator shortlists.
                </p>
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className={styles.pricingCard}>
                <div className={styles.pricingAmount}>$15–20<small>/mo</small></div>
                <div className={styles.pricingTier}>For Creators</div>
                <p className={styles.pricingDesc}>
                  Get matched to relevant brands and build a profile brands actually trust.
                </p>
              </div>
            </Reveal>
          </div>
          <p className={styles.pricingNote}>30-day free trial on every plan</p>
        </div>
      </ParallaxSection>

      {/* ── ENDING: WAITLIST + CTA ─────────────────────── */}
      <ParallaxSection
        className={styles.endingSection}
        imageKey="ending"
        imageSrc={img6}
        overlayTone="ending"
        aria-labelledby="ending-heading"
      >
        <div className={styles.endingGrid}>
          <div className={styles.endingCTA}>
            <div className={styles.sectionLabel}>Get Started</div>
            <h2 id="ending-heading" className={styles.endingHeadline}>
              Ready to find your match?
            </h2>
            <p className={styles.endingSub}>
              Join Pakistan's creators and brands building authentic, high-performing partnerships on Meshlyy.
            </p>
            <ul className={styles.endingPerks}>
              <li><span className={styles.endingCheck}>✓</span>30-day free trial</li>
              <li><span className={styles.endingCheck}>✓</span>AI-ranked shortlists</li>
              <li><span className={styles.endingCheck}>✓</span>Verified creator signals</li>
            </ul>
            <div className={styles.endingButtons}>
              <Button variant="primary" size="lg" onClick={() => navigate('/role-select')}>
                Enter the App
              </Button>
              <Button variant="ghost" size="lg" onClick={() => navigate('/login')}>
                Sign In
              </Button>
            </div>
          </div>

          <div className={styles.endingWaitlist}>
            <div className={styles.waitlistCard}>
              <div className={styles.waitlistInner}>
                <div className={styles.sectionLabel}>Early Access</div>
                <h3 className={styles.waitlistHeadline}>Get in before everyone else</h3>
                <p className={styles.waitlistSub}>
                  Join the waitlist for early access, priority matching, and exclusive launch features.
                </p>

                {waitlistSuccess ? (
                  <div className={styles.waitlistSuccessBanner}>
                    <span className={styles.waitlistSuccessIcon}>✓</span>
                    You're on the list — we'll reach out soon.
                  </div>
                ) : (
                  <form className={styles.waitlistForm} onSubmit={handleWaitlistSubmit}>
                    <div className={styles.waitlistRoleToggle}>
                      <button
                        type="button"
                        className={`${styles.roleToggleBtn} ${waitlistRole === 'brand' ? styles.roleToggleActive : ''}`}
                        onClick={() => setWaitlistRole(waitlistRole === 'brand' ? '' : 'brand')}
                      >
                        I'm a Brand
                      </button>
                      <button
                        type="button"
                        className={`${styles.roleToggleBtn} ${waitlistRole === 'influencer' ? styles.roleToggleActive : ''}`}
                        onClick={() => setWaitlistRole(waitlistRole === 'influencer' ? '' : 'influencer')}
                      >
                        I'm a Creator
                      </button>
                    </div>
                    <div className={styles.waitlistInputRow}>
                      <input
                        type="email"
                        className={styles.waitlistInput}
                        placeholder="your@email.com"
                        value={waitlistEmail}
                        onChange={(e) => { setWaitlistEmail(e.target.value); setWaitlistError(''); }}
                        aria-label="Email for waitlist"
                      />
                      <Button variant="primary" type="submit" disabled={waitlistLoading}>
                        {waitlistLoading ? 'Joining…' : 'Join Waitlist'}
                      </Button>
                    </div>
                    {waitlistError && <p className={styles.waitlistErrorText}>{waitlistError}</p>}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </ParallaxSection>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <img src={logo} alt="Meshlyy" className={styles.footerLogo} />
            <span className={styles.footerTagline}>AI-Powered Influencer Marketing</span>
          </div>
          <div className={styles.footerLinks}>
            <button className={styles.footerLink} onClick={() => navigate('/role-select')}>Get Started</button>
            <button className={styles.footerLink} onClick={() => navigate('/login')}>Sign In</button>
          </div>
          <p className={styles.footerCopy}>© {new Date().getFullYear()} Meshlyy. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
