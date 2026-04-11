import { Link } from 'react-router-dom';
import AuroraBackground from '../../components/common/AuroraBackground';
import Button from '../../components/common/Button';
import logo from '../../assets/logo.png';
import styles from './LandingPage.module.css';

const StatPill = ({ number, label }) => (
  <div className={styles.statPill}>
    <span className={styles.statNumber}>{number}</span>
    <span className={styles.statLabel}>{label}</span>
  </div>
);

const FeatureRow = ({ icon, title, desc }) => (
  <div className={styles.featureRow}>
    <div className={styles.featureIcon}>{icon}</div>
    <div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDesc}>{desc}</p>
    </div>
  </div>
);

const LandingPage = () => (
  <div className={styles.page}>

    {/* ── HERO with Aurora ── */}
    <AuroraBackground>
      <section className={styles.hero} aria-labelledby="hero-headline">
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowPill}>✦ AI-Powered Matching</span>
          </div>
          <h1 id="hero-headline" className={styles.heroHeadline}>
            Where Brands<br />
            <span className={styles.heroAccent}>Meet Creators</span>
          </h1>
          <p className={styles.heroSub}>
            Meshlyy uses AI to connect brands with the perfect content creators.
            No guesswork. No agencies. Just precise, data-driven partnerships
            that drive real results.
          </p>
          <div className={styles.heroCTA}>
            <Link to="/role-select">
              <Button variant="primary" size="lg">Get Started Free</Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg">Login</Button>
            </Link>
          </div>
          <div className={styles.stats}>
            <StatPill number="12K+" label="Creators" />
            <StatPill number="3.2K+" label="Brands" />
            <StatPill number="98%"   label="Match Rate" />
          </div>
        </div>
        
        {/* Logo mesh as hero visual moved to right side inside wrapper */}
        <img src={logo} alt="Meshlyy network logo" className={styles.heroLogo} aria-hidden="true" />
      </div>
      </section>
    </AuroraBackground>

    {/* ── HOW IT WORKS ── */}
    <section className={styles.about} aria-labelledby="about-heading">
      <div className={styles.aboutGrid}>
        <div className={styles.aboutLeft}>
          <span className="micro-label">How It Works</span>
          <h2 id="about-heading" className={styles.aboutHeadline}>
            The smartest way to run influencer marketing
          </h2>
        </div>
        <div className={styles.aboutRight}>
          <FeatureRow
            icon="◎"
            title="AI Fit Scoring"
            desc="Our model analyzes 40+ creator signals to produce a precise match score for every brand-creator pair."
          />
          <FeatureRow
            icon="◉"
            title="Real-Time Analytics"
            desc="Track engagement, reach, and ROI before you sign a deal. Data-first decisions only."
          />
          <FeatureRow
            icon="✦"
            title="Campaign Co-pilot"
            desc="AI-powered brief generation, optimization suggestions, and content strategy — built in."
          />
        </div>
      </div>
    </section>

    {/* ── FINAL CTA ── */}
    <section className={styles.finalCTA} aria-label="Get started">
      <div className={styles.finalInner}>
        <h2 className={styles.finalHeadline}>Ready to find your perfect match?</h2>
        <p className={styles.finalSub}>
          Join thousands of brands and creators already using Meshlyy to build
          authentic, high-performing partnerships.
        </p>
        <Link to="/role-select">
          <Button variant="primary" size="lg">Start Matching Now</Button>
        </Link>
      </div>
    </section>
  </div>
);

export default LandingPage;
