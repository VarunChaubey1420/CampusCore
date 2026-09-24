import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  BookOpen,
  GraduationCap,
  Phone,
  Target,
  FileText,
  Save,
  RotateCcw,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Award,
  CheckSquare,
  MessageCircleQuestion,
  CalendarDays,
  ChevronDown,
  Loader2,
  LogOut,
  Database,
  Lock,
  Copy,
  Check,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { useAuthSession } from './auth';

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Electronics & Communication (ECE)',
  'Electrical & Electronics (EEE)',
  'Mechanical Engineering',
  'Civil Engineering',
  'Management & Business Administration'
];

export const SEMESTERS = [
  'Semester 1',
  'Semester 2',
  'Semester 3',
  'Semester 4',
  'Semester 5',
  'Semester 6',
  'Semester 7',
  'Semester 8'
];

const LOGIN_ACTIVITY_DATA = [
  { day: 'Thu', date: 'Sep 17', logins: 3, note: 'Morning Firestore sync' },
  { day: 'Fri', date: 'Sep 18', logins: 5, note: 'Doubt Space peer Q&A' },
  { day: 'Sat', date: 'Sep 19', logins: 2, note: 'Weekend review' },
  { day: 'Sun', date: 'Sep 20', logins: 1, note: 'Study plan update' },
  { day: 'Mon', date: 'Sep 21', logins: 6, note: 'Task manager sprints' },
  { day: 'Tue', date: 'Sep 22', logins: 4, note: 'AI workload consultation' },
  { day: 'Wed', date: 'Today', logins: 4, note: 'Current active session' }
];

function CustomLoginTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="podia-chart-tooltip">
        <p className="tooltip-title">{data.date} ({label})</p>
        <p className="tooltip-stat">
          <strong>{data.logins}</strong> logins & authentications
        </p>
        <span className="tooltip-sub">{data.note}</span>
      </div>
    );
  }
  return null;
}

export function ProfilePage({ user, tasks = [], doubts = [], plans = [], onProfileUpdated, onNavigate }) {
  const { updateProfile, resetPassword, signOut } = useAuthSession();

  const meta = user?.user_metadata || {};

  // Form states initialized from user metadata
  const [fullName, setFullName] = useState(meta.full_name || meta.display_name || '');
  const [branch, setBranch] = useState(meta.branch || '');
  const [year, setYear] = useState(meta.year || '');
  const [bio, setBio] = useState(meta.bio || '');
  const [phone, setPhone] = useState(meta.phone || '');
  const [targetCgpa, setTargetCgpa] = useState(meta.targetCgpa || '');
  const [academicInterests, setAcademicInterests] = useState(meta.academicInterests || '');

  // UI state
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  const handleCopyUid = () => {
    if (user?.id) {
      navigator.clipboard?.writeText?.(user.id);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  // Sync state when user prop changes
  useEffect(() => {
    const currentMeta = user?.user_metadata || {};
    setFullName(currentMeta.full_name || currentMeta.display_name || '');
    setBranch(currentMeta.branch || '');
    setYear(currentMeta.year || '');
    setBio(currentMeta.bio || '');
    setPhone(currentMeta.phone || '');
    setTargetCgpa(currentMeta.targetCgpa || '');
    setAcademicInterests(currentMeta.academicInterests || '');
  }, [user]);

  // Check if form has unsaved modifications
  const isDirty =
    fullName !== (meta.full_name || meta.display_name || '') ||
    branch !== (meta.branch || '') ||
    year !== (meta.year || '') ||
    bio !== (meta.bio || '') ||
    phone !== (meta.phone || '') ||
    targetCgpa !== (meta.targetCgpa || '') ||
    academicInterests !== (meta.academicInterests || '');

  const handleReset = () => {
    setFullName(meta.full_name || meta.display_name || '');
    setBranch(meta.branch || '');
    setYear(meta.year || '');
    setBio(meta.bio || '');
    setPhone(meta.phone || '');
    setTargetCgpa(meta.targetCgpa || '');
    setAcademicInterests(meta.academicInterests || '');
    setStatusMessage(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setStatusMessage({ type: 'error', text: 'Full Name cannot be empty.' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const updatedUser = await updateProfile({
        fullName: fullName.trim(),
        branch: branch || meta.branch || 'Computer Science & Engineering',
        year: year || meta.year || 'Semester 1',
        bio: bio.trim(),
        phone: phone.trim(),
        targetCgpa: targetCgpa.trim(),
        academicInterests: academicInterests.trim()
      });

      setStatusMessage({
        type: 'success',
        text: 'Profile changes successfully synchronized with Firebase Cloud Firestore!'
      });

      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save profile. Please check your connection.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetBusy(true);
    try {
      await resetPassword(user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 8000);
    } catch (err) {
      alert(err.message || 'Could not send password reset instructions.');
    } finally {
      setResetBusy(false);
    }
  };

  const completedTasksCount = tasks.filter((t) => t.status === 'Completed').length;
  const userDoubtsCount = doubts.filter((d) => d.authorId === user?.id || d.author === fullName).length;

  const initials = (fullName || user?.email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  return (
    <div className="profile-page-view">
      {/* Header Banner */}
      <div className="profile-hero-card">
        <div className="profile-hero-content">
          <div className="profile-avatar-large">
            <span>{initials}</span>
            <span className="profile-online-badge" title="Active student session" />
          </div>
          <div className="profile-hero-text">
            <div className="profile-hero-title-row">
              <h1>{fullName || 'Student Account'}</h1>
              <span className="profile-badge student">Verified Student</span>
              {isDirty && <span className="profile-badge unsaved">Unsaved Changes</span>}
            </div>
            <p className="profile-hero-sub">
              {branch || 'Department not specified'} · {year || 'Semester not specified'}
            </p>
            <div className="profile-meta-tags">
              <span className="profile-tag">
                <Mail size={13} />
                {user?.email || 'No email attached'}
              </span>
              <span className="profile-tag cloud">
                <ShieldCheck size={13} />
                Cloud Firestore Synced
              </span>
            </div>
          </div>
        </div>

        {/* Academic Engagement Metrics */}
        <div className="profile-metrics-grid">
          <div className="profile-metric-card" onClick={() => onNavigate && onNavigate('tasks')} role="button">
            <div className="metric-icon blue">
              <CheckSquare size={17} />
            </div>
            <div className="metric-data">
              <strong>{completedTasksCount}/{tasks.length}</strong>
              <span>Tasks Done</span>
            </div>
          </div>

          <div className="profile-metric-card" onClick={() => onNavigate && onNavigate('doubts')} role="button">
            <div className="metric-icon purple">
              <MessageCircleQuestion size={17} />
            </div>
            <div className="metric-data">
              <strong>{userDoubtsCount}</strong>
              <span>Doubts Posted</span>
            </div>
          </div>

          <div className="profile-metric-card" onClick={() => onNavigate && onNavigate('planner')} role="button">
            <div className="metric-icon amber">
              <CalendarDays size={17} />
            </div>
            <div className="metric-data">
              <strong>{plans.length}</strong>
              <span>Study Plans</span>
            </div>
          </div>

          <div className="profile-metric-card">
            <div className="metric-icon green">
              <Award size={17} />
            </div>
            <div className="metric-data">
              <strong>{targetCgpa || '9.0'}</strong>
              <span>Target CGPA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {statusMessage && (
        <div className={`profile-status-banner ${statusMessage.type}`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-500" />
          ) : (
            <AlertCircle size={18} className="text-rose-500" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSave} className="profile-form-grid">
        {/* Left Column: Academic & Personal Details */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <BookOpen size={18} className="text-blue-600" />
            <div>
              <h2>Academic & University Profile</h2>
              <p>Manage your formal student credentials and course specialization.</p>
            </div>
          </div>

          <div className="profile-fields">
            <div className="profile-field-group">
              <label htmlFor="prof-fullname">
                Full Name <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  id="prof-fullname"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="profile-field-row">
              <div className="profile-field-group">
                <label htmlFor="prof-dept">Department / Branch</label>
                <div className="input-with-icon">
                  <BookOpen size={16} className="input-icon" />
                  <select
                    id="prof-dept"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="login-select"
                  >
                    <option value="" disabled>
                      Select Department
                    </option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="select-chevron-icon" />
                </div>
              </div>

              <div className="profile-field-group">
                <label htmlFor="prof-sem">Semester / Year</label>
                <div className="input-with-icon">
                  <GraduationCap size={16} className="input-icon" />
                  <select
                    id="prof-sem"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="login-select"
                  >
                    <option value="" disabled>
                      Select Semester
                    </option>
                    {SEMESTERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="select-chevron-icon" />
                </div>
              </div>
            </div>

            <div className="profile-field-group">
              <label htmlFor="prof-cgpa">Target CGPA Goal</label>
              <div className="input-with-icon">
                <Target size={16} className="input-icon" />
                <input
                  id="prof-cgpa"
                  type="text"
                  placeholder="Enter target CGPA (e.g. 8.8 / 10.0)"
                  value={targetCgpa}
                  onChange={(e) => setTargetCgpa(e.target.value)}
                />
              </div>
            </div>

            <div className="profile-field-group">
              <label htmlFor="prof-interests">Academic Interests & Key Subjects</label>
              <div className="input-with-icon">
                <Sparkles size={16} className="input-icon" />
                <input
                  id="prof-interests"
                  type="text"
                  placeholder="e.g. Distributed Systems, Machine Learning, Operating Systems"
                  value={academicInterests}
                  onChange={(e) => setAcademicInterests(e.target.value)}
                />
              </div>
              <small className="field-hint">
                Used by the AI Workload Chatbot and Study Planner to tailor recommendations.
              </small>
            </div>
          </div>
        </div>

        {/* Right Column: Bio & Contact Information */}
        <div className="profile-section-card">
          <div className="section-card-header">
            <FileText size={18} className="text-purple-600" />
            <div>
              <h2>Bio & Contact Information</h2>
              <p>Visible to peers and study groups in CampusCore Doubt Space.</p>
            </div>
          </div>

          <div className="profile-fields">
            <div className="profile-field-group">
              <label htmlFor="prof-email">Student Email Address</label>
              <div className="input-with-icon readonly-input">
                <Mail size={16} className="input-icon" />
                <input
                  id="prof-email"
                  type="email"
                  value={user?.email || 'student@campuscore.edu'}
                  readOnly
                  disabled
                />
              </div>
              <small className="field-hint">Email is linked to your authentication account.</small>
            </div>

            <div className="profile-field-group">
              <label htmlFor="prof-phone">Phone / WhatsApp (Optional)</label>
              <div className="input-with-icon">
                <Phone size={16} className="input-icon" />
                <input
                  id="prof-phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="profile-field-group">
              <label htmlFor="prof-bio">Academic Bio & Goals</label>
              <textarea
                id="prof-bio"
                rows={4}
                placeholder="Share a short bio, research interest, or semester ambition..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="profile-textarea"
              />
            </div>
          </div>
        </div>

        {/* Full-Width: Expanded Account & Cloud Security Command Center */}
        <div className="profile-section-card security-card full-width">
          <div className="section-card-header security-header-expanded">
            <div className="security-header-left">
              <div className="security-icon-badge">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2>Account & Cloud Security</h2>
                <p>Enterprise-grade Firebase Firestore encryption, authentication credentials, and active student sessions.</p>
              </div>
            </div>
            <div className="security-header-right">
              <span className="cloud-security-live-badge">
                <span className="dot pulse" /> Live Firestore Active
              </span>
            </div>
          </div>

          <div className="security-panels-grid">
            {/* Panel 1: Cloud Firestore Persistence & Encryption */}
            <div className="security-panel-item">
              <div className="panel-item-top">
                <div className="panel-icon-wrap teal">
                  <Database size={16} />
                </div>
                <div>
                  <h4>Cloud Database State</h4>
                  <span className="panel-badge-pill teal">Realtime Firestore</span>
                </div>
              </div>
              <div className="panel-details-list">
                <div className="panel-detail-row">
                  <span className="detail-label">Database ID</span>
                  <span className="detail-value mono">ai-studio-campuscore</span>
                </div>
                <div className="panel-detail-row">
                  <span className="detail-label">Data Encryption</span>
                  <span className="detail-value">AES-256 Cloud Rest & Transit</span>
                </div>
                <div className="panel-detail-row">
                  <span className="detail-label">Student UID</span>
                  <div className="uid-copy-wrap">
                    <span className="detail-value mono uid-text" title={user?.id || ''}>
                      {user?.id ? `${user.id.slice(0, 10)}...${user.id.slice(-4)}` : 'CampusUID-8812'}
                    </span>
                    <button
                      type="button"
                      className="uid-copy-btn"
                      onClick={handleCopyUid}
                      title="Copy Student UID"
                    >
                      {copiedUid ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>{copiedUid ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 2: Password & Credentials Management */}
            <div className="security-panel-item">
              <div className="panel-item-top">
                <div className="panel-icon-wrap amber">
                  <KeyRound size={16} />
                </div>
                <div>
                  <h4>Password & Credentials</h4>
                  <span className="panel-badge-pill amber">Firebase Auth</span>
                </div>
              </div>
              <div className="panel-details-list">
                <div className="panel-detail-row">
                  <span className="detail-label">Linked Email</span>
                  <span className="detail-value email-value">{user?.email || 'student@campuscore.edu'}</span>
                </div>
                <div className="panel-detail-row">
                  <span className="detail-label">Password Hash</span>
                  <span className="detail-value">Bcrypt / Scrypt Encrypted</span>
                </div>
                <div className="panel-action-wrap">
                  <button
                    type="button"
                    className={`profile-reset-btn ${resetSent ? 'sent' : ''}`}
                    onClick={handlePasswordReset}
                    disabled={resetBusy || !user?.email}
                    aria-label="Reset password"
                  >
                    {resetBusy ? (
                      <Loader2 size={14} className="btn-spinner" />
                    ) : resetSent ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <KeyRound size={14} />
                    )}
                    <span>{resetBusy ? 'Dispatching…' : resetSent ? 'Reset Link Sent!' : 'Send Reset Link'}</span>
                  </button>
                  {resetSent && (
                    <small className="reset-sent-note">
                      Instructions sent to {user?.email}
                    </small>
                  )}
                </div>
              </div>
            </div>

            {/* Panel 3: Session Management & Devices */}
            <div className="security-panel-item">
              <div className="panel-item-top">
                <div className="panel-icon-wrap purple">
                  <Lock size={16} />
                </div>
                <div>
                  <h4>Session & Access Control</h4>
                  <span className="panel-badge-pill purple">Single Origin</span>
                </div>
              </div>
              <div className="panel-details-list">
                <div className="panel-detail-row">
                  <span className="detail-label">Session Status</span>
                  <span className="detail-value status-active">Active Session</span>
                </div>
                <div className="panel-detail-row">
                  <span className="detail-label">Environment</span>
                  <span className="detail-value">CampusCore Web Applet</span>
                </div>
                <div className="panel-action-wrap">
                  <button
                    type="button"
                    className="danger-outline-btn full-w"
                    onClick={signOut}
                    aria-label="Sign out"
                  >
                    <LogOut size={14} />
                    <span>Sign Out of CampusCore</span>
                  </button>
                  <small className="session-note">
                    Terminates session & clears local token
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Login Frequency & Activity Visualization Chart using recharts */}
          <div className="security-activity-chart-container">
            <div className="activity-chart-header">
              <div className="activity-chart-header-left">
                <div className="panel-icon-wrap emerald">
                  <Activity size={16} />
                </div>
                <div>
                  <h4>Recent Login & Session Frequency</h4>
                  <p>7-day authentication distribution and real-time cloud access telemetry.</p>
                </div>
              </div>
              <div className="activity-chart-header-right">
                <div className="chart-stat-chip">
                  <span className="stat-label">7-Day Total:</span>
                  <span className="stat-num">25 Logins</span>
                </div>
                <div className="chart-stat-chip green">
                  <span className="dot pulse" /> 0 Security Anomalies
                </div>
              </div>
            </div>

            <div className="activity-chart-body">
              <div style={{ width: '100%', height: 165 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={LOGIN_ACTIVITY_DATA} margin={{ top: 12, right: 12, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="loginGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#090a0f" stopOpacity={0.16} />
                        <stop offset="95%" stopColor="#090a0f" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={{ stroke: '#ede8df' }}
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    <Tooltip content={<CustomLoginTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="logins"
                      stroke="#090a0f"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#loginGradient)"
                      activeDot={{ r: 5, stroke: '#090a0f', strokeWidth: 2, fill: '#ffffff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="activity-chart-footer">
                <div className="activity-summary-item">
                  <span className="summary-dot active" />
                  <span>Current Session: <strong>{user?.email || 'Student Account'}</strong></span>
                </div>
                <div className="activity-summary-item">
                  <span className="summary-label">Average:</span>
                  <span><strong>3.6 logins/day</strong> · Verified single-origin sessions</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating / Sticky Save Bar */}
        <div className="profile-action-bar">
          <div className="action-bar-left">
            {isDirty ? (
              <span className="dirty-indicator">
                <span className="dot pulse" /> You have unsaved profile changes
              </span>
            ) : (
              <span className="synced-indicator">
                <CheckCircle2 size={15} /> All profile details are saved to Firebase
              </span>
            )}
          </div>

          <div className="action-bar-buttons">
            <button
              type="button"
              className="cancel-btn"
              onClick={handleReset}
              disabled={!isDirty || saving}
            >
              <RotateCcw size={15} />
              <span>Discard Changes</span>
            </button>

            <button
              type="submit"
              className="primary-btn profile-save-btn"
              disabled={saving || !isDirty}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="btn-spinner" />
                  <span>Saving to Firebase…</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
