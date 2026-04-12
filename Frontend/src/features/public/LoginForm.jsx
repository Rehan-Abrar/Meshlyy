import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import AuroraBackground from '../../components/common/AuroraBackground';
import logo from '../../assets/logo.png';
import styles from './LoginForm.module.css';

const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login({ email, password });

    if (result.success) {
      if (result.role === 'admin')         navigate('/admin/queue');
      else if (result.role === 'brand')    navigate('/brand/dashboard');
      else                                 navigate('/influencer/dashboard');
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <AuroraBackground>
        <div className={styles.container}>
          <div className={styles.card}>
            <img src={logo} alt="Meshlyy" className={styles.logo} />
            <div className={styles.header}>
              <h1 className={styles.title}>Welcome back</h1>
              <p className={styles.subtitle}>Sign in to continue to Meshlyy</p>
            </div>

            {error && <p className={styles.errorBanner} role="alert">{error}</p>}

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <Input
                id="login-email"
                label="Email address"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Input
                id="login-password"
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <div className={styles.actionRow}>
                <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </div>
            </form>

            <p className={styles.footer}>
              Don't have an account?{' '}
              <Link to="/role-select" className={styles.link}>Sign up for free</Link>
            </p>
          </div>
        </div>
      </AuroraBackground>
    </div>
  );
};

export default LoginForm;
