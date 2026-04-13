import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { campaignsApi } from '../../services/api';
import { isDemoAuthMode } from '../../services/demoData';
import { upsertDemoCampaign } from '../../services/demoCampaigns';
import styles from './CampaignBuilder.module.css';

const STEPS = ['Campaign Brief', 'Objectives', 'Budget & Timeline'];

const StepTracker = ({ current }) => (
  <div className={styles.tracker} role="progressbar" aria-valuenow={current + 1} aria-valuemax={STEPS.length}>
    {STEPS.map((label, i) => (
      <div key={label} className={`${styles.step} ${i <= current ? styles.stepDone : ''} ${i === current ? styles.stepActive : ''}`}>
        <div className={styles.stepCircle}>
          {i < current ? '✓' : i + 1}
        </div>
        <span className={styles.stepLabel}>{label}</span>
        {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${i < current ? styles.stepLineDone : ''}`} />}
      </div>
    ))}
  </div>
);

const Step1 = ({ form, onChange }) => (
  <div className={styles.stepForm}>
    <h2 className={styles.stepTitle}>Name your campaign</h2>
    <Input id="name" label="Campaign Name" placeholder="Summer Glow 2025..." value={form.name || ''} onChange={e => onChange('name', e.target.value)} />
    <Input id="brand" label="Brand / Product" placeholder="What are you promoting?" value={form.brand || ''} onChange={e => onChange('brand', e.target.value)} />
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel}>Campaign Brief</label>
      <textarea id="brief" className={styles.textarea} rows={5} placeholder="Describe the campaign, key messages, and what success looks like..." value={form.brief || ''} onChange={e => onChange('brief', e.target.value)} />
    </div>
  </div>
);

const Step2 = ({ form, onChange }) => (
  <div className={styles.stepForm}>
    <h2 className={styles.stepTitle}>Set your objectives</h2>
    <Input id="target" label="Target Audience" placeholder="Women 25–35, fitness enthusiasts..." value={form.target || ''} onChange={e => onChange('target', e.target.value)} />
    <Input id="kpi" label="Primary KPI" placeholder="Brand awareness, conversions, reach..." value={form.kpi || ''} onChange={e => onChange('kpi', e.target.value)} />
    <Card variant="glass" className={styles.aiSuggestion}>
      <span className={styles.aiLabel}>AI Recommendation</span>
      <p>Based on your campaign brief, we suggest targeting micro-influencers in the fitness & lifestyle niche with 50K–250K followers. This typically yields 38% higher engagement than mega-influencers.</p>
      <Button variant="primary" size="sm">Apply Suggestion</Button>
    </Card>
  </div>
);

const Step3 = ({ form, onChange }) => (
  <div className={styles.stepForm}>
    <h2 className={styles.stepTitle}>Budget & timeline</h2>
    <Input id="budget" label="Total Budget" prefix="$" placeholder="10,000" value={form.budget || ''} onChange={e => onChange('budget', e.target.value)} />
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel}>Campaign Visibility</label>
      <select className={styles.textarea} value={form.visibility || 'MATCHED'} onChange={(e) => onChange('visibility', e.target.value)}>
        <option value="MATCHED">Matched Creators Only</option>
        <option value="PUBLIC">Public Campaign Feed</option>
      </select>
    </div>
    <Input id="startDate" label="Start Date" type="date" value={form.startDate || ''} onChange={e => onChange('startDate', e.target.value)} />
    <Input id="endDate" label="End Date" type="date" value={form.endDate || ''} onChange={e => onChange('endDate', e.target.value)} />
    <Input id="creators" label="No. of Creators" type="number" placeholder="5" value={form.creators || ''} onChange={e => onChange('creators', e.target.value)} />
  </div>
);

const CampaignBuilder = () => {
  const navigate = useNavigate();
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLaunch = async () => {
    setError('');
    if (!form.name || !form.brief) {
      setError('Campaign name and brief are required.');
      return;
    }

    setSaving(true);
    try {
      if (isDemoAuthMode()) {
        upsertDemoCampaign({
          title: form.name,
          brief_preview: form.brief,
          brief_data: {
            brand: form.brand,
            targetAudience: form.target,
            kpi: form.kpi,
            startDate: form.startDate,
            endDate: form.endDate,
            creators: form.creators,
          },
          budget: Number(form.budget) || 0,
          currency: 'USD',
          niche_targets: form.target ? [form.target] : [],
          visibility: form.visibility || 'MATCHED',
          status: 'ACTIVE',
        });

        navigate('/brand/campaigns/all');
        return;
      }

      await campaignsApi.create({
        title: form.name,
        briefPreview: form.brief,
        briefData: {
          brand: form.brand,
          targetAudience: form.target,
          kpi: form.kpi,
          startDate: form.startDate,
          endDate: form.endDate,
          creators: form.creators,
        },
        budget: Number(form.budget) || 0,
        currency: 'USD',
        nicheTargets: form.target ? [form.target] : undefined,
        visibility: form.visibility || 'MATCHED',
      });

      navigate('/brand/campaigns/all');
    } catch (err) {
      if (isDemoAuthMode()) {
        upsertDemoCampaign({
          title: form.name,
          brief_preview: form.brief,
          brief_data: {
            brand: form.brand,
            targetAudience: form.target,
            kpi: form.kpi,
            startDate: form.startDate,
            endDate: form.endDate,
            creators: form.creators,
          },
          budget: Number(form.budget) || 0,
          currency: 'USD',
          niche_targets: form.target ? [form.target] : [],
          visibility: form.visibility || 'MATCHED',
          status: 'ACTIVE',
        });

        navigate('/brand/campaigns/all');
        return;
      }

      setError(err?.message || 'Unable to launch campaign.');
    } finally {
      setSaving(false);
    }
  };

  const stepComponents = [
    <Step1 key={0} form={form} onChange={handleChange} />,
    <Step2 key={1} form={form} onChange={handleChange} />,
    <Step3 key={2} form={form} onChange={handleChange} />,
  ];
  const currentStep = Number.isFinite(step)
    ? Math.max(0, Math.min(step, STEPS.length - 1))
    : 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>New Campaign</h1>
        <Button variant="primary" onClick={handleSave}>{saved ? '✓ Saved!' : 'Save Campaign'}</Button>
      </div>

      <StepTracker current={currentStep} />

      <Card variant="standard" className={styles.formCard}>
        {stepComponents[currentStep]}
        {error && <p role="alert">{error}</p>}
      </Card>

      <div className={styles.navRow}>
        <Button variant="secondary" disabled={currentStep === 0} onClick={() => setStep(s => Math.max(s - 1, 0))}>← Back</Button>
        {currentStep < STEPS.length - 1
          ? <Button variant="primary" onClick={() => setStep(s => Math.min(s + 1, STEPS.length - 1))}>Next →</Button>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <Button variant="primary" onClick={handleLaunch} disabled={saving}>{saving ? 'Launching...' : 'Launch Campaign'}</Button>
              <Link to="/brand/ai-assistant">
                <Button variant="ghost" fullWidth>Ask AI for Creator Matches</Button>
              </Link>
            </div>
          )
        }
      </div>
    </div>
  );
};

export default CampaignBuilder;
