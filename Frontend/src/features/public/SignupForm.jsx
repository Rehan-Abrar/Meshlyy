import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import logo from '../../assets/logo.png';
import styles from './SignupForm.module.css';
import BrandSignupForm from './BrandSignupForm';

// ── Dropdown data ────────────────────────────────────────────────────────────
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

// ── SelectField ──────────────────────────────────────────────────────────────
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
  const isBrand = role === 'brand';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  // Creator fields
  const [fullName, setFullName] = useState('');
  const [niche, setNiche]       = useState('');
  const [audience, setAudience] = useState('');
  const [handle, setHandle]     = useState('');

  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);

  // If Brand, render the dedicated complex view instead
  if (isBrand) {
    return <BrandSignupForm />;
  }

  const validate = () => {
    const e = {};
    if (!email.includes('@'))   e.email = 'Enter a valid email';
    if (password.length < 6)    e.password = 'Min. 6 characters';
    if (!fullName) e.fullName = 'Required';
    if (!niche)    e.niche    = 'Required';
    if (!audience) e.audience = 'Required';
    if (!handle)   e.handle   = 'Required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    const payload = { role: 'influencer', email, name: fullName, niche, platform: 'Instagram', audience, handle };
    const result = await login(payload);
    if (result.success) {
      navigate('/influencer/dashboard');
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
          <span className={styles.roleTag}>For Creators</span>
          <h1 className={styles.panelHeadline}>
            Get found by brands that fit you
          </h1>
          <p className={styles.panelSub}>
            Join 12,000+ creators getting matched with brand deals that feel authentic.
          </p>
          <div className={styles.panelStats}>
            <div className={styles.panelStat}><strong>3.2K+</strong><span>Active brands</span></div>
            <div className={styles.panelStat}><strong>$4.2M</strong><span>Paid to creators</span></div>
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
              <span>Creator details</span>
            </div>

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
