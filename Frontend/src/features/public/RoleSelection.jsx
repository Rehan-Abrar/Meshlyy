import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import styles from './RoleSelection.module.css';

const RoleCard = ({ role, title, tagline, description, features, cta, onSelect }) => (
  <div className={styles.roleCard}>
    <div className={styles.roleIcon} aria-hidden="true">
      {role === 'brand' ? (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="4" y="10" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <circle cx="12" cy="22" r="4" fill="currentColor" opacity="0.4"/>
          <line x1="20" y1="16" x2="32" y2="16" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="20" y1="22" x2="32" y2="22" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="20" y1="28" x2="28" y2="28" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ) : (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="13" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <path d="M8 34c0-7 24-7 24 0" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <circle cx="30" cy="10" r="3" fill="currentColor" opacity="0.5"/>
          <line x1="30" y1="10" x2="36" y2="6"  stroke="currentColor" strokeWidth="1" opacity="0.5"/>
          <line x1="30" y1="10" x2="37" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
          <line x1="30" y1="10" x2="34" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
        </svg>
      )}
    </div>
    <span className={styles.roleTag}>{tagline}</span>
    <h2 className={styles.roleTitle}>{title}</h2>
    <p className={styles.roleDesc}>{description}</p>
    <ul className={styles.featureList}>
      {features.map((f, i) => (
        <li key={i} className={styles.featureItem}>
          <span className={styles.featureCheck}>✓</span>
          {f}
        </li>
      ))}
    </ul>
    <div className={styles.roleActions}>
      <Button variant="primary" size="md" fullWidth onClick={onSelect}>
        {cta}
      </Button>
    </div>
  </div>
);

const RoleSelection = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleRoleSelect = (role) => {
    // Navigate to signup with role preset
    navigate(`/signup/${role}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className="micro-label">Choose Your Path</span>
        <h1 className={styles.headline}>Who are you on Meshlyy?</h1>
        <p className={styles.subhead}>
          Select your role to get the experience built for you.
        </p>
      </div>

      <div className={styles.grid}>
        <RoleCard
          role="brand"
          title="For Brands"
          tagline="I'm a Brand"
          description="Find and collaborate with the perfect creators for your campaigns. AI-matched to your audience, budget, and goals."
          features={[
            'AI-powered creator discovery',
            'Campaign performance analytics',
            'Smart shortlisting & comparison',
            'Claude-powered brief generator',
          ]}
          cta="Join as a Brand"
          onSelect={() => handleRoleSelect('brand')}
        />
        <RoleCard
          role="influencer"
          title="For Creators"
          tagline="I'm a Creator"
          description="Get matched with brands that are perfect for your audience. Never pitch cold again — let AI find the right deals for you."
          features={[
            'Inbound brand invitations',
            'AI content assistant',
            'Portfolio & analytics showcase',
            'Verified creator badge',
          ]}
          cta="Join as a Creator"
          onSelect={() => handleRoleSelect('influencer')}
        />
      </div>
    </div>
  );
};

export default RoleSelection;
