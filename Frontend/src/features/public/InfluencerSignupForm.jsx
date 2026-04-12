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

const InfluencerSignupForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    handle: '',
    platform: 'Instagram',
    niche: '',
    audience: '',
    bio: '',
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
    // Mock signup logic
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
            <h2 className={styles.sectionTitle}>Profile Information</h2>
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
          <div className={styles.fieldGroup} style={{ marginTop: '1.5rem' }}>
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
        </section>

        {/* 02: Platform Sync */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>02</div>
            <h2 className={styles.sectionTitle}>Platform Connection</h2>
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
              placeholder="Tell brands about your content style and audience..."
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
            />
          </div>
        </section>

        {/* 03: Audience & Niche */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>03</div>
            <h2 className={styles.sectionTitle}>Content & Audience</h2>
          </div>
          <div className={styles.grid2}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Content Niche</label>
              <Select
                options={CREATOR_NICHES}
                value={formData.niche}
                onChange={(e) => handleChange('niche', e.target.value)}
                placeholder="Select Niche"
              />
              {errors.niche && <span className={styles.fieldError}>{errors.niche}</span>}
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Total Reach</label>
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
                <div className={styles.uploadText}>Upload Media Kit (Optional)</div>
                <div className={styles.uploadSub}>PDF or JPG, Max 10MB</div>
             </div>
          </div>
        </section>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Initializing...' : 'Create Creator Profile'}
        </button>

        <p className={styles.footerNote}>
          By joining, you agree to Meshlyy's Terms of Service and Privacy Policy.
          Your data is indexed for brand discovery only.
        </p>
      </form>
    </div>
  );
};

export default InfluencerSignupForm;
