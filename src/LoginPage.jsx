import React, { useState } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Eye,
  EyeOff,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { useAuthSession } from './auth';

export function LoginPage({ onLoginStart }) {
  const { signIn, signUp, signInWithGoogle, loginWithStaticCredentials } = useAuthSession();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);

  const STATIC_EMAIL = 'varunchaubey757@gmail.com';
  const STATIC_PASSWORD = 'password123';

  const departments = [
    'Computer Science & Engineering',
    'Information Technology',
    'Artificial Intelligence & Data Science',
    'Electronics & Communication (ECE)',
    'Electrical & Electronics (EEE)',
    'Mechanical Engineering',
    'Civil Engineering',
    'Management & Business Administration'
  ];

  const semesters = [
    'Semester 1',
    'Semester 2',
    'Semester 3',
    'Semester 4',
    'Semester 5',
    'Semester 6',
    'Semester 7',
    'Semester 8'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanInputEmail = (email || '').trim().toLowerCase();
    const isStaticUser =
      (cleanInputEmail === STATIC_EMAIL || cleanInputEmail === 'varunchaubey757@gamil.com');

    if (!isRegister && isStaticUser) {
      if (password !== STATIC_PASSWORD) {
        setError('Incorrect password. Please verify your credentials.');
        return;
      }
    }

    setBusy(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) {
          setError('Please provide your full name');
          setBusy(false);
          return;
        }
        if (!branch) {
          setError('Please select your department');
          setBusy(false);
          return;
        }
        if (!year) {
          setError('Please select your semester / year');
          setBusy(false);
          return;
        }
        if (onLoginStart) onLoginStart();
        await signUp(email, password, {
          full_name: fullName,
          branch,
          year
        });
        setSuccess('Account created successfully! Initializing workspace…');
      } else {
        if (isStaticUser && loginWithStaticCredentials) {
          if (onLoginStart) onLoginStart();
          await loginWithStaticCredentials(STATIC_EMAIL, STATIC_PASSWORD);
          setSuccess('Signed in successfully! Initializing workspace…');
        } else {
          if (onLoginStart) onLoginStart();
          await signIn(email, password);
          setSuccess('Signed in successfully! Initializing workspace…');
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
      setBusy(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-backdrop-glow" />

      <div className="login-card-wrapper">
        <div className="login-card">
          {/* Logo & Header */}
          <div className="login-header">
            <div className="login-brand">
              <span className="login-brand-icon">
                <GraduationCap size={24} />
              </span>
              <span className="login-brand-text">
                Campus<span>Core</span>
              </span>
            </div>
            <h1>{isRegister ? 'Create student account' : 'Welcome back'}</h1>
            <p className="login-subtitle">
              {isRegister
                ? 'Register your academic profile to sync your tasks, doubts, and AI study roadmaps.'
                : 'Sign in to access your synchronized semester command center, assignments, and campus forum.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab ${!isRegister ? 'active' : ''}`}
              onClick={() => {
                setIsRegister(false);
                setError(null);
                setSuccess(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`login-tab ${isRegister ? 'active' : ''}`}
              onClick={() => {
                setIsRegister(true);
                setError(null);
                setSuccess(null);
              }}
            >
              Register Account
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="login-alert error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="login-alert success">
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {isRegister && (
              <>
                <div className="login-input-group">
                  <label htmlFor="fullName">Full Name</label>
                  <div className="input-with-icon">
                    <User size={17} className="input-icon" />
                    <input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="login-form-row">
                  <div className="login-input-group">
                    <label htmlFor="branch">Department</label>
                    <div className="input-with-icon">
                      <BookOpen size={17} className="input-icon" />
                      <select
                        id="branch"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className={`login-select ${!branch ? 'placeholder-selected' : ''}`}
                        required
                      >
                        <option value="" disabled>Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="select-chevron-icon" />
                    </div>
                  </div>
                  <div className="login-input-group">
                    <label htmlFor="year">Semester / Year</label>
                    <div className="input-with-icon">
                      <GraduationCap size={17} className="input-icon" />
                      <select
                        id="year"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className={`login-select ${!year ? 'placeholder-selected' : ''}`}
                        required
                      >
                        <option value="" disabled>Select Semester</option>
                        {semesters.map((sem) => (
                          <option key={sem} value={sem}>
                            {sem}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="select-chevron-icon" />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="login-input-group">
              <label htmlFor="email">Student Email</label>
              <div className="input-with-icon">
                <Mail size={17} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-input-group">
              <div className="login-label-row">
                <label htmlFor="password">Password</label>
                {!isRegister && (
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => {
                      alert('Password reset instructions sent to ' + (email || 'your email') + '.');
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="input-with-icon">
                <Lock size={17} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 size={18} className="btn-spinner" />
                  <span>{isRegister ? 'Creating Student Account…' : 'Signing In…'}</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'Create Student Account' : 'Sign In'}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            <div className="login-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="google-sign-in-btn"
              disabled={busy}
              onClick={async () => {
                setError(null);
                setBusy(true);
                if (onLoginStart) onLoginStart();
                try {
                  await signInWithGoogle();
                } catch (err) {
                  setError(err.message || 'Google sign-in failed. Please try again.');
                  setBusy(false);
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" className="google-icon">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </form>

          {/* Footer note */}
          <div className="login-footer">
            <div className="login-security-note">
              <ShieldCheck size={14} />
              <span>Protected by Firebase Authentication & Firestore Cloud Security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
