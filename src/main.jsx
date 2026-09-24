import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard,
  MessageCircleQuestion,
  CalendarDays,
  CheckSquare,
  Plus,
  Search,
  Bell,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Sparkles,
  Calendar,
  Clock3,
  MoreHorizontal,
  Trash2,
  Pencil,
  X,
  BookOpen,
  CircleHelp,
  BarChart3,
  GraduationCap,
  ListChecks,
  RotateCcw,
  LogOut,
  Cloud,
  CheckCheck,
  Bot,
  AlertCircle,
  AlertTriangle,
  Volume2,
  BellRing,
  User,
  Target,
  Zap
} from 'lucide-react';
import './styles.css';
import { AuthProvider, AuthScreen, FirebaseStatusBadge, useAuthSession } from './auth';
import { LoginPage } from './LoginPage';
import { LoadingScreen } from './LoadingScreen';
import { ProfilePage } from './ProfilePage';
import { FirestoreService } from './lib/firestoreService';
import { WorkloadChatbot } from './WorkloadChatbot';
import {
  isTaskUrgent24h,
  getUrgentHighPriorityTasks,
  playAlertChime,
  triggerTaskAlert,
  hasTaskBeenAlerted,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission
} from './lib/notifications';

const today = new Date();
const datePlus = (days) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const nav = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'tasks', label: 'Task Manager', icon: CheckSquare },
  { id: 'advisor', label: 'AI Workload Chat', icon: Bot, isAi: true },
  { id: 'doubts', label: 'Doubt Space', icon: MessageCircleQuestion },
  { id: 'planner', label: 'Study Planner', icon: CalendarDays },
  { id: 'profile', label: 'My Profile', icon: User }
];

function Avatar({ initials, green = false }) {
  return <span className={'avatar ' + (green ? 'green' : '')}>{initials}</span>;
}

function Pill({ children, tone = '' }) {
  return <span className={'pill ' + tone}>{children}</span>;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, session, loading, configured, signOut } = useAuthSession();
  const currentUser = user || session?.user || null;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sessionEstablished, setSessionEstablished] = useState(false);

  useEffect(() => {
    if (currentUser && !sessionEstablished) {
      setIsTransitioning(true);
      setSessionEstablished(true);
    } else if (!currentUser) {
      setSessionEstablished(false);
      setIsTransitioning(false);
    }
  }, [currentUser, sessionEstablished]);

  const handleLoginStart = () => {
    setIsTransitioning(true);
  };

  if (loading || (currentUser && isTransitioning)) {
    return (
      <LoadingScreen
        user={currentUser}
        onFinished={() => setIsTransitioning(false)}
      />
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginStart={handleLoginStart} />;
  }

  return <Workspace user={currentUser} authConfigured={configured} signOut={signOut} />;
}

function Workspace({ user, authConfigured, signOut }) {
  const [page, setPage] = useState('dashboard');
  const [doubts, setDoubts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showDoubt, setShowDoubt] = useState(false);
  const [activeDoubt, setActiveDoubt] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Topbar interactive states
  const [showSearch, setShowSearch] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showQuickTask, setShowQuickTask] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const stored = localStorage.getItem('campuscore_read_notifs');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const notifRef = useRef(null);
  const quickAddRef = useRef(null);

  // Outside click listener to dismiss popovers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
      if (quickAddRef.current && !quickAddRef.current.contains(e.target)) {
        setShowQuickAdd(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut: Cmd+K / Ctrl+K opens search palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real-time Firestore subscriptions
  useEffect(() => {
    const unsubTasks = FirestoreService.subscribeTasks(user?.id, (updatedTasks) => {
      setTasks(updatedTasks);
    });
    const unsubDoubts = FirestoreService.subscribeDoubts((updatedDoubts) => {
      setDoubts(updatedDoubts);
      if (activeDoubt) {
        const fresh = updatedDoubts.find(d => String(d.id) === String(activeDoubt.id));
        if (fresh) setActiveDoubt(fresh);
      }
    });
    const unsubPlans = FirestoreService.subscribePlans(user?.id, (updatedPlans) => {
      setPlans(updatedPlans);
    });

    return () => {
      unsubTasks();
      unsubDoubts();
      unsubPlans();
    };
  }, [user?.id]);

  // High-Priority Tasks due within the next 24 hours
  const urgentHighPriorityTasks = useMemo(() => {
    return getUrgentHighPriorityTasks(tasks);
  }, [tasks]);

  const [dismissedUrgentIds, setDismissedUrgentIds] = useState(() => new Set());

  // Active urgent tasks visible in the top visual banner
  const activeUrgentTasks = useMemo(() => {
    return urgentHighPriorityTasks.filter(t => !dismissedUrgentIds.has(t.id));
  }, [urgentHighPriorityTasks, dismissedUrgentIds]);

  // Trigger audio alert chime and desktop notification once per urgent task
  useEffect(() => {
    if (urgentHighPriorityTasks.length > 0) {
      const unalerted = urgentHighPriorityTasks.find(t => !hasTaskBeenAlerted(t.id));
      if (unalerted) {
        triggerTaskAlert(unalerted, { playSound: true });
      }
    }
  }, [urgentHighPriorityTasks]);

  // Global listener for notification-driven task views
  useEffect(() => {
    const handleViewTask = () => {
      setPage('tasks');
    };
    window.addEventListener('campuscore-view-task', handleViewTask);
    return () => window.removeEventListener('campuscore-view-task', handleViewTask);
  }, []);

  // Generate dynamic academic notifications
  const notifications = useMemo(() => {
    const list = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 0. High-Priority tasks due within 24 hours (Top priority alert banner & items)
    urgentHighPriorityTasks.forEach(t => {
      list.push({
        id: `urgent-24h-${t.id}`,
        type: 'urgent',
        title: `High Priority: ${t.title}`,
        desc: `${t.urgencyLabel} · ${t.category || 'Assignment'} deadline`,
        target: 'tasks',
        taskId: t.id,
        time: t.urgencyLabel,
        isUrgent: true,
        task: t
      });
    });

    // 1. Overdue & Due Today tasks
    tasks.filter(t => t.status !== 'Completed').forEach(t => {
      if (t.due) {
        if (t.due < todayStr) {
          list.push({
            id: `overdue-${t.id}`,
            type: 'overdue',
            title: `Overdue: ${t.title}`,
            desc: `Was due on ${t.due} · Priority: ${t.priority || 'Normal'}`,
            target: 'tasks',
            taskId: t.id,
            time: 'Overdue'
          });
        } else if (t.due === todayStr) {
          list.push({
            id: `today-${t.id}`,
            type: 'today',
            title: `Due Today: ${t.title}`,
            desc: `${t.category || 'Assignment'} deadline today`,
            target: 'tasks',
            taskId: t.id,
            time: 'Today'
          });
        }
      }
    });

    // 2. High priority upcoming tasks
    const highTasks = tasks.filter(t => t.status !== 'Completed' && t.priority === 'High' && (!t.due || t.due > todayStr));
    highTasks.slice(0, 2).forEach(t => {
      list.push({
        id: `high-${t.id}`,
        type: 'high',
        title: `High Priority: ${t.title}`,
        desc: `Target deadline: ${t.due || 'No date set'}`,
        target: 'tasks',
        taskId: t.id,
        time: 'High priority'
      });
    });

    // 3. Doubts forum updates
    if (doubts.length > 0) {
      const topDoubt = doubts[0];
      list.push({
        id: `doubt-${topDoubt.id}`,
        type: 'doubt',
        title: `Peer Doubt: ${topDoubt.title}`,
        desc: `${topDoubt.subject} · ${topDoubt.answers?.length || 0} peer answers`,
        target: 'doubts',
        doubt: topDoubt,
        time: 'Community'
      });
    }

    // 4. Study planner roadmap
    const upcomingSessions = plans.flatMap(p => p.sessions || []).filter(s => s.date >= todayStr);
    if (upcomingSessions.length > 0) {
      list.push({
        id: `session-${upcomingSessions[0].date}-${upcomingSessions[0].topic}`,
        type: 'session',
        title: `Study Session: ${upcomingSessions[0].topic}`,
        desc: `${upcomingSessions[0].date} · Focus: ${upcomingSessions[0].duration || '1h'}`,
        target: 'planner',
        time: 'Upcoming'
      });
    }

    // 5. System Firebase status
    list.push({
      id: 'sys-firebase-active',
      type: 'system',
      title: 'Cloud Firestore Synchronized',
      desc: 'All academic deliverables & peer discussions synchronized in real time.',
      target: 'dashboard',
      time: 'Live'
    });

    return list;
  }, [tasks, doubts, plans, urgentHighPriorityTasks]);

  const unreadCount = notifications.filter(n => !readNotifIds.has(n.id)).length;

  const markAllNotifsRead = () => {
    const updated = new Set([...readNotifIds, ...notifications.map(n => n.id)]);
    setReadNotifIds(updated);
    try {
      localStorage.setItem('campuscore_read_notifs', JSON.stringify([...updated]));
    } catch (e) {}
  };

  const handleSelectNotif = (notif) => {
    const updated = new Set([...readNotifIds, notif.id]);
    setReadNotifIds(updated);
    try {
      localStorage.setItem('campuscore_read_notifs', JSON.stringify([...updated]));
    } catch (e) {}

    setShowNotif(false);
    if (notif.target === 'tasks') {
      setPage('tasks');
    } else if (notif.target === 'doubts') {
      setPage('doubts');
      if (notif.doubt) setActiveDoubt(notif.doubt);
    } else if (notif.target === 'planner') {
      setPage('planner');
    } else if (notif.target === 'dashboard') {
      setPage('dashboard');
    }
  };

  const pending = tasks.filter(t => t.status !== 'Completed');
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Varun Chaubey';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'VC';

  const [advisorInitialPrompt, setAdvisorInitialPrompt] = useState('');

  const navigateToAdvisor = (promptText = '') => {
    if (promptText) setAdvisorInitialPrompt(promptText);
    setPage('advisor');
  };

  const renderPage = () => ({
    dashboard: (
      <Dashboard
        user={user}
        doubts={doubts}
        tasks={tasks}
        plans={plans}
        navigate={setPage}
        onNavigateAdvisor={navigateToAdvisor}
        onToggleTask={async (task) => {
          await FirestoreService.toggleTaskStatus(task.id, task.status);
          showToast(`Marked "${task.title}" as completed`);
        }}
        onQuickTask={() => setShowQuickTask(true)}
        onAskDoubt={() => {
          setPage('doubts');
          setShowDoubt(true);
        }}
      />
    ),
    advisor: (
      <WorkloadChatbot
        user={user}
        tasks={tasks}
        plans={plans}
        initialPrompt={advisorInitialPrompt}
        onTaskAdded={() => showToast('Task saved to Firebase!')}
        onPlanAdded={() => showToast('Roadmap saved to Firebase!')}
        showToast={showToast}
      />
    ),
    doubts: (
      <DoubtSpace
        user={user}
        doubts={doubts}
        showDoubt={showDoubt}
        setShowDoubt={setShowDoubt}
        activeDoubt={activeDoubt}
        setActiveDoubt={setActiveDoubt}
        onDoubtAdded={() => showToast('Doubt saved permanently to Firebase!')}
      />
    ),
    planner: (
      <Planner
        user={user}
        setPlans={setPlans}
        setTasks={setTasks}
        plans={plans}
        onPlanSaved={() => showToast('Study roadmap saved to Firebase!')}
      />
    ),
    tasks: (
      <TaskManager
        user={user}
        tasks={tasks}
        setTasks={setTasks}
        onTaskAdded={() => showToast('Task saved permanently to Firebase!')}
      />
    ),
    profile: (
      <ProfilePage
        user={user}
        tasks={tasks}
        doubts={doubts}
        plans={plans}
        onProfileUpdated={() => showToast('Profile updated & synced with Firebase Firestore!')}
        onNavigate={(p) => setPage(p)}
      />
    )
  }[page]);

  return (
    <div className="podia-app-shell">
      {/* Podia playful geometric floating confetti shapes */}
      <div className="podia-shape shape-amber-circle" aria-hidden="true" />
      <div className="podia-shape shape-coral-tri" aria-hidden="true" />
      <div className="podia-shape shape-blue-hex" aria-hidden="true" />
      <div className="podia-shape shape-purple-blob" aria-hidden="true" />
      <div className="podia-shape shape-teal-pill" aria-hidden="true" />
      <div className="podia-shape shape-orange-cube" aria-hidden="true" />

      {/* Modern Podia Top Navigation Bar */}
      <header className="podia-main-topbar">
        <div className="podia-topbar-inner">
          <div
            className="podia-logo-wrap"
            onClick={() => setPage('dashboard')}
            role="button"
            tabIndex={0}
            title="CampusCore Home"
          >
            <span className="podia-logo-mark">
              <GraduationCap size={20} />
            </span>
            <span className="podia-logo-name">campus<span>core</span></span>
          </div>

          <nav className="podia-nav-tabs">
            {nav.map(n => {
              const Icon = n.icon;
              const isActive = page === n.id;
              return (
                <button
                  className={`podia-tab-link ${isActive ? 'active' : ''}`}
                  key={n.id}
                  onClick={() => setPage(n.id)}
                >
                  <Icon size={16} />
                  <span>{n.label}</span>
                  {n.id === 'advisor' && <span className="podia-tab-sparkle"><Sparkles size={11} /> AI</span>}
                  {n.id === 'tasks' && pending.length > 0 && <b className="podia-tab-count">{pending.length}</b>}
                </button>
              );
            })}
          </nav>

          <div className="podia-topbar-actions">
            <FirebaseStatusBadge />

            <button
              className="podia-icon-btn"
              title="Search (⌘K)"
              aria-label="Search"
              onClick={() => setShowSearch(true)}
            >
              <Search size={18} />
            </button>

            <div className="top-action-anchor" ref={notifRef}>
              <button
                className={`podia-icon-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
                title="Notifications"
                aria-label={`Notifications (${unreadCount} unread)`}
                onClick={() => setShowNotif(prev => !prev)}
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="podia-unread-dot" />}
              </button>
              {showNotif && (
                <NotificationsPopover
                  notifications={notifications}
                  readNotifIds={readNotifIds}
                  urgentTasks={urgentHighPriorityTasks}
                  onMarkAllRead={markAllNotifsRead}
                  onSelectNotification={handleSelectNotif}
                  onToggleTask={async (task) => {
                    await FirestoreService.toggleTaskStatus(task.id, task.status);
                    showToast(`Marked "${task.title}" as completed`);
                  }}
                  onClose={() => setShowNotif(false)}
                />
              )}
            </div>

            <div className="top-action-anchor" ref={quickAddRef}>
              <button
                className="podia-primary-pill-btn"
                title="Quick add"
                aria-label="Quick add"
                onClick={() => setShowQuickAdd(prev => !prev)}
              >
                <Plus size={16} />
                <span>Quick add</span>
                <ChevronDown size={13} style={{ opacity: 0.8 }} />
              </button>
              {showQuickAdd && (
                <QuickAddMenu
                  onAddTask={() => {
                    setShowQuickAdd(false);
                    if (page === 'tasks') {
                      window.dispatchEvent(new Event('new-task'));
                    } else {
                      setShowQuickTask(true);
                    }
                  }}
                  onAskDoubt={() => {
                    setShowQuickAdd(false);
                    setPage('doubts');
                    setShowDoubt(true);
                  }}
                  onStudyPlan={() => {
                    setShowQuickAdd(false);
                    setPage('planner');
                  }}
                  onAskAdvisor={() => {
                    setShowQuickAdd(false);
                    setPage('advisor');
                  }}
                  onClose={() => setShowQuickAdd(false)}
                />
              )}
            </div>

            <div className="podia-user-chip-wrap">
              <button
                className={`podia-user-chip ${page === 'profile' ? 'active' : ''}`}
                title="Manage student profile"
                aria-label="Manage student profile"
                onClick={() => setPage('profile')}
              >
                <Avatar initials={initials} green />
                <span className="podia-chip-name">{displayName.split(' ')[0]}</span>
              </button>

              {authConfigured && (
                <button
                  className="podia-signout-btn"
                  title="Sign out / Switch account"
                  aria-label="Sign out"
                  onClick={signOut}
                >
                  <LogOut size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="podia-main-content">
        {activeUrgentTasks.length > 0 && (
          <UrgentTaskBanner
            urgentTasks={activeUrgentTasks}
            onNavigateToTasks={(task) => {
              setPage('tasks');
            }}
            onMarkTaskDone={async (task) => {
              await FirestoreService.toggleTaskStatus(task.id, task.status);
              showToast(`Marked "${task.title}" as completed`);
            }}
            onDismiss={(taskId) => {
              setDismissedUrgentIds(prev => new Set([...prev, taskId]));
            }}
          />
        )}
        {renderPage()}
      </main>
        {toastMessage && (
          <div className="sync-toast">
            <CheckCheck size={18} style={{ color: '#4ade80' }} />
            <span>{toastMessage}</span>
          </div>
        )}

        {showSearch && (
          <SearchCommandPalette
            isOpen={showSearch}
            onClose={() => setShowSearch(false)}
            tasks={tasks}
            doubts={doubts}
            plans={plans}
            onNavigate={(p) => {
              setPage(p);
              setShowSearch(false);
            }}
            onSelectDoubt={(d) => {
              setPage('doubts');
              setActiveDoubt(d);
              setShowSearch(false);
            }}
            onQuickTask={() => {
              setShowSearch(false);
              setShowQuickTask(true);
            }}
            onAskDoubt={() => {
              setShowSearch(false);
              setPage('doubts');
              setShowDoubt(true);
            }}
          />
        )}

        {showQuickTask && (
          <QuickTaskModal
            user={user}
            onClose={() => setShowQuickTask(false)}
            onSaved={() => showToast('Task saved to Firebase!')}
          />
        )}
    </div>
  );
}

function Dashboard({
  user,
  doubts = [],
  tasks = [],
  plans = [],
  navigate,
  onNavigateAdvisor,
  onToggleTask,
  onQuickTask,
  onAskDoubt
}) {
  const upcoming = plans.flatMap(p => p.sessions || []).slice(0, 3);
  const userMeta = user?.user_metadata || {};
  const studentName = userMeta.display_name || userMeta.full_name || user?.email?.split('@')[0] || 'Varun Chaubey';
  const firstName = studentName.split(' ')[0] || 'Varun';
  const dept = userMeta.branch || 'Computer Science & Engineering';
  const sem = userMeta.year || 'Semester 3';
  const targetCgpa = userMeta.target_cgpa || '9.0';

  const pendingTasks = tasks.filter(t => t.status !== 'Completed');
  const completedTasks = tasks.filter(t => t.status === 'Completed');

  // Urgent tasks due within 24h
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const urgentCount = pendingTasks.filter(t => t.priority === 'High' || t.due === todayStr).length;

  // Dynamic student reputation
  const userDoubts = doubts.filter(d => d.author === studentName || d.userId === user?.id);
  const totalAnswers = doubts.reduce((acc, d) => acc + (d.answers?.filter(a => a.author === studentName || a.userId === user?.id)?.length || 0), 0);
  const dynamicRep = (userDoubts.length * 5) + (totalAnswers * 10) + (completedTasks.length * 2);

  return (
    <div className="podia-dashboard-root">
      {/* 1. Podia Hero Welcome Card */}
      <section className="podia-home-hero">
        <div className="podia-home-hero-top">
          <div className="podia-hero-meta">
            <span className="podia-hero-eyebrow">
              <Sparkles size={12} />
              <span>{dept.toUpperCase()} · {sem.toUpperCase()}</span>
            </span>
            <h1 className="podia-hero-greeting">
              Good day, {firstName} <span className="greeting-sparkle">✦</span>
            </h1>
            <p className="podia-hero-subcopy">
              Your academic tasks, live peer doubts, and study sprints — all in one playful campus desk.
            </p>
          </div>
          <div className="podia-hero-badges-row">
            <span className="podia-metric-chip teal">
              <CheckCircle2 size={13} />
              <b>{completedTasks.length}/{tasks.length || 0}</b> Tasks done
            </span>
            <span className="podia-metric-chip lavender">
              <MessageCircleQuestion size={13} />
              <b>{doubts.length}</b> Doubts active
            </span>
            <span className="podia-metric-chip amber">
              <Calendar size={13} />
              <b>{upcoming.length}</b> Study sessions
            </span>
            <span className="podia-metric-chip peach">
              <Target size={13} />
              <b>{targetCgpa}</b> Target CGPA
            </span>
          </div>
        </div>

        {/* Action launchpad */}
        <div className="podia-home-launchpad">
          <button className="podia-launch-btn primary" onClick={onQuickTask}>
            <Plus size={16} />
            <span>New Task</span>
          </button>
          <button
            className="podia-launch-btn advisor-btn"
            onClick={() => onNavigateAdvisor ? onNavigateAdvisor('Plan my next 48h study sprint') : navigate('advisor')}
          >
            <Sparkles size={15} />
            <span>Ask AI Advisor</span>
          </button>
          <button className="podia-launch-btn secondary" onClick={onAskDoubt}>
            <MessageCircleQuestion size={15} />
            <span>Ask a Doubt</span>
          </button>
          <button className="podia-launch-btn secondary" onClick={() => navigate('planner')}>
            <Calendar size={15} />
            <span>Create Study Plan</span>
          </button>
        </div>
      </section>

      {/* 2. The 3 Iconic Podia Interactive Command Cards */}
      <section className="podia-home-trio">
        {/* CARD 1: Doubt Space › (Teal) */}
        <div className="podia-preview-card preview-teal">
          <div className="podia-card-top" onClick={() => navigate('doubts')} role="button" tabIndex={0}>
            <div>
              <h3 className="podia-card-title">
                Doubt Space <ChevronRight size={18} className="podia-card-arrow" />
              </h3>
              <p className="podia-card-desc">
                Peer campus Q&A, verified answers, upvotes & real-time answers.
              </p>
            </div>
          </div>

          <div className="podia-mini-window">
            <div className="podia-mini-window-bar">
              <div className="mini-dots">
                <span className="mini-dot red" />
                <span className="mini-dot yellow" />
                <span className="mini-dot green" />
              </div>
              <span className="mini-window-title">campuscore / forum</span>
            </div>

            <div className="podia-mini-content">
              {doubts.length === 0 ? (
                <div className="podia-mini-empty">
                  <div className="mini-doubt-pill">Data Structures</div>
                  <strong className="mini-doubt-title">AVL Tree double rotation proof explanation</strong>
                  <div className="mini-doubt-meta">
                    <span>by Varun Chaubey</span>
                    <span className="mini-tag">12 answers</span>
                  </div>
                </div>
              ) : (
                doubts.slice(0, 2).map((d) => (
                  <div
                    key={d.id}
                    className="podia-mini-doubt-item"
                    onClick={() => navigate('doubts')}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="mini-doubt-head">
                      <span className="mini-doubt-pill">{d.subject || 'Coursework'}</span>
                      {d.resolved ? (
                        <span className="mini-resolved-badge">✓ Solved</span>
                      ) : (
                        <span className="mini-answers-badge">💬 {d.answers?.length || 0}</span>
                      )}
                    </div>
                    <div className="mini-doubt-question">{d.title}</div>
                    <div className="mini-doubt-sub">by {d.author} · {d.semester || 'Sem 3'}</div>
                  </div>
                ))
              )}
            </div>

            <div className="podia-mini-actions">
              <button className="podia-mini-btn" onClick={onAskDoubt}>
                <Plus size={13} />
                <span>Ask a Doubt</span>
              </button>
              <button className="podia-mini-link" onClick={() => navigate('doubts')}>
                <span>View all doubts</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: AI Workload Chat › (Amber) */}
        <div className="podia-preview-card preview-amber">
          <div
            className="podia-card-top"
            onClick={() => onNavigateAdvisor ? onNavigateAdvisor() : navigate('advisor')}
            role="button"
            tabIndex={0}
          >
            <div>
              <h3 className="podia-card-title">
                AI Workload Chat <ChevronRight size={18} className="podia-card-arrow" />
              </h3>
              <p className="podia-card-desc">
                Gemini strategist analyzes deadline clusters and generates optimal sprints.
              </p>
            </div>
          </div>

          <div className="podia-mini-window">
            <div className="podia-mini-window-bar">
              <div className="mini-dots">
                <span className="mini-dot red" />
                <span className="mini-dot yellow" />
                <span className="mini-dot green" />
              </div>
              <span className="mini-window-title">Gemini 2.5 Flash / Academic Engine</span>
            </div>

            <div className="podia-mini-content">
              <div className="podia-ai-bubble">
                <div className="podia-ai-badge">
                  <Sparkles size={12} />
                  <span>Gemini Strategist</span>
                </div>
                <p>
                  {urgentCount > 0
                    ? `⚠️ You have ${urgentCount} urgent deadline${urgentCount > 1 ? 's' : ''} in the danger zone. Let's create an emergency sprint!`
                    : pendingTasks.length > 0
                    ? `You have ${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''}. I can break them into 45-min focus blocks for you.`
                    : 'Your task queue is clear! Ready to build a 5-day exam revision roadmap?'}
                </p>
              </div>

              <div className="podia-prompt-chips">
                <button
                  className="podia-prompt-chip"
                  onClick={() => onNavigateAdvisor ? onNavigateAdvisor('Plan my next 48-hour study sprint based on my pending deadlines.') : navigate('advisor')}
                >
                  <Zap size={12} />
                  <span>Plan 48h sprint</span>
                </button>
                <button
                  className="podia-prompt-chip"
                  onClick={() => onNavigateAdvisor ? onNavigateAdvisor('Help me prioritize my hardest coursework tasks using the Eisenhower Matrix.') : navigate('advisor')}
                >
                  <Target size={12} />
                  <span>Prioritize hardest</span>
                </button>
                <button
                  className="podia-prompt-chip"
                  onClick={() => onNavigateAdvisor ? onNavigateAdvisor('Create 45-minute focus revision blocks with active recall exercises.') : navigate('advisor')}
                >
                  <Clock3 size={12} />
                  <span>45-min focus blocks</span>
                </button>
              </div>
            </div>

            <div className="podia-mini-actions">
              <button
                className="podia-mini-btn"
                onClick={() => onNavigateAdvisor ? onNavigateAdvisor() : navigate('advisor')}
              >
                <Bot size={13} />
                <span>Chat with Gemini</span>
              </button>
              <button
                className="podia-mini-link"
                onClick={() => onNavigateAdvisor ? onNavigateAdvisor() : navigate('advisor')}
              >
                <span>Open advisor</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* CARD 3: Task Manager › (Lavender) */}
        <div className="podia-preview-card preview-lavender">
          <div className="podia-card-top" onClick={() => navigate('tasks')} role="button" tabIndex={0}>
            <div>
              <h3 className="podia-card-title">
                Task Manager <ChevronRight size={18} className="podia-card-arrow" />
              </h3>
              <p className="podia-card-desc">
                Priority board, 24h urgent countdowns, and instant Firestore sync.
              </p>
            </div>
          </div>

          <div className="podia-mini-window">
            <div className="podia-mini-window-bar">
              <div className="mini-dots">
                <span className="mini-dot red" />
                <span className="mini-dot yellow" />
                <span className="mini-dot green" />
              </div>
              <span className="mini-window-title">cloud firestore / live tasks</span>
            </div>

            <div className="podia-mini-content">
              {pendingTasks.length === 0 ? (
                <div className="podia-mini-empty">
                  <CheckCircle2 size={24} style={{ color: '#10b981', margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontWeight: 600, color: '#090a0f' }}>All tasks conquered!</p>
                  <small style={{ color: '#64748b' }}>You are completely caught up with coursework.</small>
                </div>
              ) : (
                <div className="podia-mini-task-list">
                  {pendingTasks.slice(0, 3).map((task) => (
                    <div className="podia-mini-task-row" key={task.id}>
                      <button
                        className="podia-task-checkbox"
                        title="Mark as completed"
                        aria-label="Mark task done"
                        onClick={() => onToggleTask && onToggleTask(task)}
                      >
                        <span className="podia-box-inner" />
                      </button>
                      <div className="podia-task-main" onClick={() => navigate('tasks')}>
                        <span className="podia-task-title">{task.title}</span>
                        <div className="podia-task-meta">
                          <span className="podia-task-cat">{task.category || 'Assignment'}</span>
                          {task.due && (
                            <span className={`podia-task-due ${task.due === todayStr ? 'urgent' : ''}`}>
                              {task.due === todayStr ? 'Due today' : `Due ${task.due}`}
                            </span>
                          )}
                        </div>
                      </div>
                      {task.priority === 'High' && (
                        <span className="podia-high-pill">High</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="podia-mini-actions">
              <button className="podia-mini-btn" onClick={onQuickTask}>
                <Plus size={13} />
                <span>Add Task</span>
              </button>
              <button className="podia-mini-link" onClick={() => navigate('tasks')}>
                <span>View all ({pendingTasks.length})</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Bottom Duo: Study Sprint Timetable & Academic Momentum */}
      <section className="podia-home-duo">
        {/* Left: Study Timetable */}
        <div className="podia-section-card">
          <div className="podia-section-header">
            <div>
              <h3>Today's Study Schedule & Roadmap</h3>
              <p>Upcoming focus sessions generated by AI or scheduled by you.</p>
            </div>
            <button className="podia-text-link-btn" onClick={() => navigate('planner')}>
              <span>View planner</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="podia-timetable-body">
            {upcoming.length === 0 ? (
              <div className="podia-empty-inline">
                <Calendar size={28} />
                <div>
                  <strong>No study sessions scheduled yet</strong>
                  <p>Let Gemini build a customized 5-day study roadmap for your upcoming exams.</p>
                </div>
                <button className="podia-btn-secondary" onClick={() => navigate('planner')}>
                  <Sparkles size={14} />
                  <span>Build study plan</span>
                </button>
              </div>
            ) : (
              <div className="podia-sessions-stack">
                {upcoming.map((s, idx) => (
                  <div className="podia-session-row" key={idx}>
                    <div className="podia-session-date">
                      <b>{new Date(s.date + 'T12:00').getDate() || (idx + 1)}</b>
                      <small>{new Date(s.date + 'T12:00').toLocaleDateString('en-US', { month: 'short' }).toUpperCase() || 'SES'}</small>
                    </div>
                    <div className="podia-session-details">
                      <strong>{s.topic}</strong>
                      <div className="podia-session-meta">
                        <span className="session-sub-pill">{s.subject}</span>
                        <span className="session-time"><Clock3 size={12} /> {s.date}</span>
                      </div>
                    </div>
                    <button className="podia-session-action" onClick={() => navigate('planner')}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Academic Momentum & Standing */}
        <div className="podia-section-card">
          <div className="podia-section-header">
            <div>
              <h3>Academic Momentum & Standing</h3>
              <p>Peer reputation and coursework progress.</p>
            </div>
            <button className="podia-text-link-btn" onClick={() => navigate('profile')}>
              <span>My Profile</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="podia-momentum-body">
            <div className="podia-rep-display">
              <div className="podia-rep-big">
                <span className="rep-num">{dynamicRep}</span>
                <span className="rep-label">Reputation Points</span>
              </div>
              <div className="podia-rep-badges">
                <span className="rep-chip">
                  <CheckCircle2 size={12} /> {completedTasks.length} tasks cleared
                </span>
                <span className="rep-chip">
                  <MessageCircleQuestion size={12} /> {userDoubts.length} questions asked
                </span>
                <span className="rep-chip">
                  <Sparkles size={12} /> {totalAnswers} answers provided
                </span>
              </div>
            </div>

            <div className="podia-tip-box">
              <div className="podia-tip-icon">✦</div>
              <div>
                <strong>Gemini Study Tip</strong>
                <p>Spaced repetition with 45-minute focus intervals yields 35% higher concept retention for engineering coursework.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, tint, value, label, note }) {
  return (
    <div className="stat-card">
      <span className={'stat-icon ' + tint}>{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{note}</small>
      </div>
    </div>
  );
}

function PanelHead({ title, action, onClick }) {
  return (
    <div className="panel-head">
      <h2>{title}</h2>
      <button onClick={onClick}>{action}<ChevronRight size={15} /></button>
    </div>
  );
}

function DoubtSpace({ user, doubts, showDoubt, setShowDoubt, activeDoubt, setActiveDoubt, onDoubtAdded }) {
  const [subject, setSubject] = useState('All subjects');
  const [semester, setSemester] = useState('All semesters');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = doubts.filter(d => {
    const matchSub = subject === 'All subjects' || d.subject === subject;
    const matchSem = semester === 'All semesters' || d.semester === semester;
    const matchSearch = !searchQuery ||
      d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSub && matchSem && matchSearch;
  });

  const handleVote = async (e, doubt) => {
    e.stopPropagation();
    await FirestoreService.voteDoubt(doubt.id, user?.id);
  };

  return (
    <>
      <div className="page-heading tight">
        <div>
          <p className="eyebrow">COMMUNITY KNOWLEDGE BASE</p>
          <h1>Doubt Space</h1>
          <p>Ask freely, share verified solutions, and save peer questions permanently in Firebase.</p>
        </div>
        <button className="primary-btn" onClick={() => setShowDoubt(true)}>
          <Plus size={17} /> Ask a doubt
        </button>
      </div>
      <div className="filter-bar">
        <Search size={18} />
        <input
          placeholder="Search questions, subjects or topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select value={subject} onChange={e => setSubject(e.target.value)}>
          <option>All subjects</option>
          <option>Machine Learning</option>
          <option>Operating Systems</option>
          <option>Database Systems</option>
          <option>Computer Networks</option>
        </select>
        <select value={semester} onChange={e => setSemester(e.target.value)}>
          <option>All semesters</option>
          <option>Semester 3</option>
          <option>Semester 4</option>
          <option>Semester 6</option>
        </select>
      </div>
      <div className="doubt-layout">
        <div className="doubt-list">
          {filtered.length === 0 ? (
            <div className="podia-doubt-empty">
              <div className="podia-empty-icon-wrap">
                <MessageCircleQuestion size={30} />
              </div>
              <h2>No doubts found</h2>
              <p>Be the first to post a question to the campus community and earn rep points.</p>
              <button className="podia-launch-btn primary" onClick={() => setShowDoubt(true)}>
                <Plus size={16} />
                <span>Ask the First Doubt</span>
              </button>
            </div>
          ) : (
            filtered.map(d => (
              <article className="doubt-card" key={d.id} onClick={() => setActiveDoubt(d)}>
                <div className="vote-stack">
                  <button onClick={(e) => handleVote(e, d)} title="Upvote question">
                    <ArrowUp size={18} />
                  </button>
                  <b>{d.votes || 0}</b>
                  <small>votes</small>
                </div>
                <div className="doubt-content">
                  <div>
                    <Pill>{d.subject}</Pill>
                    <Pill tone="muted">{d.semester}</Pill>
                    {d.resolved && <Pill tone="success">Resolved</Pill>}
                  </div>
                  <h3>{d.title}</h3>
                  <p>{d.description}</p>
                  <footer>
                    <span><Avatar initials={d.initials || 'VC'} />{d.author} · {d.time || 'recently'}</span>
                    <span className="answers-pill">
                      <MessageCircleQuestion size={15} />
                      {d.answers?.length || 0} {(d.answers?.length || 0) === 1 ? 'answer' : 'answers'}
                    </span>
                  </footer>
                </div>
              </article>
            ))
          )}
        </div>
        <aside className="podia-doubt-sidebar-card">
          <div className="podia-doubt-sidebar-top">
            <span className="podia-doubt-sidebar-icon">
              <BookOpen size={20} />
            </span>
            <span className="podia-cloud-badge">
              <span className="dot pulse" /> Live Firestore
            </span>
          </div>
          <h3>Firebase Cloud Persistence</h3>
          <p>All doubts, peer upvotes, and verified answers are saved permanently in Firestore.</p>
          <div className="podia-rep-rules">
            <div className="podia-rep-rule-item teal">
              <b>+10 pts</b>
              <small>for an accepted answer</small>
            </div>
            <div className="podia-rep-rule-item amber">
              <b>+2 pts</b>
              <small>for every peer upvote</small>
            </div>
          </div>
          <div className="podia-doubt-sidebar-footer">
            <small>Peer solutions sync across all students in real time</small>
          </div>
        </aside>
      </div>
      {showDoubt && (
        <DoubtModal
          user={user}
          onClose={() => setShowDoubt(false)}
          onAdd={async (formData) => {
            await FirestoreService.addDoubt(user, formData);
            setShowDoubt(false);
            if (onDoubtAdded) onDoubtAdded();
          }}
        />
      )}
      {activeDoubt && (
        <DoubtDetail
          user={user}
          doubt={activeDoubt}
          onClose={() => setActiveDoubt(null)}
        />
      )}
    </>
  );
}

function DoubtModal({ user, onClose, onAdd }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: 'Data Structures & Algorithms',
    semester: user?.user_metadata?.year || 'Semester 3'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.title || !form.description || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Ask the community (Saved to Firebase)" onClose={onClose}>
      <div className="form-grid">
        <label>
          Question title
          <input
            autoFocus
            placeholder="What are you stuck on? (e.g. Backpropagation gradients)"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            placeholder="Add enough context, equations, or code snippets for your peers..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={4}
          />
        </label>
        <div className="two-col">
          <label>
            Subject
            <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
              <option>Machine Learning</option>
              <option>Operating Systems</option>
              <option>Database Systems</option>
              <option>Computer Networks</option>
            </select>
          </label>
          <label>
            Semester
            <select value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })}>
              <option>Semester 1</option>
              <option>Semester 2</option>
              <option>Semester 3</option>
              <option>Semester 4</option>
              <option>Semester 5</option>
              <option>Semester 6</option>
              <option>Semester 7</option>
              <option>Semester 8</option>
            </select>
          </label>
        </div>
        <button
          className="primary-btn full"
          disabled={!form.title.trim() || !form.description.trim() || submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Posting to Firebase…' : 'Post doubt permanently'}
        </button>
      </div>
    </Modal>
  );
}

function DoubtDetail({ user, doubt, onClose }) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const markAccepted = async (answerId) => {
    await FirestoreService.markAnswerAccepted(doubt.id, answerId);
  };

  const submit = async () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    try {
      await FirestoreService.addAnswer(doubt.id, user, answer);
      setAnswer('');
    } finally {
      setSubmitting(false);
    }
  };

  const answers = doubt.answers || [];

  return (
    <Modal title="Doubt Details & Discussion" onClose={onClose} wide>
      <div className="detail-question">
        <div>
          <Pill>{doubt.subject}</Pill>
          <Pill tone="muted">{doubt.semester}</Pill>
          {doubt.resolved && <Pill tone="success">Resolved</Pill>}
        </div>
        <h2>{doubt.title}</h2>
        <p>{doubt.description}</p>
        <small>Asked by {doubt.author} · {doubt.time || 'recently'}</small>
      </div>
      <h3 className="answer-heading">{answers.length} Answers</h3>
      {answers.length === 0 ? (
        <p style={{ color: '#74809a', fontSize: 13, marginBottom: 16 }}>No answers yet. Share your understanding below!</p>
      ) : (
        answers.map(a => (
          <div className={'answer-card ' + (a.accepted ? 'accepted' : '')} key={a.id}>
            {a.accepted && (
              <span className="accepted-label">
                <CheckCircle2 size={14} /> Accepted answer
              </span>
            )}
            <div className="answer-top">
              <Avatar initials={a.initials || 'ST'} />
              <strong>{a.author}</strong>
              <span>· {a.votes || 0} votes</span>
              {!a.accepted && (
                <button className="accept-btn" onClick={() => markAccepted(a.id)}>
                  Mark accepted
                </button>
              )}
            </div>
            <p>{a.text}</p>
          </div>
        ))
      )}
      <div className="answer-form">
        <textarea
          placeholder="Share a step-by-step solution..."
          value={answer}
          onChange={e => setAnswer(e.target.value)}
        />
        <button className="primary-btn" disabled={!answer.trim() || submitting} onClick={submit}>
          {submitting ? 'Saving…' : 'Post answer to Firebase'}
        </button>
      </div>
    </Modal>
  );
}

function Planner({ user, setPlans, setTasks, plans, onPlanSaved }) {
  const [exam, setExam] = useState('');
  const [subjects, setSubjects] = useState([
    { name: '', weak: '' }
  ]);
  const [generated, setGenerated] = useState(plans[0] || null);
  const [plannerError, setPlannerError] = useState('');

  const create = async () => {
    setPlannerError('');
    if (!exam) {
      setPlannerError('Please select your exam date.');
      return;
    }
    const validSubjects = subjects.filter(s => s.name && s.name.trim());
    if (validSubjects.length === 0) {
      setPlannerError('Please enter at least one subject name.');
      return;
    }

    const examDate = new Date(exam);
    const todayDate = new Date();
    const days = Math.max(3, Math.ceil((examDate - todayDate) / 86400000));
    const sessions = Array.from({ length: Math.min(days, 12) }, (_, i) => {
      const s = validSubjects[i % validSubjects.length];
      const isWeak = i < validSubjects.length * 2 && s.weak && s.weak.trim();
      return {
        id: 'sess_' + Date.now() + '_' + i,
        date: datePlus(i + 1),
        topic: isWeak ? s.weak.trim() : `${s.name.trim()} revision`,
        subject: s.name.trim(),
        focus: isWeak ? 'Deep focus' : 'Revision'
      };
    });
    const plan = {
      id: 'plan_' + Date.now(),
      exam,
      sessions,
      createdAt: Date.now()
    };
    setGenerated(plan);
    await FirestoreService.savePlan(user?.id, plan);
    if (onPlanSaved) onPlanSaved();
  };

  const addAll = async () => {
    if (!generated || !generated.sessions) return;
    for (const s of generated.sessions) {
      await FirestoreService.addTask(user?.id, {
        title: `Study: ${s.topic}`,
        description: `${s.subject} ${s.focus} session`,
        due: s.date,
        category: 'Study',
        priority: s.focus === 'Deep focus' ? 'High' : 'Medium',
        status: 'To do',
        source: 'Study Plan'
      });
    }
  };

  return (
    <>
      <div className="page-heading tight">
        <div>
          <p className="eyebrow">AI-ASSISTED PREP</p>
          <h1>Study Planner <span className="ai-badge"><Sparkles size={14} /> AI</span></h1>
          <p>Turn your exam goals into an intentional study routine saved to Firestore.</p>
        </div>
      </div>
      <div className="planner-layout">
        <div className="panel planner-form">
          <h2>Build your revision plan</h2>
          <p className="subcopy">Tell us your exam date and where you need the most support.</p>
          <label>
            When is your exam?
            <input
              type="date"
              value={exam}
              onChange={e => {
                setPlannerError('');
                setExam(e.target.value);
              }}
            />
          </label>
          <div className="subject-form-head">
            <label>Your subjects</label>
            <button onClick={() => setSubjects([...subjects, { name: '', weak: '' }])}>
              <Plus size={15} /> Add subject
            </button>
          </div>
          {subjects.map((s, i) => (
            <div className="subject-entry" key={i}>
              <span>{i + 1}</span>
              <input
                placeholder="Subject name (e.g. Database Systems)"
                value={s.name}
                onChange={e => {
                  setPlannerError('');
                  setSubjects(subjects.map((x, j) => j === i ? { ...x, name: e.target.value } : x));
                }}
              />
              <input
                placeholder="Weak topic / area (e.g. Normalisation)"
                value={s.weak}
                onChange={e => {
                  setPlannerError('');
                  setSubjects(subjects.map((x, j) => j === i ? { ...x, weak: e.target.value } : x));
                }}
              />
              {subjects.length > 1 && (
                <button onClick={() => setSubjects(subjects.filter((_, j) => j !== i))} title="Remove subject">
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
          {plannerError && (
            <div className="planner-validation-error">
              {plannerError}
            </div>
          )}
          <button className="primary-btn full" onClick={create}>
            <Sparkles size={16} /> Generate & Save Plan
          </button>
        </div>
        <div className="plan-preview panel">
          {generated ? (
            <>
              <div className="plan-head">
                <div>
                  <span className="success-dot"><CheckCircle2 size={17} /></span>
                  <h2>Your revision roadmap</h2>
                  <p>Balanced around your self-rated weak areas.</p>
                </div>
                <button className="primary-btn" onClick={addAll}>
                  <Plus size={16} /> Add all to tasks
                </button>
              </div>
              <div className="timeline">
                {generated.sessions?.map((s) => (
                  <div className="session" key={s.id}>
                    <div className="session-date">
                      <b>{new Date(s.date + 'T12:00').toLocaleDateString('en-US', { day: 'numeric' })}</b>
                      <small>{new Date(s.date + 'T12:00').toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</small>
                    </div>
                    <span className="timeline-dot" />
                    <div className="session-card">
                      <Pill tone={s.focus === 'Deep focus' ? 'purple' : 'muted'}>{s.focus}</Pill>
                      <strong>{s.topic}</strong>
                      <small>{s.subject} · 90 min session</small>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-plan">
              <span><CalendarDays size={32} /></span>
              <h3>Your plan will appear here</h3>
              <p>Fill in your subjects and exam date to generate a focused, day-wise revision schedule.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function TaskManager({ user, tasks, setTasks, onTaskAdded }) {
  const [sortBy, setSortBy] = useState('due');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [draft, setDraft] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    due: '',
    category: 'Assignment',
    priority: 'Medium'
  });
  const [isAdding, setIsAdding] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    const focusTaskForm = () => titleRef.current?.focus();
    window.addEventListener('new-task', focusTaskForm);
    return () => window.removeEventListener('new-task', focusTaskForm);
  }, []);

  const completed = tasks.filter(t => t.status === 'Completed').length;
  const pending = tasks.length - completed;

  const query = searchQuery.trim().toLowerCase();
  const sortedTasks = [...tasks].sort((a, b) =>
    sortBy === 'priority' ? priorityRank(b.priority) - priorityRank(a.priority) : dateValue(a.due) - dateValue(b.due)
  );

  const filteredTasks = sortedTasks.filter(t => {
    if (!query) return true;
    const title = (t.title || '').toLowerCase();
    const desc = (t.description || '').toLowerCase();
    return title.includes(query) || desc.includes(query);
  });

  const incompleteTasks = filteredTasks.filter(t => t.status !== 'Completed');
  const completedTasks = filteredTasks.filter(t => t.status === 'Completed');

  const addTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || isAdding) return;
    setIsAdding(true);
    try {
      await FirestoreService.addTask(user?.id, form);
      setForm({ title: '', description: '', due: '', category: 'Assignment', priority: 'Medium' });
      titleRef.current?.focus();
      if (onTaskAdded) onTaskAdded();
    } finally {
      setIsAdding(false);
    }
  };

  const toggleTask = async (task) => {
    await FirestoreService.toggleTaskStatus(task.id, task.status);
  };

  const removeTask = async (taskId) => {
    await FirestoreService.deleteTask(taskId);
  };

  const save = async (t) => {
    await FirestoreService.updateTask(t.id, t);
    setDraft(null);
  };

  const clearCompleted = async () => {
    for (const t of completedTasks) {
      await FirestoreService.deleteTask(t.id);
    }
  };

  const renderTasks = (items) =>
    items.map(t => {
      const done = t.status === 'Completed';
      const overdue = !done && isTaskOverdue(t.due);
      const urgent24h = !done && isTaskUrgent24h(t);
      return (
        <article
          className={'task-card ' + (done ? 'completed ' : '') + (overdue ? 'overdue ' : '') + (urgent24h ? 'urgent-24h ' : '')}
          key={t.id}
          id={`task-card-${t.id}`}
        >
          <div className="task-card-top">
            <div>
              <h3>
                {t.title}
                {urgent24h && (
                  <span className="urgent-24h-card-badge" title="High priority due within 24 hours">
                    <i /> Due &lt;24h
                  </span>
                )}
              </h3>
              {t.description && <p>{t.description}</p>}
            </div>
            <span className={'priority-badge ' + (t.priority || 'Medium').toLowerCase()}>
              <i />{t.priority || 'Medium'}
            </span>
          </div>
          <div className="task-card-meta">
            <span>{t.category || 'General'}</span>
            <b>·</b>
            <span className={overdue || urgent24h ? 'overdue-label' : ''}>
              {urgent24h ? `🚨 ${taskDueLabel(t.due, done)}` : taskDueLabel(t.due, done)}
            </span>
            {done && (
              <>
                <b>·</b>
                <em><Check size={14} /> Completed</em>
              </>
            )}
          </div>
          <div className="task-card-actions">
            <button className="task-state-btn" onClick={() => toggleTask(t)}>
              {done ? <><RotateCcw size={15} /> Undo</> : <><Check size={16} /> Done</>}
            </button>
            <button onClick={() => setDraft(t)}><Pencil size={15} /> Edit</button>
            <button onClick={() => removeTask(t.id)}><Trash2 size={15} /> Delete</button>
          </div>
        </article>
      );
    });

  return (
    <>
      <div className="task-manager-heading">
        <p className="eyebrow">PERSISTENT ACADEMIC TRACKER</p>
        <h1>Task Manager</h1>
        <p>Your academic deadlines and tasks are saved in Firebase Firestore and synced across tabs.</p>
      </div>
      <div className="task-manager-layout">
        <form className="task-entry-card" onSubmit={addTask}>
          <h2>Add a task</h2>
          <label>
            Title
            <input
              ref={titleRef}
              value={form.title}
              placeholder="e.g. DBMS assignment — B+ Trees & Indexing"
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Description <span>(optional)</span>
            <textarea
              value={form.description}
              placeholder="Add requirements, problem numbers, or lab instructions."
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="task-form-row">
            <label>
              Due date
              <input type="date" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} />
            </label>
            <label>
              Category
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option>Assignment</option>
                <option>Practical</option>
                <option>Exam</option>
                <option>Study</option>
                <option>Personal</option>
              </select>
            </label>
          </div>
          <fieldset>
            <legend>Priority</legend>
            <div className="priority-picker">
              {['Low', 'Medium', 'High'].map(priority => (
                <button
                  type="button"
                  className={form.priority === priority ? 'selected' : ''}
                  data-priority={priority.toLowerCase()}
                  onClick={() => setForm({ ...form, priority })}
                  key={priority}
                >
                  <i />{priority}
                </button>
              ))}
            </div>
          </fieldset>
          <button className="add-task-btn" type="submit" disabled={!form.title.trim() || isAdding}>
            <Plus size={16} /> {isAdding ? 'Saving to Firebase…' : 'Add task'}
          </button>
        </form>

        <section className="task-board">
          <div className="task-board-toolbar">
            <span className="task-board-counts">
              {query ? (
                `${filteredTasks.length} of ${tasks.length} tasks`
              ) : (
                `${pending} pending · ${completed} completed`
              )}
            </span>
            <div className="task-board-search">
              <Search size={14} className="task-board-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tasks by title or description…"
                aria-label="Search tasks by title or description"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="task-board-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="task-board-sort">
              <button className={sortBy === 'due' ? 'selected' : ''} onClick={() => setSortBy('due')}>
                Sort by due date
              </button>
              <button className={sortBy === 'priority' ? 'selected' : ''} onClick={() => setSortBy('priority')}>
                Sort by priority
              </button>
            </div>
          </div>

          {tasks.length ? (
            <>
              {query && filteredTasks.length === 0 ? (
                <div className="task-no-search-results">
                  <Search size={26} />
                  <p>No tasks matching <strong>"{searchQuery}"</strong></p>
                  <button type="button" onClick={() => setSearchQuery('')}>Clear search</button>
                </div>
              ) : (
                <>
                  {incompleteTasks.length ? (
                    <div className="task-card-list">{renderTasks(incompleteTasks)}</div>
                  ) : (
                    <div className="task-no-pending">
                      {query ? 'No incomplete tasks match your search.' : 'No incomplete tasks — you’re all caught up! 🎉'}
                    </div>
                  )}
                  {completedTasks.length > 0 && (
                    <section className="completed-task-group">
                      <div className="completed-task-group-head">
                        <button
                          className="completed-group-trigger"
                          aria-expanded={showCompleted}
                          onClick={() => setShowCompleted(open => !open)}
                        >
                          <ChevronDown size={17} className={showCompleted ? 'open' : ''} />
                          Completed tasks <span>{completedTasks.length}</span>
                        </button>
                        <button className="clear-completed" onClick={clearCompleted}>
                          <Trash2 size={14} /> Clear completed
                        </button>
                      </div>
                      {showCompleted && (
                        <div className="task-card-list completed-task-list">
                          {renderTasks(completedTasks)}
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="task-empty">
              <span><ListChecks size={22} /></span>
              <h2>No tasks yet</h2>
              <p>Add your first assignment, practical, or study task and it will be stored permanently in Firestore.</p>
            </div>
          )}
        </section>
      </div>

      {draft && <TaskModal task={draft} onClose={() => setDraft(null)} onSave={save} />}
    </>
  );
}

function TaskModal({ task, onClose, onSave }) {
  const [t, setT] = useState({
    ...task,
    description: task.description || '',
    category: task.category || 'Assignment',
    priority: task.priority || 'Medium'
  });
  return (
    <Modal title="Edit Task (Firebase Firestore)" onClose={onClose}>
      <div className="form-grid">
        <label>
          Task title
          <input autoFocus value={t.title || ''} onChange={e => setT({ ...t, title: e.target.value })} />
        </label>
        <label>
          Description
          <textarea
            value={t.description}
            placeholder="Add any details you want to remember."
            onChange={e => setT({ ...t, description: e.target.value })}
          />
        </label>
        <div className="two-col">
          <label>
            Due date
            <input type="date" value={t.due || ''} onChange={e => setT({ ...t, due: e.target.value })} />
          </label>
          <label>
            Category
            <select value={t.category} onChange={e => setT({ ...t, category: e.target.value })}>
              <option>Assignment</option>
              <option>Practical</option>
              <option>Exam</option>
              <option>Study</option>
              <option>Personal</option>
            </select>
          </label>
        </div>
        <div className="two-col">
          <label>
            Priority
            <select value={t.priority} onChange={e => setT({ ...t, priority: e.target.value })}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
          <label>
            Status
            <select value={t.status || 'To do'} onChange={e => setT({ ...t, status: e.target.value })}>
              <option>To do</option>
              <option>In progress</option>
              <option>Completed</option>
            </select>
          </label>
        </div>
        <button className="primary-btn full" disabled={!t.title?.trim()} onClick={() => onSave(t)}>
          Save changes to Firebase
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={'modal ' + (wide ? 'wide' : '')} onMouseDown={e => e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose}><X size={19} /></button>
        </header>
        {children}
      </div>
    </div>
  );
}

function formatDate(d) {
  if (!d) return 'No due date';
  return new Date(d + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dateValue(d) {
  return d ? new Date(d + 'T12:00').getTime() : Number.MAX_SAFE_INTEGER;
}

function priorityRank(priority) {
  return { High: 3, Medium: 2, Low: 1 }[priority] || 2;
}

function isTaskOverdue(d) {
  if (!d) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(d + 'T12:00') < endOfToday;
}

function taskDueLabel(d, completed) {
  if (!d) return 'No due date';
  if (completed) return `Due ${formatDate(d)}`;
  const todayAtMidday = new Date();
  todayAtMidday.setHours(12, 0, 0, 0);
  const days = Math.round((new Date(d + 'T12:00') - todayAtMidday) / 86400000);
  if (days < 0) return `Overdue by ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'}`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due ${formatDate(d)}`;
}

function NotificationsPopover({
  notifications,
  readNotifIds,
  urgentTasks = [],
  onMarkAllRead,
  onSelectNotification,
  onToggleTask,
  onClose
}) {
  const unreadCount = notifications.filter(n => !readNotifIds.has(n.id)).length;

  return (
    <div className="notif-popover" role="dialog" aria-label="Academic notifications">
      <div className="notif-header">
        <div className="notif-header-title">
          <h3>Notifications</h3>
          {unreadCount > 0 && <span className="notif-count-pill">{unreadCount} new</span>}
        </div>
        {unreadCount > 0 && (
          <button className="notif-mark-read" onClick={onMarkAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {urgentTasks.length > 0 && (
        <div className="notif-section-urgent">
          <span className="notif-section-urgent-title">
            <AlertTriangle size={13} /> {urgentTasks.length} Urgent Alert{urgentTasks.length > 1 ? 's' : ''} (&lt;24h)
          </span>
          {isNotificationSupported() && getNotificationPermission() !== 'granted' && (
            <button
              className="notif-mark-read"
              style={{ fontSize: 11, color: '#ea580c' }}
              onClick={async (e) => {
                e.stopPropagation();
                await requestNotificationPermission();
              }}
            >
              Enable alerts
            </button>
          )}
        </div>
      )}

      <div className="notif-list">
        {notifications.length === 0 ? (
          <div className="notif-empty">
            <CheckCheck size={28} />
            <strong>All caught up!</strong>
            <p>No notifications right now. Your tasks and schedule are current.</p>
          </div>
        ) : (
          notifications.map(item => {
            const isUnread = !readNotifIds.has(item.id);
            const isUrgent = item.type === 'urgent';
            return (
              <div
                key={item.id}
                className={`notif-item ${isUnread ? 'unread' : ''} ${isUrgent ? 'urgent-item' : ''}`}
                onClick={() => onSelectNotification(item)}
              >
                <div className={`notif-icon-wrap ${item.type}`}>
                  {item.type === 'urgent' && <AlertTriangle size={16} />}
                  {item.type === 'overdue' && <AlertTriangle size={16} />}
                  {item.type === 'today' && <Clock3 size={16} />}
                  {item.type === 'high' && <AlertCircle size={16} />}
                  {item.type === 'doubt' && <MessageCircleQuestion size={16} />}
                  {item.type === 'session' && <Calendar size={16} />}
                  {item.type === 'system' && <Cloud size={16} />}
                </div>
                <div className="notif-content">
                  <div className="notif-content-top">
                    <h4 className="notif-title">{item.title}</h4>
                    <span className="notif-time">{item.time}</span>
                  </div>
                  <p className="notif-desc">{item.desc}</p>
                </div>
                {isUrgent && onToggleTask && item.task && (
                  <button
                    className="notif-badge-quickdone"
                    title="Mark task completed"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTask(item.task);
                    }}
                  >
                    Done
                  </button>
                )}
                {isUnread && !isUrgent && <span className="notif-unread-dot" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function UrgentTaskBanner({
  urgentTasks,
  onNavigateToTasks,
  onMarkTaskDone,
  onDismiss
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const safeIndex = Math.min(currentIndex, Math.max(0, urgentTasks.length - 1));
  const task = urgentTasks[safeIndex];
  if (!task) return null;

  return (
    <div className="urgent-task-banner" role="alert" aria-live="assertive">
      <div className="urgent-banner-left">
        <div className="urgent-beacon-wrap">
          <AlertTriangle size={20} />
          <span className="urgent-beacon-pulse" />
        </div>
        <div className="urgent-banner-text">
          <div className="urgent-banner-header-row">
            <span className="urgent-tag-badge">High Priority Alert</span>
            <span className={`urgent-countdown-pill ${task.isOverdue ? 'overdue' : ''}`}>
              <Clock3 size={12} />
              {task.urgencyLabel}
            </span>
            {urgentTasks.length > 1 && (
              <span className="urgent-countdown-pill" style={{ opacity: 0.85 }}>
                {safeIndex + 1} of {urgentTasks.length} urgent
              </span>
            )}
          </div>
          <h4 className="urgent-task-title" title={task.title}>
            {task.title}
          </h4>
          {task.description && (
            <p className="urgent-task-desc" title={task.description}>
              {task.description}
            </p>
          )}
        </div>
      </div>

      <div className="urgent-banner-actions">
        {urgentTasks.length > 1 && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="urgent-action-btn chime"
              title="Previous urgent task"
              onClick={() => setCurrentIndex((safeIndex - 1 + urgentTasks.length) % urgentTasks.length)}
            >
              ◀
            </button>
            <button
              className="urgent-action-btn chime"
              title="Next urgent task"
              onClick={() => setCurrentIndex((safeIndex + 1) % urgentTasks.length)}
            >
              ▶
            </button>
          </div>
        )}
        <button
          className="urgent-action-btn chime"
          title="Play alert chime"
          onClick={() => playAlertChime()}
        >
          <Volume2 size={15} />
        </button>
        <button
          className="urgent-action-btn secondary"
          onClick={() => onMarkTaskDone(task)}
        >
          <Check size={14} /> Mark Done
        </button>
        <button
          className="urgent-action-btn primary"
          onClick={() => onNavigateToTasks(task)}
        >
          View in Tasks <ChevronRight size={14} />
        </button>
        <button
          className="urgent-dismiss-btn"
          title="Dismiss alert banner"
          aria-label="Dismiss alert banner"
          onClick={() => onDismiss(task.id)}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function QuickAddMenu({ onAddTask, onAskDoubt, onStudyPlan, onAskAdvisor, onClose }) {
  return (
    <div className="quick-add-menu" role="menu">
      <button className="quick-add-item" role="menuitem" onClick={onAddTask}>
        <div className="quick-add-icon task">
          <CheckSquare size={16} />
        </div>
        <div className="quick-add-text">
          <span className="quick-add-label">New Task</span>
          <span className="quick-add-sub">Assignment, exam or reading</span>
        </div>
      </button>

      <button className="quick-add-item" role="menuitem" onClick={onAskDoubt}>
        <div className="quick-add-icon doubt">
          <MessageCircleQuestion size={16} />
        </div>
        <div className="quick-add-text">
          <span className="quick-add-label">Post a Doubt</span>
          <span className="quick-add-sub">Ask campus community</span>
        </div>
      </button>

      <button className="quick-add-item" role="menuitem" onClick={onStudyPlan}>
        <div className="quick-add-icon plan">
          <Calendar size={16} />
        </div>
        <div className="quick-add-text">
          <span className="quick-add-label">Study Plan</span>
          <span className="quick-add-sub">Build revision roadmap</span>
        </div>
      </button>

      <button className="quick-add-item" role="menuitem" onClick={onAskAdvisor}>
        <div className="quick-add-icon advisor">
          <Bot size={16} />
        </div>
        <div className="quick-add-text">
          <span className="quick-add-label">AI Advisor</span>
          <span className="quick-add-sub">Plan workload strategy</span>
        </div>
      </button>
    </div>
  );
}

function SearchCommandPalette({
  isOpen,
  onClose,
  tasks,
  doubts,
  plans,
  onNavigate,
  onSelectDoubt,
  onQuickTask,
  onAskDoubt
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Filter tasks
  const matchedTasks = tasks.filter(t => {
    if (!q) return false;
    return (
      (t.title || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q) ||
      (t.priority || '').toLowerCase().includes(q)
    );
  }).slice(0, 5);

  // Filter doubts
  const matchedDoubts = doubts.filter(d => {
    if (!q) return false;
    return (
      (d.title || '').toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q) ||
      (d.subject || '').toLowerCase().includes(q)
    );
  }).slice(0, 4);

  // Filter plans
  const matchedSessions = plans.flatMap(p => (p.sessions || []).map(s => ({ ...s, planSubject: p.subject }))).filter(s => {
    if (!q) return false;
    return (
      (s.topic || '').toLowerCase().includes(q) ||
      (s.planSubject || '').toLowerCase().includes(q)
    );
  }).slice(0, 3);

  // Navigation options
  const navOptions = [
    { id: 'dashboard', label: 'Dashboard', sub: 'Academic summary & upcoming deliverables', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks Board', sub: 'Manage assignments, practicals & exams', icon: CheckSquare },
    { id: 'advisor', label: 'AI Workload Advisor', sub: 'Ask Gemini workload assistant', icon: Bot },
    { id: 'doubts', label: 'Doubts Forum', sub: 'Peer Q&A, answers & verified solutions', icon: MessageCircleQuestion },
    { id: 'planner', label: 'Study Planner', sub: 'AI semester roadmap & study sessions', icon: CalendarDays },
    { id: 'profile', label: 'My Student Profile', sub: 'Manage department, semester, roll number & bio', icon: User }
  ].filter(n => !q || n.label.toLowerCase().includes(q) || n.sub.toLowerCase().includes(q));

  const hasMatches = matchedTasks.length > 0 || matchedDoubts.length > 0 || matchedSessions.length > 0 || (q && navOptions.length > 0);

  return (
    <div className="search-palette-backdrop" onMouseDown={onClose}>
      <div className="search-palette" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Quick search">
        <div className="search-palette-input-wrap">
          <Search size={18} />
          <input
            ref={inputRef}
            className="search-palette-input"
            placeholder="Search tasks, doubts, study plans, or jump to page..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query ? (
            <button className="search-clear-btn" onClick={() => setQuery('')} title="Clear search" aria-label="Clear search">
              <X size={16} />
            </button>
          ) : (
            <span className="search-esc-badge">ESC</span>
          )}
        </div>

        <div className="search-palette-body">
          {!q ? (
            <>
              <div>
                <p className="search-group-title">Quick Actions</p>
                <div className="search-group-items">
                  <button
                    className="search-item"
                    onClick={() => { onClose(); onQuickTask(); }}
                  >
                    <div className="search-item-left">
                      <span className="search-item-icon"><Plus size={15} /></span>
                      <div className="search-item-info">
                        <strong className="search-item-title">Add a New Task</strong>
                        <span className="search-item-sub">Record assignment, exam, or practical</span>
                      </div>
                    </div>
                    <span className="search-badge action">Action</span>
                  </button>

                  <button
                    className="search-item"
                    onClick={() => { onClose(); onAskDoubt(); }}
                  >
                    <div className="search-item-left">
                      <span className="search-item-icon"><MessageCircleQuestion size={15} /></span>
                      <div className="search-item-info">
                        <strong className="search-item-title">Post a Doubt</strong>
                        <span className="search-item-sub">Ask the campus community for help</span>
                      </div>
                    </div>
                    <span className="search-badge action">Action</span>
                  </button>
                </div>
              </div>

              <div>
                <p className="search-group-title">Jump to Page</p>
                <div className="search-group-items">
                  {navOptions.map(nav => {
                    const Icon = nav.icon;
                    return (
                      <button
                        key={nav.id}
                        className="search-item"
                        onClick={() => { onClose(); onNavigate(nav.id); }}
                      >
                        <div className="search-item-left">
                          <span className="search-item-icon"><Icon size={15} /></span>
                          <div className="search-item-info">
                            <strong className="search-item-title">{nav.label}</strong>
                            <span className="search-item-sub">{nav.sub}</span>
                          </div>
                        </div>
                        <span className="search-badge action">Jump</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {matchedTasks.length > 0 && (
                <div>
                  <p className="search-group-title">Tasks ({matchedTasks.length})</p>
                  <div className="search-group-items">
                    {matchedTasks.map(t => (
                      <button
                        key={t.id}
                        className="search-item"
                        onClick={() => { onClose(); onNavigate('tasks'); }}
                      >
                        <div className="search-item-left">
                          <span className="search-item-icon"><CheckSquare size={15} /></span>
                          <div className="search-item-info">
                            <strong className="search-item-title">{t.title}</strong>
                            <span className="search-item-sub">
                              {t.category || 'Assignment'} · Due {t.due || 'No date'} · {t.priority} priority
                            </span>
                          </div>
                        </div>
                        <div className="search-item-right">
                          <span className="search-badge task">{t.status || 'To do'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {matchedDoubts.length > 0 && (
                <div>
                  <p className="search-group-title">Doubts Forum ({matchedDoubts.length})</p>
                  <div className="search-group-items">
                    {matchedDoubts.map(d => (
                      <button
                        key={d.id}
                        className="search-item"
                        onClick={() => { onClose(); onSelectDoubt(d); }}
                      >
                        <div className="search-item-left">
                          <span className="search-item-icon"><MessageCircleQuestion size={15} /></span>
                          <div className="search-item-info">
                            <strong className="search-item-title">{d.title}</strong>
                            <span className="search-item-sub">{d.subject} · {d.answers?.length || 0} answers</span>
                          </div>
                        </div>
                        <div className="search-item-right">
                          <span className="search-badge doubt">{d.semester || 'Doubt'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {matchedSessions.length > 0 && (
                <div>
                  <p className="search-group-title">Study Sessions ({matchedSessions.length})</p>
                  <div className="search-group-items">
                    {matchedSessions.map((s, idx) => (
                      <button
                        key={idx}
                        className="search-item"
                        onClick={() => { onClose(); onNavigate('planner'); }}
                      >
                        <div className="search-item-left">
                          <span className="search-item-icon"><Calendar size={15} /></span>
                          <div className="search-item-info">
                            <strong className="search-item-title">{s.topic}</strong>
                            <span className="search-item-sub">{s.planSubject} · {s.date} ({s.duration})</span>
                          </div>
                        </div>
                        <div className="search-item-right">
                          <span className="search-badge plan">Study</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {navOptions.length > 0 && (
                <div>
                  <p className="search-group-title">Pages ({navOptions.length})</p>
                  <div className="search-group-items">
                    {navOptions.map(nav => {
                      const Icon = nav.icon;
                      return (
                        <button
                          key={nav.id}
                          className="search-item"
                          onClick={() => { onClose(); onNavigate(nav.id); }}
                        >
                          <div className="search-item-left">
                            <span className="search-item-icon"><Icon size={15} /></span>
                            <div className="search-item-info">
                              <strong className="search-item-title">{nav.label}</strong>
                              <span className="search-item-sub">{nav.sub}</span>
                            </div>
                          </div>
                          <span className="search-badge action">Jump</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!hasMatches && (
                <div className="notif-empty" style={{ padding: '30px 20px' }}>
                  <Search size={26} />
                  <strong>No results found</strong>
                  <p>We couldn't find any tasks, doubts, or pages matching "{query}".</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="search-palette-footer">
          <div className="search-footer-shortcuts">
            <span><kbd>ESC</kbd> to close</span>
            <span><kbd>Click</kbd> to jump</span>
          </div>
          <span>CampusCore Search</span>
        </div>
      </div>
    </div>
  );
}

function QuickTaskModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    due: '',
    category: 'Assignment',
    priority: 'Medium'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await FirestoreService.addTask(user?.id, form);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add Task (Saved to Firebase)" onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Task title
          <input
            autoFocus
            required
            placeholder="e.g. Complete Operating Systems lab 4"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            placeholder="Key deliverables, rubric requirements, or notes..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </label>
        <div className="two-col">
          <label>
            Due date
            <input
              type="date"
              value={form.due}
              onChange={e => setForm({ ...form, due: e.target.value })}
            />
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            >
              <option>Assignment</option>
              <option>Practical</option>
              <option>Exam</option>
              <option>Study</option>
              <option>Personal</option>
            </select>
          </label>
        </div>
        <div className="two-col">
          <label>
            Priority
            <select
              value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value })}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
        </div>
        <button
          type="submit"
          className="primary-btn full"
          disabled={!form.title.trim() || submitting}
        >
          {submitting ? 'Saving to Firebase…' : 'Add task to workload'}
        </button>
      </form>
    </Modal>
  );
}

createRoot(document.getElementById('root')).render(<App />);
