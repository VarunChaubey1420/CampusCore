// Academic Local Notification System & Visual Alert Utilities
// Specifically for High-Priority tasks due within the next 24 hours

/**
 * Parses a due date string (YYYY-MM-DD or ISO string) to a local Date object.
 * For standard YYYY-MM-DD dates, assumes end-of-day deadline (23:59:59.999).
 */
export function parseTaskDueDate(dueStr) {
  if (!dueStr) return null;
  if (dueStr.includes('T')) {
    const d = new Date(dueStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const parts = dueStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0])) return null;
  // year, monthIndex (0-based), day, 23:59:59
  return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
}

/**
 * Returns hours remaining from now until due date (can be negative if overdue).
 */
export function getHoursRemaining(dueDate) {
  if (!dueDate) return null;
  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Checks if a task is marked 'High' priority and due within the next 24 hours.
 * Also considers overdue high-priority tasks as critically urgent.
 */
export function isTaskUrgent24h(task) {
  if (!task || task.status === 'Completed') return false;
  const priority = (task.priority || '').toLowerCase();
  if (priority !== 'high') return false;
  if (!task.due) return false;

  const dueDate = parseTaskDueDate(task.due);
  if (!dueDate) return false;

  const hoursRemaining = getHoursRemaining(dueDate);
  if (hoursRemaining === null) return false;

  // Due within 24 hours or overdue within the last 72 hours
  return hoursRemaining <= 24 && hoursRemaining >= -72;
}

/**
 * Returns all active high-priority tasks due within 24 hours, annotated with time labels.
 */
export function getUrgentHighPriorityTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  const now = new Date();

  return tasks
    .filter(isTaskUrgent24h)
    .map(task => {
      const dueDate = parseTaskDueDate(task.due);
      const hours = getHoursRemaining(dueDate);
      const isOverdue = hours !== null && hours < 0;

      let urgencyLabel = 'Due today';
      if (isOverdue) {
        const absHours = Math.abs(Math.round(hours));
        urgencyLabel = absHours < 1 ? 'Overdue just now' : `Overdue by ${absHours}h`;
      } else if (hours !== null) {
        const roundedHours = Math.max(1, Math.round(hours));
        if (roundedHours <= 1) {
          urgencyLabel = 'Due in < 1 hour!';
        } else if (roundedHours <= 24) {
          urgencyLabel = `Due in ~${roundedHours}h`;
        }
      }

      return {
        ...task,
        dueDate,
        hoursRemaining: hours,
        isOverdue,
        urgencyLabel
      };
    })
    .sort((a, b) => (a.hoursRemaining || 0) - (b.hoursRemaining || 0));
}

/**
 * Plays a pleasant, non-intrusive two-tone academic alert chime using the Web Audio API.
 * Works offline, no external assets needed.
 */
export function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1 (E5 - 659 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2 (A5 - 880 Hz, harmonizing and pleasant)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.14);
    gain2.gain.setValueAtTime(0, now + 0.14);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.6);
  } catch (err) {
    // Audio may be prevented prior to user interaction
  }
}

/**
 * Native Browser Notification Helpers
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    return 'denied';
  }
}

const ALERTED_STORAGE_KEY = 'campuscore_alerted_tasks';

export function hasTaskBeenAlerted(taskId) {
  try {
    const raw = sessionStorage.getItem(ALERTED_STORAGE_KEY);
    const set = raw ? new Set(JSON.parse(raw)) : new Set();
    return set.has(taskId);
  } catch {
    return false;
  }
}

export function markTaskAsAlerted(taskId) {
  try {
    const raw = sessionStorage.getItem(ALERTED_STORAGE_KEY);
    const set = raw ? new Set(JSON.parse(raw)) : new Set();
    set.add(taskId);
    sessionStorage.setItem(ALERTED_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

/**
 * Fires a local system notification (or browser alert) for an urgent task.
 */
export function triggerTaskAlert(task, options = {}) {
  const { playSound = true, force = false } = options;

  if (!task) return false;
  if (!force && hasTaskBeenAlerted(task.id)) return false;

  markTaskAsAlerted(task.id);

  if (playSound) {
    playAlertChime();
  }

  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      const title = `🚨 High Priority Alert: ${task.title}`;
      const body = `Due ${task.urgencyLabel || 'within 24 hours'} (${task.category || 'Assignment'}). Click to view in CampusCore.`;
      const notif = new Notification(title, {
        body,
        tag: `urgent-${task.id}`,
        requireInteraction: true
      });
      notif.onclick = () => {
        window.focus();
        window.dispatchEvent(new CustomEvent('campuscore-view-task', { detail: { taskId: task.id } }));
      };
      return true;
    } catch (e) {
      return false;
    }
  }

  return true;
}
