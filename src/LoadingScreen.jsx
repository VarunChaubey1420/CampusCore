import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  Database,
  CalendarCheck,
  Sparkles,
  Loader2,
  ShieldCheck
} from 'lucide-react';

export function LoadingScreen({ user, onFinished }) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const animFrameRef = useRef(null);

  const steps = [
    {
      id: 0,
      label: 'Authenticating student credentials',
      icon: GraduationCap,
      detail: 'Verifying student security tokens…'
    },
    {
      id: 1,
      label: 'Connecting to Cloud Firestore',
      icon: Database,
      detail: 'Establishing live database sync…'
    },
    {
      id: 2,
      label: 'Loading course tasks & schedules',
      icon: CalendarCheck,
      detail: 'Fetching pending semester deadlines…'
    },
    {
      id: 3,
      label: 'Preparing your academic workspace',
      icon: Sparkles,
      detail: 'Finalizing student dashboard…'
    }
  ];

  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Varun Chaubey');

  const firstName = displayName.split(' ')[0] || 'Varun';
  const branch = user?.user_metadata?.branch || 'Computer Science & Engineering';
  const year = user?.user_metadata?.year || 'Semester 3';

  // Smooth continuous animation using requestAnimationFrame
  useEffect(() => {
    const duration = 1800; // 1.8 seconds total
    const startTime = performance.now();

    const easeProgress = (t) => {
      return t < 0.2 ? 2.5 * t * t : 1 - Math.pow(1 - t, 2.8);
    };

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeProgress(t);
      const currentPct = Math.min(100, Math.round(eased * 100));

      setProgress(currentPct);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setProgress(100);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            if (onFinished) onFinished();
          }, 300);
        }, 220);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [onFinished]);

  const currentStep =
    progress < 28 ? 0 : progress < 58 ? 1 : progress < 88 ? 2 : 3;

  return (
    <div className={`podia-loading-wrapper ${isFadingOut ? 'fade-out' : ''}`}>
      {/* Podia floating confetti shapes */}
      <div className="podia-shape shape-amber-circle" aria-hidden="true" />
      <div className="podia-shape shape-coral-tri" aria-hidden="true" />
      <div className="podia-shape shape-blue-hex" aria-hidden="true" />
      <div className="podia-shape shape-purple-blob" aria-hidden="true" />
      <div className="podia-shape shape-teal-pill" aria-hidden="true" />
      <div className="podia-shape shape-orange-cube" aria-hidden="true" />

      <div className={`podia-loading-card ${isFadingOut ? 'card-fade-out' : ''}`}>
        {/* Animated Brand Emblem */}
        <div className="podia-loading-emblem">
          <div className="podia-emblem-badge">
            <GraduationCap size={32} className="podia-emblem-icon" />
          </div>
          <span className="podia-emblem-sparkle">✦</span>
        </div>

        {/* Brand & Greeting */}
        <div className="podia-loading-header">
          <div className="podia-chip-pill">
            <Sparkles size={13} />
            <span>CampusCore Workspace</span>
          </div>
          <h2 className="podia-loading-title">
            Setting up your desk, {firstName}
          </h2>
          <p className="podia-loading-subtitle">
            {branch} · {year}
          </p>
        </div>

        {/* Dynamic Smooth Progress Bar */}
        <div className="podia-loading-bar-wrap">
          <div className="podia-loading-track">
            <div
              className="podia-loading-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="podia-loading-bar-info">
            <span className="podia-loading-status-text">
              {steps[currentStep]?.detail || 'Preparing workspace…'}
            </span>
            <span className="podia-loading-pct-badge">{progress}%</span>
          </div>
        </div>

        {/* Stepped Status Indicators */}
        <div className="podia-steps-box">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStep || progress === 100;
            const isCurrent = idx === currentStep && progress < 100;
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={`podia-step-item ${
                  isCompleted ? 'completed' : isCurrent ? 'active' : 'pending'
                }`}
              >
                <div className="podia-step-left">
                  <div className="podia-step-indicator">
                    {isCompleted ? (
                      <CheckCircle2 size={16} className="step-done-check" />
                    ) : isCurrent ? (
                      <Loader2 size={15} className="step-loading-spin" />
                    ) : (
                      <span className="step-dot-empty" />
                    )}
                  </div>
                  <span className="podia-step-text">{step.label}</span>
                </div>
                <div className="podia-step-right-icon">
                  <StepIcon size={14} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="podia-loading-foot">
          <ShieldCheck size={14} />
          <span>Cloud Firestore Secure Session</span>
        </div>
      </div>
    </div>
  );
}
