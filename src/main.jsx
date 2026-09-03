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
  CheckCheck
} from 'lucide-react';
import './styles.css';
import { AuthProvider, AuthScreen, FirebaseStatusBadge, useAuthSession } from './auth';
import { LoginPage } from './LoginPage';
import { FirestoreService } from './lib/firestoreService';

const today = new Date();
const datePlus = (days) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const nav = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'doubts', label: 'Doubt Space', icon: MessageCircleQuestion },
  { id: 'planner', label: 'Study Planner', icon: CalendarDays },
  { id: 'tasks', label: 'Task Manager', icon: CheckSquare }
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
  const { user, session, loading, configured, signOut, continueAsGuest } = useAuthSession();
  if (loading) {
    return <div className="app-loading">Connecting to Firebase Cloud Firestore…</div>;
  }
  
  const currentUser = user || session?.user || null;
  if (!currentUser) {
    return <LoginPage onContinueAsGuest={continueAsGuest} />;
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

  const pending = tasks.filter(t => t.status !== 'Completed');
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Varun Chaubey';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'VC';

  const renderPage = () => ({
    dashboard: <Dashboard user={user} doubts={doubts} tasks={tasks} plans={plans} navigate={setPage} />,
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
    )
  }[page]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><GraduationCap size={22} /></span>
          <span>Campus<span>Core</span></span>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {nav.map(n => {
            const Icon = n.icon;
            return (
              <button
                className={'nav-link ' + (page === n.id ? 'active' : '')}
                key={n.id}
                onClick={() => setPage(n.id)}
              >
                <Icon size={19} />
                {n.label}
                {n.id === 'tasks' && pending.length > 0 && <b>{pending.length}</b>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="pro-card">
            <Sparkles size={17} />
            <strong>Study smarter</strong>
            <small>Plan your semester with AI.</small>
            <button onClick={() => setPage('planner')}>
              Create plan <ChevronRight size={14} />
            </button>
          </div>
          <div className="profile">
            <Avatar initials={initials} green />
            <div className="profile-info">
              <strong title={displayName}>{displayName}</strong>
              <small title={user?.email || 'Student Account'}>{user?.email || 'Student Account'}</small>
            </div>
            {authConfigured && (
              <button
                className="profile-signout"
                title="Sign out / Switch account"
                aria-label="Sign out"
                onClick={signOut}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="crumb">
            <span>CampusCore</span>
            <ChevronRight size={15} />
            <strong>{nav.find(n => n.id === page)?.label}</strong>
          </div>
          <div className="top-actions">
            <FirebaseStatusBadge />
            <button className="icon-btn" title="Search"><Search size={19} /></button>
            <button className="icon-btn notification" title="Notifications"><Bell size={19} /><i /></button>
            <button
              className="new-btn"
              onClick={() => {
                if (page === 'doubts') setShowDoubt(true);
                else if (page === 'tasks') window.dispatchEvent(new Event('new-task'));
                else setPage('tasks');
              }}
            >
              <Plus size={18} />
              {page === 'doubts' ? 'Post doubt' : page === 'tasks' ? 'New task' : 'Quick add'}
            </button>
          </div>
        </header>
        <section className="content">{renderPage()}</section>
        {toastMessage && (
          <div className="sync-toast">
            <CheckCheck size={18} style={{ color: '#4ade80' }} />
            <span>{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}

function Dashboard({ user, doubts, tasks, plans, navigate }) {
  const upcoming = plans.flatMap(p => p.sessions || []).slice(0, 3);
  const userMeta = user?.user_metadata || {};
  const studentName = userMeta.display_name || userMeta.full_name || user?.email?.split('@')[0] || 'Varun';
  const dept = userMeta.branch || 'Computer Science & Engineering';
  const sem = userMeta.year || 'Semester 6';

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{dept.toUpperCase()} · {sem.toUpperCase()}</p>
          <h1>Good day, {studentName} <span>✦</span></h1>
          <p>Your academic tasks and peer doubts are securely synchronized in Firebase.</p>
        </div>
        <button className="outline-btn" onClick={() => navigate('planner')}>
          <Sparkles size={16} /> Build study plan
        </button>
      </div>
      <div className="stat-grid">
        <Stat icon={<CircleHelp />} tint="blue" value={doubts.length} label="Active doubts" note="in campus forum" />
        <Stat icon={<Calendar />} tint="purple" value={upcoming.length || 3} label="Study sessions" note="scheduled in cloud" />
        <Stat icon={<CheckSquare />} tint="orange" value={tasks.filter(t => t.status !== 'Completed').length} label="Pending tasks" note="saved in Firebase" />
        <Stat icon={<BarChart3 />} tint="green" value="248" label="Reputation" note="+18 this week" />
      </div>
      <div className="dashboard-grid">
        <div className="panel activity">
          <PanelHead title="Recent doubts in forum" action="View all" onClick={() => navigate('doubts')} />
          {doubts.slice(0, 3).map(d => (
            <div className="doubt-row" key={d.id}>
              <Avatar initials={d.initials || 'VC'} />
              <div className="doubt-main">
                <div>
                  <Pill>{d.subject}</Pill>
                  <Pill tone="muted">{d.semester}</Pill>
                  {d.resolved && <Pill tone="success">Solved</Pill>}
                </div>
                <strong>{d.title}</strong>
                <small>by {d.author} · {d.time || 'recently'}</small>
              </div>
              <div className="answer-count">
                <MessageCircleQuestion size={16} />
                <b>{d.answers?.length || 0}</b>
              </div>
            </div>
          ))}
        </div>
        <div className="panel agenda">
          <PanelHead title="Coming up" action="View planner" onClick={() => navigate('planner')} />
          {(upcoming.length ? upcoming : [
            { topic: 'Database Normalisation & SQL', date: 'Today', subject: 'DBMS' },
            { topic: 'Neural Networks Backprop', date: 'Tomorrow', subject: 'ML' },
            { topic: 'Operating Systems Semaphores', date: 'Sat, 29 Aug', subject: 'OS' }
          ]).map((s, i) => (
            <div className="agenda-row" key={i}>
              <span className="date-box">
                <b>{i === 0 ? '27' : i === 1 ? '28' : '29'}</b>
                <small>AUG</small>
              </span>
              <div>
                <strong>{s.topic}</strong>
                <small>{s.subject} · {s.date}</small>
              </div>
              <Clock3 size={16} />
            </div>
          ))}
        </div>
      </div>
      <div className="panel pending-panel">
        <PanelHead title="Tasks to keep moving" action="Open tasks" onClick={() => navigate('tasks')} />
        <div className="task-mini-grid">
          {tasks.filter(t => t.status !== 'Completed').slice(0, 3).map(t => (
            <div className="task-mini" key={t.id}>
              <span className="check-dot" />
              <div>
                <strong>{t.title}</strong>
                <small>Due {formatDate(t.due)}</small>
              </div>
              <Pill tone="muted">{t.status}</Pill>
            </div>
          ))}
        </div>
      </div>
    </>
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
          <option>Semester 4</option>
          <option>Semester 6</option>
        </select>
      </div>
      <div className="doubt-layout">
        <div className="doubt-list">
          {filtered.length === 0 ? (
            <div className="task-empty" style={{ background: '#fff', borderRadius: 10 }}>
              <span><MessageCircleQuestion size={24} /></span>
              <h2>No doubts found</h2>
              <p>Be the first to post a question to the campus community.</p>
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
        <aside className="info-card">
          <span className="info-icon"><BookOpen size={21} /></span>
          <h3>Firebase Cloud Persistence</h3>
          <p>All doubts, upvotes, and verified answers are preserved in real-time Firestore database.</p>
          <div><b>+10</b><small>for an accepted answer</small></div>
          <div><b>+2</b><small>for every upvote</small></div>
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
    subject: 'Machine Learning',
    semester: 'Semester 6'
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
              <option>Semester 4</option>
              <option>Semester 6</option>
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
  const [exam, setExam] = useState(datePlus(14));
  const [subjects, setSubjects] = useState([
    { name: 'Database Systems', weak: 'Normalisation & SQL joins' },
    { name: 'Machine Learning', weak: 'Neural networks & Backpropagation' },
    { name: 'Operating Systems', weak: 'Deadlocks & Semaphores' }
  ]);
  const [generated, setGenerated] = useState(plans[0] || null);

  const create = async () => {
    const days = Math.max(3, Math.ceil((new Date(exam) - today) / 86400000));
    const sessions = Array.from({ length: Math.min(days, 12) }, (_, i) => {
      const s = subjects[i % subjects.length];
      const isWeak = i < subjects.length * 2;
      return {
        id: 'sess_' + Date.now() + '_' + i,
        date: datePlus(i + 1),
        topic: isWeak ? s.weak : `${s.name} revision`,
        subject: s.name,
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
            <input type="date" value={exam} onChange={e => setExam(e.target.value)} />
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
                placeholder="Subject name"
                value={s.name}
                onChange={e => setSubjects(subjects.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
              />
              <input
                placeholder="Weak topic / area"
                value={s.weak}
                onChange={e => setSubjects(subjects.map((x, j) => j === i ? { ...x, weak: e.target.value } : x))}
              />
              {subjects.length > 1 && (
                <button onClick={() => setSubjects(subjects.filter((_, j) => j !== i))}><X size={15} /></button>
              )}
            </div>
          ))}
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
  const sortedTasks = [...tasks].sort((a, b) =>
    sortBy === 'priority' ? priorityRank(b.priority) - priorityRank(a.priority) : dateValue(a.due) - dateValue(b.due)
  );
  const incompleteTasks = sortedTasks.filter(t => t.status !== 'Completed');
  const completedTasks = sortedTasks.filter(t => t.status === 'Completed');

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
      return (
        <article className={'task-card ' + (done ? 'completed ' : '') + (overdue ? 'overdue' : '')} key={t.id}>
          <div className="task-card-top">
            <div>
              <h3>{t.title}</h3>
              {t.description && <p>{t.description}</p>}
            </div>
            <span className={'priority-badge ' + (t.priority || 'Medium').toLowerCase()}>
              <i />{t.priority || 'Medium'}
            </span>
          </div>
          <div className="task-card-meta">
            <span>{t.category || 'General'}</span>
            <b>·</b>
            <span className={overdue ? 'overdue-label' : ''}>{taskDueLabel(t.due, done)}</span>
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
            <span>{pending} pending · {completed} completed</span>
            <div>
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
              {incompleteTasks.length ? (
                <div className="task-card-list">{renderTasks(incompleteTasks)}</div>
              ) : (
                <div className="task-no-pending">No incomplete tasks — you’re all caught up! 🎉</div>
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
                      Completed tasks <span>{completed}</span>
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

createRoot(document.getElementById('root')).render(<App />);
