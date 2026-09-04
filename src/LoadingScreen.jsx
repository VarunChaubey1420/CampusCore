import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  CheckCircle2,
  Database,
  CalendarCheck,
  Sparkles,
  Loader2
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

  const branch = user?.user_metadata?.branch || 'Computer Science & Engineering';
  const year = user?.user_metadata?.year || 'Semester 3';

  // Smooth continuous 60fps animation using requestAnimationFrame
  useEffect(() => {
    const duration = 2000; // 2.0 seconds total animation
    const startTime = performance.now();

    // Smooth easing function (easeOutCubic with a gentle acceleration start)
    const easeProgress = (t) => {
      // t is normalized 0 -> 1
      return t < 0.2
        ? 2.5 * t * t
        : 1 - Math.pow(1 - t, 2.8);
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
        // Reached 100% smoothly
        setProgress(100);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            if (onFinished) {
              onFinished();
            }
          }, 300);
        }, 250);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [onFinished]);

  // Derive active step smoothly based on continuous progress
  const currentStep =
    progress < 28 ? 0 : progress < 58 ? 1 : progress < 88 ? 2 : 3;

  return (
    <div className={`loading-screen-backdrop ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="loading-screen-glow" />

      <div className={`loading-screen-card ${isFadingOut ? 'card-fade-out' : ''}`}>
        {/* Animated Brand Emblem */}
        <div className="loading-emblem-wrapper">
          <div className="loading-emblem-pulse" />
          <div className="loading-emblem-ring" />
          <div className="loading-emblem-core">
            <GraduationCap size={36} className="loading-emblem-icon" />
          </div>
        </div>

        {/* Brand & Greeting */}
        <div className="loading-text-header">
          <div className="loading-brand-pill">
            <Sparkles size={13} />
            <span>CampusCore Academic Portal</span>
          </div>
          <h2 className="loading-greeting">
            Welcome back{displayName ? `, ${displayName.split(' ')[0]}` : ''}
          </h2>
          <p className="loading-subcopy">
            {branch} • {year}
          </p>
        </div>

        {/* Dynamic Smooth Progress Bar */}
        <div className="loading-progress-container">
          <div className="loading-progress-track">
            <div
              className="loading-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="loading-progress-meta">
            <span className="loading-current-action">
              {steps[currentStep]?.detail || 'Preparing workspace…'}
            </span>
            <span className="loading-percentage">{progress}%</span>
          </div>
        </div>

        {/* Stepped Status Indicators */}
        <div className="loading-steps-list">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStep || progress === 100;
            const isCurrent = idx === currentStep && progress < 100;
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={`loading-step-row ${
                  isCompleted ? 'completed' : isCurrent ? 'active' : 'pending'
                }`}
              >
                <div className="loading-step-status-icon">
                  {isCompleted ? (
                    <CheckCircle2 size={16} className="step-check" />
                  ) : isCurrent ? (
                    <Loader2 size={16} className="step-spinner" />
                  ) : (
                    <div className="step-dot" />
                  )}
                </div>
                <div className="loading-step-label-wrapper">
                  <span className="loading-step-label">{step.label}</span>
                </div>
                <StepIcon size={14} className="loading-step-type-icon" />
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="loading-footer-meta">
          <span className="live-dot" />
          <span>Syncing with Cloud Firestore</span>
        </div>
      </div>
    </div>
  );
}
