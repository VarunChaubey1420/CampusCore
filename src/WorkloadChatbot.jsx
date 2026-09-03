import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Zap,
  Clock,
  CalendarDays,
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  ListTodo,
  AlertCircle,
  Brain,
  Flame,
  ArrowRight,
  HelpCircle,
  Target,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import Markdown from 'react-markdown';
import { FirestoreService } from './lib/firestoreService';

const STARTER_PROMPTS = [
  {
    icon: Target,
    title: 'Prioritize Today\'s Work',
    prompt: 'Review my current pending tasks. How should I prioritize them for today using the Eisenhower matrix and cognitive energy levels?'
  },
  {
    icon: CalendarDays,
    title: '5-Day Exam Revision Roadmap',
    prompt: 'I have upcoming exams soon. Can you create a 5-day structured study schedule with 45-minute focus blocks and active recall?'
  },
  {
    icon: Zap,
    title: 'Deconstruct Assignment',
    prompt: 'I have a big assignment due. Help me break it down into bite-sized actionable sprints so I can stop procrastinating and start immediately.'
  },
  {
    icon: Flame,
    title: 'Burnout & Fatigue Check',
    prompt: 'I am feeling overwhelmed with deadlines. Can you evaluate my workload and give me a high-yield, realistic schedule that protects my sleep?'
  }
];

export function WorkloadChatbot({ user, tasks = [], plans = [], onTaskAdded, onPlanAdded, showToast }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('gemini-3.5-flash');
  const [includeContext, setIncludeContext] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [addedActionIds, setAddedActionIds] = useState(new Set());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Subscribe to persistent chat history from Firestore
  useEffect(() => {
    const unsub = FirestoreService.subscribeChatHistory(user?.id, (savedMessages) => {
      if (savedMessages && savedMessages.length > 0) {
        setMessages(savedMessages);
      } else {
        // Welcome message if chat is empty
        const welcomeMessage = {
          id: 'msg_welcome',
          role: 'model',
          text: `👋 Hello **${user?.user_metadata?.display_name || 'Student'}**! I am your **CampusCore AI Workload & Study Strategist**.\n\nI can help you:\n* 🎯 **Triage & prioritize** your pending assignments and lab reports\n* ⏱️ **Time-block** your day into focused 45-minute deep work sprints\n* 📚 **Design personalized revision roadmaps** for midterms and finals\n* ⚡ **Break down intimidating projects** into instant 1-click tasks\n\n${
            tasks.length > 0
              ? `I already see **${tasks.filter(t => t.status !== 'Completed').length} pending tasks** in your live workspace. Would you like me to prioritize them for you today?`
              : 'What course or deadline are you working on right now?'
          }`,
          timestamp: Date.now(),
          model: 'gemini-3.5-flash'
        };
        setMessages([welcomeMessage]);
      }
    });

    return () => unsub();
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (customPrompt) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || loading) return;

    const userMessage = {
      id: 'usr_' + Date.now(),
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Build workload context
      let workloadContext = null;
      if (includeContext) {
        const pending = tasks.filter(t => t.status !== 'Completed');
        workloadContext = {
          studentName: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Student',
          branch: user?.user_metadata?.branch || 'Computer Science & Engineering',
          year: user?.user_metadata?.year || 'Semester 6',
          pendingTasks: pending.map(t => ({
            title: t.title,
            due: t.due,
            priority: t.priority,
            category: t.category
          })),
          studyPlansSummary: plans.length > 0 ? `${plans.length} roadmaps created` : 'None'
        };
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, text: m.text })),
          model,
          workloadContext
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const modelReply = {
        id: 'bot_' + Date.now(),
        role: 'model',
        text: data.reply || 'Here is your workload plan.',
        timestamp: Date.now(),
        model: data.model || model
      };

      const updatedHistory = [...newMessages, modelReply];
      setMessages(updatedHistory);
      // Save to Firestore
      await FirestoreService.saveChatHistory(user?.id, updatedHistory, model);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage = {
        id: 'bot_err_' + Date.now(),
        role: 'model',
        text: `⚠️ **Unable to connect to planner engine**: ${err.message || 'Please try again in a moment.'}`,
        timestamp: Date.now(),
        isError: true
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Clear your conversation history?')) return;
    await FirestoreService.clearChatHistory(user?.id);
    setMessages([]);
    if (showToast) showToast('Conversation cleared.');
  };

  const handleCopy = (text, id) => {
    // Strip comments if any
    const cleanText = text.replace(/<!--[\s\S]*?-->/g, '').trim();
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    if (showToast) showToast('Plan copied to clipboard!');
  };

  // Parse structured actions out of AI response
  const parseActions = (text) => {
    try {
      const match = text.match(/<!--ACTIONS:\s*([\s\S]*?)-->/);
      if (!match) return null;
      const json = JSON.parse(match[1]);
      return Array.isArray(json) ? json : null;
    } catch {
      return null;
    }
  };

  const handleAddAction = async (action, actionIndex, msgId) => {
    const actionKey = `${msgId}_${actionIndex}`;
    if (addedActionIds.has(actionKey)) return;

    if (action.type === 'task') {
      const dueDays = typeof action.dueDays === 'number' ? action.dueDays : 1;
      const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().slice(0, 10);

      await FirestoreService.addTask(user?.id, {
        title: action.title || 'Study session',
        description: action.description || 'Generated by AI Workload Strategist',
        due: dueDate,
        category: action.category || 'Study',
        priority: action.priority || 'High',
        status: 'To do',
        source: 'AI Chatbot'
      });

      setAddedActionIds(prev => new Set(prev).add(actionKey));
      if (showToast) showToast(`Added task "${action.title}" to Task Manager!`);
      if (onTaskAdded) onTaskAdded();
    } else if (action.type === 'plan') {
      const sessionDate = new Date(Date.now() + (action.dayOffset || 1) * 86400000).toISOString().slice(0, 10);
      const planItem = {
        id: 'plan_' + Date.now(),
        exam: action.subject || 'Target Course',
        sessions: [
          {
            id: 'sess_' + Date.now(),
            date: sessionDate,
            topic: action.topic || 'Revision focus',
            subject: action.subject || 'General',
            focus: action.focus || 'Deep focus'
          }
        ],
        createdAt: Date.now()
      };

      await FirestoreService.savePlan(user?.id, planItem);
      setAddedActionIds(prev => new Set(prev).add(actionKey));
      if (showToast) showToast(`Added "${action.topic}" to your Study Roadmap!`);
      if (onPlanAdded) onPlanAdded();
    }
  };

  const handleAddAllActions = async (actions, msgId) => {
    if (!actions) return;
    for (let i = 0; i < actions.length; i++) {
      await handleAddAction(actions[i], i, msgId);
    }
  };

  const pendingCount = tasks.filter(t => t.status !== 'Completed').length;

  return (
    <div className="workload-chatbot-container">
      {/* Header Banner */}
      <div className="chatbot-header panel">
        <div className="chatbot-title-area">
          <div className="chatbot-icon-badge">
            <Bot size={24} />
          </div>
          <div>
            <div className="chatbot-tagline">
              <span className="ai-badge"><Sparkles size={13} /> Gemini Powered</span>
              <span className="live-pulse" />
              <span>Multi-Turn Academic Advisor</span>
            </div>
            <h2>Smart Workload & Study Planner</h2>
            <p>Optimize your schedule, prioritize urgent deadlines, and generate 1-click study tasks.</p>
          </div>
        </div>

        <div className="chatbot-controls-top">
          {/* Model Switcher */}
          <div className="model-selector-wrapper">
            <span className="selector-label">Model:</span>
            <select
              className="model-select"
              value={model}
              onChange={e => setModel(e.target.value)}
              title="Select Gemini Model"
            >
              <option value="gemini-3.5-flash">🧠 Gemini 3.5 Flash (Smart Strategist)</option>
              <option value="gemini-3.1-flash-lite">⚡ Gemini 3.1 Flash Lite (Lightning Fast)</option>
              <option value="gemini-3.8-flash">🔬 Gemini 3.8 Flash (Comprehensive)</option>
            </select>
          </div>

          {/* Context toggle */}
          <button
            className={`context-toggle-btn ${includeContext ? 'active' : ''}`}
            onClick={() => setIncludeContext(!includeContext)}
            title="When active, AI reads your live Firestore tasks to give contextual advice"
          >
            <SlidersHorizontal size={14} />
            <span>Workspace Sync: <b>{includeContext ? `${pendingCount} Tasks` : 'Off'}</b></span>
          </button>

          {/* Clear chat */}
          {messages.length > 1 && (
            <button
              className="icon-action-btn"
              onClick={handleClearChat}
              title="Clear conversation"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Starter suggestions if few messages */}
      {messages.length <= 1 && (
        <div className="starter-prompts-grid">
          {STARTER_PROMPTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                className="starter-prompt-card panel"
                onClick={() => handleSend(item.prompt)}
                disabled={loading}
              >
                <div className="starter-icon"><Icon size={18} /></div>
                <div className="starter-body">
                  <strong>{item.title}</strong>
                  <p>{item.prompt}</p>
                </div>
                <ArrowRight size={15} className="starter-arrow" />
              </button>
            );
          })}
        </div>
      )}

      {/* Scrollable Message Thread */}
      <div className="chat-messages-thread panel">
        {messages.map((m) => {
          const isModel = m.role === 'model';
          const actions = isModel ? parseActions(m.text) : null;
          // Clean text without raw actions comment
          const cleanText = m.text.replace(/<!--[\s\S]*?-->/g, '').trim();

          return (
            <div key={m.id} className={`chat-message-row ${isModel ? 'bot-row' : 'user-row'}`}>
              <div className="chat-avatar">
                {isModel ? <Bot size={18} /> : <User size={18} />}
              </div>

              <div className="chat-bubble-container">
                <div className="chat-bubble-meta">
                  <span className="chat-author-name">{isModel ? 'CampusCore AI' : 'You'}</span>
                  {isModel && m.model && (
                    <span className="chat-model-badge">
                      {m.model.includes('lite') ? '⚡ Flash Lite' : '🧠 3.5 Flash'}
                    </span>
                  )}
                  <span className="chat-timestamp">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="chat-bubble-content">
                  <Markdown>{cleanText}</Markdown>
                </div>

                {/* Actionable suggested tasks & plans */}
                {actions && actions.length > 0 && (
                  <div className="suggested-actions-panel">
                    <div className="actions-header">
                      <span className="actions-title">
                        <Sparkles size={14} /> 1-Click Action Items ({actions.length})
                      </span>
                      <button
                        className="add-all-btn"
                        onClick={() => handleAddAllActions(actions, m.id)}
                      >
                        <CheckCircle2 size={13} /> Add all to Workspace
                      </button>
                    </div>

                    <div className="actions-cards-list">
                      {actions.map((act, actIdx) => {
                        const actionKey = `${m.id}_${actIdx}`;
                        const isAdded = addedActionIds.has(actionKey);

                        return (
                          <div key={actIdx} className={`action-card-item ${isAdded ? 'added' : ''}`}>
                            <div className="action-card-info">
                              {act.type === 'task' ? (
                                <span className="action-type-tag task">
                                  <ListTodo size={12} /> Task
                                </span>
                              ) : (
                                <span className="action-type-tag plan">
                                  <CalendarDays size={12} /> Roadmap
                                </span>
                              )}
                              <strong>{act.title || act.topic}</strong>
                              <small>
                                {act.type === 'task'
                                  ? `${act.category || 'General'} · Priority: ${act.priority || 'Medium'}`
                                  : `${act.subject || 'Course'} · ${act.focus || 'Deep focus'}`}
                              </small>
                            </div>

                            <button
                              className={`action-add-btn ${isAdded ? 'done' : ''}`}
                              onClick={() => handleAddAction(act, actIdx, m.id)}
                              disabled={isAdded}
                            >
                              {isAdded ? (
                                <>
                                  <Check size={13} /> Saved
                                </>
                              ) : (
                                <>
                                  <Plus size={13} /> Add
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Message footer with copy button */}
                {isModel && (
                  <div className="chat-message-footer">
                    <button
                      className="chat-action-btn"
                      onClick={() => handleCopy(m.text, m.id)}
                      title="Copy plan"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check size={13} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy Plan
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="chat-message-row bot-row loading-row">
            <div className="chat-avatar thinking">
              <Bot size={18} />
            </div>
            <div className="chat-bubble-container">
              <div className="typing-indicator">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
                <small>Strategizing your optimal workload plan...</small>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-wrapper panel">
        <form
          className="chat-input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <textarea
            ref={inputRef}
            className="chat-textarea"
            placeholder="Ask AI to organize your day, balance coursework, plan exam prep, or break down assignments..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
          />

          <div className="chat-input-actions">
            <span className="key-hint">Press <b>Enter ↵</b> to send</span>
            <button
              type="submit"
              className="chat-send-btn primary-btn"
              disabled={!input.trim() || loading}
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
