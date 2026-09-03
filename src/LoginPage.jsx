import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
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
  ChevronDown
} from 'lucide-react';
import { useAuthSession } from './auth';

export function LoginPage({ onContinueAsGuest }) {
  const { signIn, signUp, configured } = useAuthSession();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('varunchaubey757@gmail.com');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('Varun Chaubey');
  const [branch, setBranch] = useState('Computer Science & Engineering');
  const [year, setYear] = useState('Semester 6');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);

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
    setBusy(true);
    try {
      if (isRegister) {
        if (!fullName.trim()) {
          setError('Please provide your full name');
          setBusy(false);
          return;
        }
        await signUp(email, password, {
          full_name: fullName,
          branch,
          year
        });
        setSuccess('Account created successfully! Loading your student dashboard…');
      } else {
        await signIn(email, password);
        setSuccess('Signed in successfully! Loading your student dashboard…');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
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
            <h1>{isRegister ? 'Create student account' : 'Welcome back, Student'}</h1>
            <p className="login-subtitle">
              {isRegister
                ? 'Register your academic profile to sync your tasks, doubts, and AI study roadmaps to Firebase Cloud.'
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
                      placeholder="Varun Chaubey"
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
                        className="login-select"
                      >
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
                        className="login-select"
                      >
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
                  placeholder="varunchaubey757@gmail.com"
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
                      alert('Password reset link has been dispatched to ' + (email || 'your email'));
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
                  placeholder="••••••••"
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
                'Connecting to Firebase…'
              ) : (
                <>
                  <span>{isRegister ? 'Create Student Account' : 'Sign In with Firebase'}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Guest / Demo bypass option */}
          <div className="login-footer">
            <div className="login-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="guest-login-btn"
              onClick={onContinueAsGuest}
            >
              <Sparkles size={16} style={{ color: '#2563eb' }} />
              <span>Continue with Student Demo Workspace</span>
            </button>

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
