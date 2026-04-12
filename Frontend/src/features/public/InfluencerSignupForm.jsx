import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import Select from '../../components/common/Select';
import styles from './InfluencerSignupForm.module.css';

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

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Twitter / X', 'LinkedIn'];
const GENDERS = ['Female', 'Male', 'Non-Binary', 'Prefer not to say'];
const CONTENT_TYPES = ['User Generated Content (UGC)', 'Sponsored Posts', 'Brand Ambassadorship', 'Affiliate Marketing', 'Product Reviews'];

const InfluencerSignupForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    gender: '',
    location: '',
    handle: '',
    platform: 'Instagram',
    bio: '',
    niche: '',
    audience: '',
    contentTypes: '',
    verifiedConsent: false,
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    if (!formData.email.includes('@')) newErrors.email = 'Valid email is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 chars';
    if (!formData.handle) newErrors.handle = 'Social handle is required';
    if (!formData.niche) newErrors.niche = 'Niche is required';
    if (!formData.audience) newErrors.audience = 'Audience size is required';
    if (!formData.verifiedConsent) newErrors.verifiedConsent = 'Please agree to the terms';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    // Submit all data cleanly, ready for backend integration
    const result = await login({
      ...formData,
      role: 'influencer',
      name: formData.fullName
    });

    if (result.success) {
      navigate('/influencer/dashboard');
    } else {
      setErrors({ form: result.error });
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img src={logo} alt="Meshlyy" className={styles.logo} />
        <h1 className={styles.title}>Join the Neural Lattice</h1>
        <p className={styles.subtitle}>
          Connect with elite brands through AI-powered matching. Build your profile and let your influence be discovered.
        </p>
      </header>

      <form className={styles.formContainer} onSubmit={handleSubmit}>
        {errors.form && <div className={styles.formError}>{errors.form}</div>}

        {/* 01: Profile Info */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>01</div>
            <h2 className={styles.sectionTitle}>Basic Information</h2>
          </div>
          <div className={styles.grid2}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Full Name</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ex. Rehan Abrar"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
              />
              {errors.fullName && <span className={styles.fieldError}>{errors.fullName}</span>}
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Email Address</label>
              <input
                type="email"
                className={styles.input}
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
              {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
            </div>
          </div>
          
          <div className={styles.grid2} style={{ marginTop: '1.5rem' }}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Password</label>
              <input
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
              />
              {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Top Location (City, Country)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ex. Lahore, Pakistan"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.fieldGroup} style={{ marginTop: '1.5rem' }}>
            <label className={styles.fieldLabel}>Identity / Gender Representation</label>
            <Select
              options={GENDERS}
              value={formData.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              placeholder="Select Identity"
            />
          </div>
        </section>

        {/* 02: Platform Sync */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>02</div>
            <h2 className={styles.sectionTitle}>Creator Identity</h2>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
             <div className={styles.uploadBox} style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary-variant)'}}></div>
                <div>
                   <div className={styles.uploadText} style={{ textAlign: 'left' }}>Upload Profile Picture</div>
                   <div className={styles.uploadSub}>Show brands who you are</div>
                </div>
             </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Primary Platform</label>
              <Select
                options={PLATFORMS}
                value={formData.platform}
                onChange={(e) => handleChange('platform', e.target.value)}
                placeholder="Select Platform"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Handle / Username</label>
              <input
                type="text"
                className={styles.input}
                placeholder="@username"
                value={formData.handle}
                onChange={(e) => handleChange('handle', e.target.value)}
              />
              {errors.handle && <span className={styles.fieldError}>{errors.handle}</span>}
            </div>
          </div>
          <div className={styles.fieldGroup} style={{ marginTop: '1.5rem' }}>
            <label className={styles.fieldLabel}>Profile Bio / Description</label>
            <textarea
              className={styles.textarea}
              placeholder="Tell brands about your content style, values, and what makes your channel unique..."
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
            />
          </div>
        </section>

        {/* 03: Audience & Niche */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>03</div>
            <h2 className={styles.sectionTitle}>Audience Insights</h2>
          </div>
          <div className={styles.grid2}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Core Content Niche</label>
              <Select
                options={CREATOR_NICHES}
                value={formData.niche}
                onChange={(e) => handleChange('niche', e.target.value)}
                placeholder="Select Niche"
              />
              {errors.niche && <span className={styles.fieldError}>{errors.niche}</span>}
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Estimated Reach / Followers</label>
              <Select
                options={AUDIENCE_SIZES}
                value={formData.audience}
                onChange={(e) => handleChange('audience', e.target.value)}
                placeholder="Approximate Reach"
              />
              {errors.audience && <span className={styles.fieldError}>{errors.audience}</span>}
            </div>
          </div>
          <div style={{ marginTop: '2rem' }}>
             <div className={styles.uploadBox}>
                <div className={styles.uploadText}>Upload Media Kit or Portfolio (Required for verification)</div>
                <div className={styles.uploadSub}>PDF or Link to Deck</div>
             </div>
          </div>
        </section>

        {/* 04: Collab */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>04</div>
            <h2 className={styles.sectionTitle}>Collaboration & Trust</h2>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Preferred Content Types</label>
            <Select
              options={CONTENT_TYPES}
              value={formData.contentTypes}
              onChange={(e) => handleChange('contentTypes', e.target.value)}
              placeholder="What type of collabs do you prefer?"
            />
          </div>
          
          <div className={styles.fieldGroup} style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <input 
               type="checkbox" 
               id="trustCheck" 
               checked={formData.verifiedConsent}
               onChange={(e) => handleChange('verifiedConsent', e.target.checked)}
               style={{ marginTop: '4px', accentColor: 'var(--color-primary)' }}
            />
            <label htmlFor="trustCheck" className={styles.footerNote} style={{ marginTop: 0, textAlign: 'left' }}>
              I agree to the <strong>Verified Status Verification Process</strong>. I confirm my social analytics, reach, and identity details are accurate. I understand Meshlyy will verify this data before onboarding me to the Brand Discovery network.
            </label>
          </div>
          {errors.verifiedConsent && <span className={styles.fieldError} style={{ marginTop: '0.5rem', display: 'block' }}>{errors.verifiedConsent}</span>}
        </section>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Initializing Profile...' : 'Submit Creator Application'}
        </button>

      </form>
    </div>
  );
};

export default InfluencerSignupForm;
