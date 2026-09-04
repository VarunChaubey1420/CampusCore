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
  LogOut
} from 'lucide-react';
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

        {/* Right Column: Bio, Contact, and Security */}
        <div className="profile-section-col">
          {/* Bio & Contact Card */}
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
                  rows={3}
                  placeholder="Share a short bio, research interest, or semester ambition..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="profile-textarea"
                />
              </div>
            </div>
          </div>

          {/* Account Security & Actions Card */}
          <div className="profile-section-card security-card">
            <div className="section-card-header">
              <ShieldCheck size={18} className="text-emerald-600" />
              <div>
                <h2>Account & Cloud Security</h2>
                <p>Manage your sign-in credentials and cloud database state.</p>
              </div>
            </div>

            <div className="security-actions-list">
              <div className="security-row">
                <div className="security-row-info">
                  <strong>Password & Credentials</strong>
                  <span>Request a secure password reset link to your email.</span>
                </div>
                <button
                  type="button"
                  className={`profile-reset-btn ${resetSent ? 'sent' : ''}`}
                  onClick={handlePasswordReset}
                  disabled={resetBusy || !user?.email}
                  aria-label="Reset password"
                >
                  {resetBusy ? (
                    <Loader2 size={15} className="btn-spinner" />
                  ) : resetSent ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <KeyRound size={15} />
                  )}
                  <span>{resetBusy ? 'Sending Link…' : resetSent ? 'Reset Link Sent!' : 'Reset Password'}</span>
                </button>
              </div>

              {resetSent && (
                <div className="security-notice">
                  <CheckCircle2 size={15} />
                  <span>Reset instructions have been dispatched to {user?.email}.</span>
                </div>
              )}

              <div className="security-row">
                <div className="security-row-info">
                  <strong>Session Management</strong>
                  <span>Sign out of CampusCore on this browser.</span>
                </div>
                <button
                  type="button"
                  className="danger-outline-btn"
                  onClick={signOut}
                  aria-label="Sign out"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
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
