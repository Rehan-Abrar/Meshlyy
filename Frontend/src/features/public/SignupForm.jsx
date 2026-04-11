import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import logo from '../../assets/logo.png';
import styles from './SignupForm.module.css';

// ── Dropdown data ────────────────────────────────────────────────────────────
const BRAND_INDUSTRIES = [
  'E-commerce', 'Fashion & Apparel', 'Beauty & Cosmetics', 'Health & Wellness',
  'Food & Beverage', 'Technology', 'Gaming', 'Finance & Fintech',
  'Sports & Fitness', 'Travel & Hospitality', 'Education & EdTech',
  'Entertainment & Media', 'Real Estate', 'Automotive', 'B2B / SaaS',
];

const BUDGET_RANGES = [
  'Under $1,000', '$1,000 – $5,000', '$5,000 – $15,000',
  '$15,000 – $50,000', '$50,000 – $100,000', '$100,000+',
];

const CREATOR_NICHES = [
  'Lifestyle', 'Fashion', 'Beauty & Skincare', 'Fitness & Health',
  'Gaming', 'Tech Reviews', 'Food & Cooking', 'Travel',
  'Music & Entertainment', 'Comedy & Memes', 'Finance & Investing',
  'Education & Tutorials', 'Parenting & Family', 'Pets & Animals',
  'Sports', 'Sustainability', 'Mental Health & Wellness',
  'Photography & Videography', 'DIY & Crafts',
];

const AUDIENCE_SIZES = [
  'Under 10K (Nano)', '10K – 50K (Micro)', '50K – 250K (Mid-tier)',
  '250K – 1M (Macro)', '1M+ (Mega)',
];

// ── SelectField — styled dropdown (no third-party lib) ──────────────────────
const SelectField = ({ id, label, options, value, onChange, error }) => (
  <div className={styles.fieldGroup}>
    <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
    <select
      id={id}
      className={`${styles.select} ${error ? styles.selectError : ''}`}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="" disabled>Select…</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    {error && <span className={styles.fieldError}>{error}</span>}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const SignupForm = () => {
  const { role = 'brand' } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const isBrand = role === 'brand';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  // Brand fields
  const [company, setCompany]   = useState('');
  const [industry, setIndustry] = useState('');
  const [budget, setBudget]     = useState('');
  const [website, setWebsite]   = useState('');
  // Creator fields
  const [fullName, setFullName] = useState('');
  const [niche, setNiche]       = useState('');
  const [audience, setAudience] = useState('');
  const [handle, setHandle]     = useState('');

  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);

  const validate = () => {
    const e = {};
    if (!email.includes('@'))   e.email = 'Enter a valid email';
    if (password.length < 6)    e.password = 'Min. 6 characters';
    if (isBrand) {
      if (!company)   e.company  = 'Required';
      if (!industry)  e.industry = 'Required';
      if (!budget)    e.budget   = 'Required';
    } else {
      if (!fullName) e.fullName = 'Required';
      if (!niche)    e.niche    = 'Required';
      if (!audience) e.audience = 'Required';
      if (!handle)   e.handle   = 'Required';
    }
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    const payload = isBrand
      ? { role: 'brand', email, name: company, company, industry, budget, website }
      : { role: 'influencer', email, name: fullName, niche, platform: 'Instagram', audience, handle };

    const result = await login(payload);
    if (result.success) {
      navigate(isBrand ? '/brand/dashboard' : '/influencer/dashboard');
    } else {
      setErrors({ form: result.error });
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* Left panel */}
        <div className={styles.leftPanel}>
          <img src={logo} alt="Meshlyy" className={styles.panelLogo} />
          <span className={styles.roleTag}>{isBrand ? 'For Brands' : 'For Creators'}</span>
          <h1 className={styles.panelHeadline}>
            {isBrand
              ? 'Launch campaigns that actually convert'
              : 'Get found by brands that fit you'}
          </h1>
          <p className={styles.panelSub}>
            {isBrand
              ? 'Join 3,200+ brands discovering their perfect creator match.'
              : 'Join 12,000+ creators getting matched with brand deals that feel authentic.'}
          </p>
          <div className={styles.panelStats}>
            {isBrand ? (
              <>
                <div className={styles.panelStat}><strong>98%</strong><span>Match accuracy</span></div>
                <div className={styles.panelStat}><strong>12K+</strong><span>Active creators</span></div>
              </>
            ) : (
              <>
                <div className={styles.panelStat}><strong>3.2K+</strong><span>Active brands</span></div>
                <div className={styles.panelStat}><strong>$4.2M</strong><span>Paid to creators</span></div>
              </>
            )}
          </div>
        </div>

        {/* Right form */}
        <div className={styles.formPanel}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Create your account</h2>
            <p className={styles.formSub}>
              Already have an account?{' '}
              <Link to="/login" className={styles.formLink}>Sign in</Link>
            </p>
          </div>

          {errors.form && <p className={styles.formError}>{errors.form}</p>}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <Input id="su-email" label="Email address" type="email"
              placeholder="you@company.com" value={email}
              onChange={e => setEmail(e.target.value)} error={errors.email} />
            <Input id="su-password" label="Password" type="password"
              placeholder="Min. 6 characters" value={password}
              onChange={e => setPassword(e.target.value)} error={errors.password} />

            <div className={styles.divider}>
              <span>{isBrand ? 'Brand details' : 'Creator details'}</span>
            </div>

            {isBrand ? (
              <>
                <Input id="su-company" label="Company Name"
                  placeholder="Acme Corp" value={company}
                  onChange={e => setCompany(e.target.value)} error={errors.company} />
                <SelectField id="su-industry" label="Industry"
                  options={BRAND_INDUSTRIES} value={industry}
                  onChange={setIndustry} error={errors.industry} />
                <SelectField id="su-budget" label="Monthly Campaign Budget"
                  options={BUDGET_RANGES} value={budget}
                  onChange={setBudget} error={errors.budget} />
                <Input id="su-website" label="Website (optional)" type="url"
                  placeholder="https://acme.com" value={website}
                  onChange={e => setWebsite(e.target.value)} />
              </>
            ) : (
              <>
                <Input id="su-name" label="Full Name"
                  placeholder="Your full name" value={fullName}
                  onChange={e => setFullName(e.target.value)} error={errors.fullName} />
                <SelectField id="su-niche" label="Content Niche"
                  options={CREATOR_NICHES} value={niche}
                  onChange={setNiche} error={errors.niche} />
                <SelectField id="su-audience" label="Audience Size"
                  options={AUDIENCE_SIZES} value={audience}
                  onChange={setAudience} error={errors.audience} />
                <Input id="su-handle" label="Instagram Handle"
                  placeholder="@yourhandle" value={handle}
                  onChange={e => setHandle(e.target.value)} error={errors.handle} />
              </>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
            <p className={styles.terms}>
              By signing up you agree to our{' '}
              <a href="#" className={styles.formLink}>Terms</a> &amp;{' '}
              <a href="#" className={styles.formLink}>Privacy Policy</a>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
