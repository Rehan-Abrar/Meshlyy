import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { apiClient, isApiError } from '../../utils/apiClient';
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

const Step1 = ({ form, onChange, errors }) => (
  <div className={styles.stepForm}>
    <h2 className={styles.stepTitle}>Name your campaign</h2>
    <Input id="name" label="Campaign Name" placeholder="Summer Glow 2025..." value={form.name || ''} onChange={e => onChange('name', e.target.value)} error={errors.name} />
    <Input id="brand" label="Brand / Product" placeholder="What are you promoting?" value={form.brand || ''} onChange={e => onChange('brand', e.target.value)} />
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel}>Campaign Brief</label>
      <textarea id="brief" className={styles.textarea} rows={5} placeholder="Describe the campaign, key messages, and what success looks like..." value={form.brief || ''} onChange={e => onChange('brief', e.target.value)} />
    </div>
  </div>
);

const Step2 = ({ form, onChange, errors }) => (
  <div className={styles.stepForm}>
    <h2 className={styles.stepTitle}>Set your objectives</h2>
    <Input id="target" label="Target Audience" placeholder="Women 25–35, fitness enthusiasts..." value={form.target || ''} onChange={e => onChange('target', e.target.value)} error={errors.target} />
    <Input id="kpi" label="Primary KPI" placeholder="Brand awareness, conversions, reach..." value={form.kpi || ''} onChange={e => onChange('kpi', e.target.value)} error={errors.kpi} />
  </div>
);

const Step3 = ({ form, onChange, errors }) => (
  <div className={styles.stepForm}>
    <h2 className={styles.stepTitle}>Budget & timeline</h2>
    <Input id="budget" label="Total Budget" prefix="$" placeholder="10,000" value={form.budget || ''} onChange={e => onChange('budget', e.target.value)} error={errors.budget} />
    <Input id="startDate" label="Start Date" type="date" value={form.startDate || ''} onChange={e => onChange('startDate', e.target.value)} error={errors.startDate} />
    <Input id="endDate" label="End Date" type="date" value={form.endDate || ''} onChange={e => onChange('endDate', e.target.value)} error={errors.endDate} />
    <Input id="creators" label="No. of Creators" type="number" placeholder="5" value={form.creators || ''} onChange={e => onChange('creators', e.target.value)} />
  </div>
);

const CampaignBuilder = () => {
  const navigate = useNavigate();
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState({});
  const [saved,  setSaved]  = useState(false);
  const [saving, setSaving] = useState(false);
  const [campaignId, setCampaignId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [stepErrors, setStepErrors] = useState({});

  const handleChange = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (stepErrors[key]) setStepErrors(p => ({ ...p, [key]: null }));
  };

  const validateStep = (stepIndex) => {
    const errors = {};
    if (stepIndex === 0) {
      if (!(form.name || '').trim()) errors.name = 'Campaign name is required';
    } else if (stepIndex === 1) {
      if (!(form.target || '').trim()) errors.target = 'Target audience is required';
      if (!(form.kpi || '').trim()) errors.kpi = 'Primary KPI is required';
    } else if (stepIndex === 2) {
      if (!(form.budget || '').trim()) errors.budget = 'Total budget is required';
      if (!(form.startDate || '').trim()) errors.startDate = 'Start date is required';
      if (!(form.endDate || '').trim()) errors.endDate = 'End date is required';
    }
    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(step);
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors({});
    setStep(s => s + 1);
  };

  const buildPayload = () => {
    const budgetValue = Number(form.budget || 0);
    return {
      title: (form.name || '').trim() || 'Untitled Campaign',
      briefPreview: (form.brief || '').trim().slice(0, 280),
      briefData: {
        brandOrProduct: form.brand || '',
        targetAudience: form.target || '',
        primaryKpi: form.kpi || '',
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        creatorCount: form.creators ? Number(form.creators) : null,
      },
      budget: Number.isFinite(budgetValue) && budgetValue > 0 ? budgetValue : undefined,
      currency: 'USD',
      visibility: 'MATCHED',
    };
  };

  const persistCampaign = async () => {
    const payload = buildPayload();

    if (campaignId) {
      await apiClient.patch(`/campaigns/${campaignId}`, payload);
      return campaignId;
    }

    const created = await apiClient.post('/campaigns', payload);
    if (created?.id) {
      setCampaignId(created.id);
      return created.id;
    }
    return null;
  };

  const handleSave = async () => {
    const errors = validateStep(0);
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      setErrorMessage('Please fill in the campaign name before saving.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setActionMessage('');
    try {
      await persistCampaign();
      setSaved(true);
      setActionMessage('Campaign saved successfully.');
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setErrorMessage(isApiError(error) ? `${error.code}: ${error.message}` : 'Unable to save campaign.');
    } finally {
      setSaving(false);
    }
  };

  const handleLaunch = async () => {
    // Validate ALL steps before launch
    const errors0 = validateStep(0);
    const errors1 = validateStep(1);
    const errors2 = validateStep(2);
    
    if (Object.keys(errors0).length > 0 || Object.keys(errors1).length > 0 || Object.keys(errors2).length > 0) {
      setErrorMessage('Please complete all required fields before launching.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setActionMessage('');
    try {
      const id = await persistCampaign();
      if (id) {
        await apiClient.patch(`/campaigns/${id}/status`, { status: 'ACTIVE' });
      }
      navigate('/brand/dashboard');
    } catch (error) {
      setErrorMessage(isApiError(error) ? `${error.code}: ${error.message}` : 'Unable to launch campaign.');
    } finally {
      setSaving(false);
    }
  };

  const stepComponents = [
    <Step1 key={0} form={form} onChange={handleChange} errors={stepErrors} />,
    <Step2 key={1} form={form} onChange={handleChange} errors={stepErrors} />,
    <Step3 key={2} form={form} onChange={handleChange} errors={stepErrors} />,
  ];

  // Disable launch if any required fields are completely missing
  const isComplete = form.name && form.target && form.kpi && form.budget && form.startDate && form.endDate;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>New Campaign</h1>
        <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : (saved ? '✓ Saved!' : 'Save Campaign')}</Button>
      </div>

      {actionMessage && <Card variant="glass" className={styles.successBanner}>{actionMessage}</Card>}
      {errorMessage && <Card variant="glass" className={styles.errorBanner}>{errorMessage}</Card>}

      <StepTracker current={step} />

      <Card variant="standard" className={styles.formCard}>
        {stepComponents[step]}
      </Card>

      <div className={styles.navRow}>
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep(s => s - 1)}>← Back</Button>
        {step < STEPS.length - 1
          ? <Button variant="primary" onClick={handleNext}>Next →</Button>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <Button variant="primary" onClick={handleLaunch} disabled={saving || !isComplete}>{saving ? 'Launching...' : 'Launch Campaign'}</Button>
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
