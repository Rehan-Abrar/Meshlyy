import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Select from '../../components/common/Select';
import styles from './BrandSignupForm.module.css';
import logo from '../../assets/logo.png';

const BRAND_INDUSTRIES = [
  'E-commerce', 'Fashion & Apparel', 'Beauty & Cosmetics', 'Health & Wellness',
  'Food & Beverage', 'Technology', 'Gaming', 'Finance & Fintech',
  'Sports & Fitness', 'Travel & Hospitality', 'Education & EdTech',
  'Entertainment & Media', 'Real Estate', 'Automotive', 'B2B / SaaS',
];

const BUSINESS_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];
const CAMPAIGN_TYPES = ['One-off Project', 'Long-term Ambassador', 'Product Seeding'];
const BUDGET_RANGES = ['$1k - $5k', '$5k - $10k', '$10k - $25k', '$25k+'];
const CREATOR_TIERS = ['Nano (1k-10k)', 'Micro (10k-50k)', 'Mid-tier (50k-500k)', 'Macro (500k+)'];
const PREFERRED_CONTACT = ['Email', 'Phone', 'Platform Match'];
const AUDIENCE_LOCATIONS = ['National (Pakistan)', 'Provincial', 'Regional', 'Global'];
const PAK_PROVINCES = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Gilgit-Baltistan', 'AJK', 'ICT'];

// Field component to keep code clean
const Field = ({ id, label, children, required }) => (
  <div className={styles.fieldGroup}>
    <label htmlFor={id} className={styles.fieldLabel}>
      {label} {required && <span style={{color: 'var(--color-primary)'}}>*</span>}
    </label>
    {children}
  </div>
);

const BrandSignupForm = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);

  // States (using a single form object for simplicity in this large form)
  const [form, setForm] = useState({
    fullName: '', workEmail: '', phone: '', password: '', confirmPassword: '', city: '', province: '',
    brandName: '', companyName: '', businessType: 'B2C', industry: '', website: '', instagramUrl: '',
    businessSize: '', yearsInBusiness: '', about: '',
    goals: [], campaignType: '', budget: '', creatorPref: '', startDate: '',
    category: '', audienceLocation: '', targetAge: '', language: '', requirements: '',
    registeredBusiness: false, taxId: '',
    contactPerson: '', jobTitle: '', teamSize: '', preferredContact: '',
    agreedTerms: false, agreedConsent: false
  });

  const handleChange = (e) => {
    // Check if e is native event or custom Select event
    const name = e.target ? e.target.name : e.name;
    const value = e.target ? e.target.value : e.value;
    const type = e.target ? e.target.type : undefined;
    const checked = e.target ? e.target.checked : undefined;
    
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleGoal = (goal) => {
    setForm(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal]
    }));
  };

  const parseBudgetRange = (value) => {
    if (!value) return { min: undefined, max: undefined };
    if (value === '$1k - $5k') return { min: 1000, max: 5000 };
    if (value === '$5k - $10k') return { min: 5000, max: 10000 };
    if (value === '$10k - $25k') return { min: 10000, max: 25000 };
    if (value === '$25k+') return { min: 25000, max: undefined };
    return { min: undefined, max: undefined };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Strict Validation Check
    if (!form.fullName || !form.workEmail || !form.password || !form.confirmPassword || !form.brandName || !form.industry) {
      alert('Please fill out all required fields marked with an asterisk (*).');
      return;
    }
    
    if (!form.agreedTerms || !form.agreedConsent) {
      alert('You must agree to the Terms and Consent.');
      return;
    }
    setLoading(true);

    const budgetRange = parseBudgetRange(form.budget);
    const onboardingPayload = {
      companyName: form.companyName || form.brandName,
      website: form.website || undefined,
      industry: form.industry || undefined,
      targetDemographics: {
        audienceLocation: form.audienceLocation || undefined,
        targetAge: form.targetAge || undefined,
        language: form.language || undefined,
      },
      budgetRangeMin: budgetRange.min,
      budgetRangeMax: budgetRange.max,
      toneVoice: form.about || undefined,
      campaignGoals: form.goals,
    };

    const result = await signup({
      role: 'brand',
      email: form.workEmail,
      password: form.password,
      onboardingPayload,
    });

    if (result.success) navigate('/brand/dashboard');
    else alert(result.error);
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <img src={logo} alt="Meshlyy" className={styles.logo} />
        <h1 className={styles.title}>Brand Sign Up</h1>
        <p className={styles.subtitle}>
          Join Meshlyy to discover elite creators, manage data-driven campaigns, and scale your brand's presence across the digital landscape.
        </p>
      </div>

      <form className={styles.formContainer} onSubmit={handleSubmit}>
        
        {/* Basic Account Info */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>01</div>
            <h2 className={styles.sectionTitle}>Basic Account Info</h2>
          </div>
          <div className={styles.grid2}>
            <Field id="fullName" label="Full Name" required>
              <input type="text" id="fullName" name="fullName" className={styles.input} placeholder="John Doe" value={form.fullName} onChange={handleChange} required />
            </Field>
            <Field id="workEmail" label="Work Email" required>
              <input type="email" id="workEmail" name="workEmail" className={styles.input} placeholder="john@brand.com" value={form.workEmail} onChange={handleChange} required />
            </Field>
            <Field id="phone" label="Phone">
              <input type="tel" id="phone" name="phone" className={styles.input} placeholder="+1 (000) 000-0000" value={form.phone} onChange={handleChange} />
            </Field>
            <Field id="password" label="Password" required>
              <input type="password" id="password" name="password" className={styles.input} placeholder="••••••••" value={form.password} onChange={handleChange} required />
            </Field>
            <Field id="confirmPassword" label="Confirm Password" required>
              <input type="password" id="confirmPassword" name="confirmPassword" className={styles.input} placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} required />
            </Field>
          </div>
          <div className={`${styles.grid2} ${styles.mt-4}`}>
            <Field id="province" label="Province">
              <Select id="province" name="province" options={PAK_PROVINCES} value={form.province} onChange={handleChange} placeholder="Select Province..." />
            </Field>
            <Field id="city" label="City">
              <input type="text" id="city" name="city" className={styles.input} placeholder="Enter your city" value={form.city} onChange={handleChange} />
            </Field>
          </div>
        </div>

        {/* Brand & Business Details */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>02</div>
            <h2 className={styles.sectionTitle}>Brand & Business Details</h2>
          </div>
          <div className={styles.grid2}>
            <Field id="brandName" label="Brand Name" required>
              <input type="text" id="brandName" name="brandName" className={styles.input} placeholder="Meshlyy Retail" value={form.brandName} onChange={handleChange} required />
            </Field>
            <Field id="companyName" label="Company Name">
              <input type="text" id="companyName" name="companyName" className={styles.input} placeholder="Meshlyy Global Inc." value={form.companyName} onChange={handleChange} />
            </Field>
            <Field id="businessType" label="Business Type">
              <Select id="businessType" name="businessType" options={['B2C', 'B2B', 'DTC']} value={form.businessType} onChange={handleChange} placeholder="Select Type..." />
            </Field>
            <Field id="industry" label="Industry" required>
              <Select id="industry" name="industry" options={BRAND_INDUSTRIES} value={form.industry} onChange={handleChange} placeholder="Select Industry..." required />
            </Field>
            <Field id="website" label="Website">
              <input type="url" id="website" name="website" className={styles.input} placeholder="https://meshlyy.com" value={form.website} onChange={handleChange} />
            </Field>
            <Field id="instagramUrl" label="Instagram URL">
              <input type="text" id="instagramUrl" name="instagramUrl" className={styles.input} placeholder="@meshlyy_official" value={form.instagramUrl} onChange={handleChange} />
            </Field>
            <Field id="businessSize" label="Business Size">
              <Select id="businessSize" name="businessSize" options={BUSINESS_SIZES} value={form.businessSize} onChange={handleChange} placeholder="Select Size..." />
            </Field>
            <Field id="yearsInBusiness" label="Years In Business">
              <input type="number" id="yearsInBusiness" name="yearsInBusiness" className={styles.input} placeholder="3" value={form.yearsInBusiness} onChange={handleChange} />
            </Field>
          </div>
          <div className={`${styles.fieldGroup} ${styles.mt-4}`}>
            <label className={styles.fieldLabel}>About the Company (Brand Bio)</label>
            <textarea name="about" className={styles.textarea} placeholder="Tell us about your brand mission..." value={form.about} onChange={handleChange} />
          </div>
          <div className={`${styles.fieldGroup} ${styles.mt-4}`}>
            <label className={styles.fieldLabel}>Brand Logo <span style={{color: 'var(--color-primary)'}}>*</span></label>
            <div className={styles.uploadBox}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem', opacity: 0.5 }}>+</div>
              <div className={styles.uploadText}>Click to upload or drag and drop</div>
              <div className={styles.uploadSub}>SVG, PNG, JPG (max 2MB)</div>
            </div>
          </div>
        </div>

        {/* Brand Goals & Intent */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>03</div>
            <h2 className={styles.sectionTitle}>Brand Goals & Intent</h2>
          </div>
          <Field id="campaignGoals" label="Campaign Goals">
            <div className={styles.pillGroup}>
              {['Brand Awareness', 'Sales/Conversion', 'User Generated Content'].map(goal => (
                <button type="button" key={goal} 
                  className={`${styles.pill} ${form.goals.includes(goal) ? styles.active : ''}`}
                  onClick={() => toggleGoal(goal)}>
                  {goal}
                </button>
              ))}
            </div>
          </Field>
          <div className={`${styles.grid2} ${styles.mt-4}`}>
            <Field id="campaignType" label="Campaign Type">
              <Select id="campaignType" name="campaignType" options={CAMPAIGN_TYPES} value={form.campaignType} onChange={handleChange} placeholder="Select Type..." />
            </Field>
            <Field id="budget" label="Monthly Budget Range">
              <Select id="budget" name="budget" options={BUDGET_RANGES} value={form.budget} onChange={handleChange} placeholder="Select Budget Range..." />
            </Field>
            <Field id="creatorPref" label="Creator Type Preference">
              <Select id="creatorPref" name="creatorPref" options={CREATOR_TIERS} value={form.creatorPref} onChange={handleChange} placeholder="Select Tier..." />
            </Field>
            <Field id="startDate" label="Start Date">
              <input type="date" id="startDate" name="startDate" className={styles.input} value={form.startDate} onChange={handleChange} />
            </Field>
          </div>
        </div>

        {/* Creator Preferences */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>04</div>
            <h2 className={styles.sectionTitle}>Creator Preferences</h2>
          </div>
          <div className={styles.grid2}>
            <Field id="category" label="Category">
              <input type="text" id="category" name="category" className={styles.input} placeholder="Lifestyle, Tech, Gaming" value={form.category} onChange={handleChange} />
            </Field>
            <Field id="audienceLocation" label="Audience Location">
              <Select id="audienceLocation" name="audienceLocation" options={AUDIENCE_LOCATIONS} value={form.audienceLocation} onChange={handleChange} placeholder="Select Location..." />
            </Field>
            <Field id="targetAge" label="Target Audience Age">
              <Select id="targetAge" name="targetAge" options={['Gen Z (18-24)', 'Millennials (25-34)', 'Gen X (35-54)']} value={form.targetAge} onChange={handleChange} placeholder="Select Age..." />
            </Field>
            <Field id="language" label="Language">
              <input type="text" id="language" name="language" className={styles.input} placeholder="Urdu, English, etc." value={form.language} onChange={handleChange} />
            </Field>
          </div>
          <div className={`${styles.fieldGroup} ${styles.mt-4}`}>
            <label className={styles.fieldLabel}>Specific Requirements</label>
            <textarea name="requirements" className={styles.textarea} placeholder="Any specific creator traits or restrictions?" value={form.requirements} onChange={handleChange} />
          </div>
        </div>

        {/* Verification & Trust */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>05</div>
            <h2 className={styles.sectionTitle}>Verification & Trust</h2>
          </div>
          <div className={styles.toggleSwitch}>
            <div>
              <div className={styles.toggleLabel}>Registered Business?</div>
              <div className={styles.toggleSub}>Confirm if your company is legally incorporated.</div>
            </div>
            <input type="checkbox" name="registeredBusiness" checked={form.registeredBusiness} onChange={handleChange} style={{ width: '2rem', height: '2rem' }} />
          </div>
          <div className={`${styles.fieldGroup} ${styles.mt-4}`}>
            <label className={styles.fieldLabel}>Tax Registration #</label>
            <input type="text" name="taxId" className={styles.input} placeholder="NTN / SECP Number" value={form.taxId} onChange={handleChange} />
          </div>
        </div>

        {/* Team Details */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>06</div>
            <h2 className={styles.sectionTitle}>Team Details</h2>
          </div>
          <div className={styles.grid2}>
            <Field id="contactPerson" label="Contact Person Name">
              <input type="text" id="contactPerson" name="contactPerson" className={styles.input} placeholder="Sarah Jenkins" value={form.contactPerson} onChange={handleChange} />
            </Field>
            <Field id="jobTitle" label="Job Title">
              <input type="text" id="jobTitle" name="jobTitle" className={styles.input} placeholder="Head of Growth" value={form.jobTitle} onChange={handleChange} />
            </Field>
            <Field id="teamSize" label="Marketing Team Size">
              <input type="number" id="teamSize" name="teamSize" className={styles.input} placeholder="5" value={form.teamSize} onChange={handleChange} />
            </Field>
            <Field id="preferredContact" label="Preferred Contact Method">
              <Select id="preferredContact" name="preferredContact" options={PREFERRED_CONTACT} value={form.preferredContact} onChange={handleChange} placeholder="Select Method..." />
            </Field>
          </div>
        </div>

        {/* Terms and Submit */}
        <div className={styles.termsGroup}>
          <label className={styles.checkboxRow}>
            <input type="checkbox" name="agreedTerms" checked={form.agreedTerms} onChange={handleChange} required />
            <span className={styles.checkboxText}>
              I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
            </span>
          </label>
          <label className={styles.checkboxRow}>
            <input type="checkbox" name="agreedConsent" checked={form.agreedConsent} onChange={handleChange} required />
            <span className={styles.checkboxText}>
              I consent to the processing of my brand data to receive AI-powered creator matches.
            </span>
          </label>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creating...' : 'Create Brand Profile'}
          </button>
          <div className={styles.footerNote}>
            By joining, you become part of the Meshlyy Premium Brand Network.
          </div>
        </div>

      </form>
    </div>
  );
};

export default BrandSignupForm;
