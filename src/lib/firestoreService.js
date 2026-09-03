import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

const TASKS_COLLECTION = 'tasks';
const DOUBTS_COLLECTION = 'doubts';
const PLANS_COLLECTION = 'study_plans';
const CHAT_COLLECTION = 'chat_sessions';

const LEGACY_PRESET_TASK_IDS = ['task_1', 'task_2', 'task_3'];
const LEGACY_PRESET_TITLES = [
  'Finish DBMS assignment',
  'Review neural networks notes',
  'Submit lab record'
];

const LEGACY_PRESET_DOUBT_IDS = ['doubt_1', 'doubt_2', 'doubt_3'];
const LEGACY_PRESET_DOUBT_TITLES = [
  'How does backpropagation update weights?',
  'Difference between a process and a thread',
  'Normalisation forms — quick revision?'
];

export const FirestoreService = {
  // TASKS MANAGEMENT
  subscribeTasks(userId, callback) {
    const isLegacyTask = (t) =>
      LEGACY_PRESET_TASK_IDS.includes(t.id) || LEGACY_PRESET_TITLES.includes(t.title);

    if (!isFirebaseConfigured || !db) {
      const localKey = userId ? `cc-${userId}-tasks` : 'cc-preview-tasks';
      try {
        const saved = JSON.parse(localStorage.getItem(localKey)) || [];
        const filtered = Array.isArray(saved) ? saved.filter(t => !isLegacyTask(t)) : [];
        localStorage.setItem(localKey, JSON.stringify(filtered));
        callback(filtered);
      } catch {
        callback([]);
      }
      return () => {};
    }

    try {
      const tasksCol = collection(db, TASKS_COLLECTION);
      const unsubscribe = onSnapshot(
        tasksCol,
        async (snapshot) => {
          if (snapshot.empty) {
            callback([]);
            return;
          }

          const tasks = [];
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const id = docSnap.id;

            // If this is one of the legacy pre-fixed tasks, auto-delete it from Firestore
            if (LEGACY_PRESET_TASK_IDS.includes(id) || LEGACY_PRESET_TITLES.includes(data.title)) {
              try {
                await deleteDoc(doc(db, TASKS_COLLECTION, id));
              } catch (delErr) {
                console.warn('Auto-removing legacy preset task from Firestore:', delErr);
              }
              continue;
            }

            // Include user specific tasks or public tasks
            if (!userId || data.userId === userId || data.userId === 'public' || !data.userId) {
              tasks.push({
                id: docSnap.id,
                ...data
              });
            }
          }

          // Sort by creation time desc
          tasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          callback(tasks);
        },
        (error) => {
          console.warn('Firestore tasks snapshot error:', error);
          const localKey = userId ? `cc-${userId}-tasks` : 'cc-preview-tasks';
          try {
            const saved = JSON.parse(localStorage.getItem(localKey)) || [];
            const filtered = Array.isArray(saved) ? saved.filter(t => !isLegacyTask(t)) : [];
            callback(filtered);
          } catch {
            callback([]);
          }
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('Failed to setup tasks subscription:', err);
      return () => {};
    }
  },

  async addTask(userId, taskData) {
    const newTask = {
      title: taskData.title.trim(),
      description: taskData.description || '',
      due: taskData.due || '',
      category: taskData.category || 'Assignment',
      priority: taskData.priority || 'Medium',
      status: taskData.status || 'To do',
      source: taskData.source || 'Manual',
      userId: userId || 'public',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (isFirebaseConfigured && db) {
      try {
        const docRef = await addDoc(collection(db, TASKS_COLLECTION), newTask);
        return { id: docRef.id, ...newTask };
      } catch (err) {
        console.warn('Error saving task to Firestore:', err);
      }
    }

    // Local fallback
    const localId = 'task_' + Date.now();
    const created = { id: localId, ...newTask };
    const localKey = userId ? `cc-${userId}-tasks` : 'cc-preview-tasks';
    try {
      const existing = JSON.parse(localStorage.getItem(localKey)) || [];
      localStorage.setItem(localKey, JSON.stringify([created, ...existing]));
    } catch (e) {
      console.error('Local task save error', e);
    }
    return created;
  },

  async updateTask(taskId, updates) {
    if (isFirebaseConfigured && db && taskId) {
      try {
        const taskRef = doc(db, TASKS_COLLECTION, String(taskId));
        await updateDoc(taskRef, {
          ...updates,
          updatedAt: Date.now()
        });
        return;
      } catch (err) {
        console.warn('Error updating task in Firestore:', err);
      }
    }
  },

  async toggleTaskStatus(taskId, currentStatus) {
    const newStatus = currentStatus === 'Completed' ? 'To do' : 'Completed';
    await this.updateTask(taskId, { status: newStatus });
    return newStatus;
  },

  async deleteTask(taskId) {
    if (isFirebaseConfigured && db && taskId) {
      try {
        await deleteDoc(doc(db, TASKS_COLLECTION, String(taskId)));
      } catch (err) {
        console.warn('Error deleting task from Firestore:', err);
      }
    }
  },

  // DOUBTS FORUM MANAGEMENT
  subscribeDoubts(callback) {
    const isLegacyDoubt = (d) =>
      LEGACY_PRESET_DOUBT_IDS.includes(d.id) || LEGACY_PRESET_DOUBT_TITLES.includes(d.title);

    if (!isFirebaseConfigured || !db) {
      try {
        const saved = JSON.parse(localStorage.getItem('cc-preview-doubts')) || [];
        const filtered = Array.isArray(saved) ? saved.filter(d => !isLegacyDoubt(d)) : [];
        localStorage.setItem('cc-preview-doubts', JSON.stringify(filtered));
        callback(filtered);
      } catch {
        callback([]);
      }
      return () => {};
    }

    try {
      const doubtsCol = collection(db, DOUBTS_COLLECTION);
      const unsubscribe = onSnapshot(
        doubtsCol,
        async (snapshot) => {
          if (snapshot.empty) {
            callback([]);
            return;
          }

          const doubts = [];
          for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const id = docSnap.id;

            // Auto-clean legacy preset doubts from Firestore
            if (LEGACY_PRESET_DOUBT_IDS.includes(id) || LEGACY_PRESET_DOUBT_TITLES.includes(data.title)) {
              try {
                await deleteDoc(doc(db, DOUBTS_COLLECTION, id));
              } catch (e) {
                console.warn('Auto-removing legacy preset doubt error:', e);
              }
              continue;
            }

            doubts.push({
              id: docSnap.id,
              ...data
            });
          }

          // Sort by creation time desc
          doubts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          callback(doubts);
        },
        (error) => {
          console.warn('Firestore doubts snapshot error:', error);
          try {
            const saved = JSON.parse(localStorage.getItem('cc-preview-doubts')) || [];
            const filtered = Array.isArray(saved) ? saved.filter(d => !isLegacyDoubt(d)) : [];
            callback(filtered);
          } catch {
            callback([]);
          }
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('Failed to setup doubts subscription:', err);
      return () => {};
    }
  },

  async addDoubt(user, doubtData) {
    const authorName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Student');
    const initials = authorName.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'ST';

    const newDoubt = {
      title: doubtData.title.trim(),
      description: doubtData.description.trim(),
      subject: doubtData.subject || 'General',
      semester: doubtData.semester || 'Semester 1',
      author: authorName,
      initials: initials,
      time: 'Just now',
      userId: user?.id || 'anonymous',
      votes: 0,
      voterIds: [],
      answers: [],
      resolved: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (isFirebaseConfigured && db) {
      try {
        const docRef = await addDoc(collection(db, DOUBTS_COLLECTION), newDoubt);
        return { id: docRef.id, ...newDoubt };
      } catch (err) {
        console.warn('Error saving doubt to Firestore:', err);
      }
    }

    // Local fallback
    const localId = 'doubt_' + Date.now();
    const created = { id: localId, ...newDoubt };
    try {
      const existing = JSON.parse(localStorage.getItem('cc-preview-doubts')) || [];
      localStorage.setItem('cc-preview-doubts', JSON.stringify([created, ...existing]));
    } catch (e) {
      console.error('Local doubt save error', e);
    }
    return created;
  },

  async voteDoubt(doubtId, userId) {
    const voterId = userId || 'current_user';
    if (isFirebaseConfigured && db && doubtId) {
      try {
        const doubtRef = doc(db, DOUBTS_COLLECTION, String(doubtId));
        // We will fetch and update
        const doubts = await getDocs(collection(db, DOUBTS_COLLECTION));
        const found = doubts.docs.find(d => d.id === String(doubtId));
        if (found) {
          const data = found.data();
          const voterSet = new Set(data.voterIds || []);
          let votes = data.votes || 0;

          if (voterSet.has(voterId)) {
            voterSet.delete(voterId);
            votes = Math.max(0, votes - 1);
          } else {
            voterSet.add(voterId);
            votes = votes + 1;
          }

          await updateDoc(doubtRef, {
            votes: votes,
            voterIds: Array.from(voterSet),
            updatedAt: Date.now()
          });
        }
      } catch (err) {
        console.warn('Error voting doubt in Firestore:', err);
      }
    }
  },

  async addAnswer(doubtId, user, text) {
    const authorName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Varun Chaubey');
    const initials = authorName.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'VC';

    const newAnswer = {
      id: 'ans_' + Date.now(),
      author: authorName,
      initials: initials,
      text: text.trim(),
      votes: 0,
      voterIds: [],
      accepted: false,
      createdAt: Date.now()
    };

    if (isFirebaseConfigured && db && doubtId) {
      try {
        const doubtRef = doc(db, DOUBTS_COLLECTION, String(doubtId));
        const snap = await getDocs(collection(db, DOUBTS_COLLECTION));
        const found = snap.docs.find(d => d.id === String(doubtId));
        if (found) {
          const currentAnswers = found.data().answers || [];
          await updateDoc(doubtRef, {
            answers: [...currentAnswers, newAnswer],
            updatedAt: Date.now()
          });
          return newAnswer;
        }
      } catch (err) {
        console.warn('Error adding answer to Firestore:', err);
      }
    }

    return newAnswer;
  },

  async markAnswerAccepted(doubtId, answerId) {
    if (isFirebaseConfigured && db && doubtId) {
      try {
        const doubtRef = doc(db, DOUBTS_COLLECTION, String(doubtId));
        const snap = await getDocs(collection(db, DOUBTS_COLLECTION));
        const found = snap.docs.find(d => d.id === String(doubtId));
        if (found) {
          const currentAnswers = found.data().answers || [];
          const updatedAnswers = currentAnswers.map(a => ({
            ...a,
            accepted: a.id === answerId
          }));

          await updateDoc(doubtRef, {
            resolved: true,
            answers: updatedAnswers,
            updatedAt: Date.now()
          });
        }
      } catch (err) {
        console.warn('Error accepting answer in Firestore:', err);
      }
    }
  },

  // STUDY PLANS
  subscribePlans(userId, callback) {
    if (!isFirebaseConfigured || !db) {
      const localKey = userId ? `cc-${userId}-plans` : 'cc-preview-plans';
      try {
        const saved = JSON.parse(localStorage.getItem(localKey)) || [];
        callback(saved);
      } catch {
        callback([]);
      }
      return () => {};
    }

    try {
      const plansCol = collection(db, PLANS_COLLECTION);
      const unsubscribe = onSnapshot(
        plansCol,
        (snapshot) => {
          const plans = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!userId || data.userId === userId || data.userId === 'public' || !data.userId) {
              plans.push({ id: docSnap.id, ...data });
            }
          });
          callback(plans);
        },
        (err) => {
          console.warn('Firestore plans snapshot error', err);
          callback([]);
        }
      );
      return unsubscribe;
    } catch (e) {
      console.error('Plans subscription error', e);
      return () => {};
    }
  },

  async savePlan(userId, plan) {
    const planDoc = {
      ...plan,
      userId: userId || 'public',
      updatedAt: Date.now()
    };

    if (isFirebaseConfigured && db) {
      try {
        const planId = plan.id ? String(plan.id) : 'plan_' + Date.now();
        await setDoc(doc(db, PLANS_COLLECTION, planId), planDoc, { merge: true });
        return { id: planId, ...planDoc };
      } catch (err) {
        console.warn('Error saving plan to Firestore:', err);
      }
    }

    const localKey = userId ? `cc-${userId}-plans` : 'cc-preview-plans';
    try {
      localStorage.setItem(localKey, JSON.stringify([planDoc]));
    } catch (e) {
      console.error('Error saving local plan', e);
    }
    return planDoc;
  },

  // CHAT SESSIONS & PERSISTENCE
  subscribeChatHistory(userId, callback) {
    const docId = userId ? `chat_${userId}` : 'chat_default';
    if (!isFirebaseConfigured || !db) {
      const localKey = `cc-${docId}-messages`;
      try {
        const saved = JSON.parse(localStorage.getItem(localKey)) || [];
        callback(saved);
      } catch {
        callback([]);
      }
      return () => {};
    }

    try {
      const chatDocRef = doc(db, CHAT_COLLECTION, docId);
      const unsubscribe = onSnapshot(
        chatDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            callback(data.messages || []);
          } else {
            callback([]);
          }
        },
        (err) => {
          console.warn('Chat session snapshot error:', err);
          const localKey = `cc-${docId}-messages`;
          try {
            const saved = JSON.parse(localStorage.getItem(localKey)) || [];
            callback(saved);
          } catch {
            callback([]);
          }
        }
      );
      return unsubscribe;
    } catch (e) {
      console.error('Failed to subscribe to chat history:', e);
      return () => {};
    }
  },

  async saveChatHistory(userId, messages, model = 'gemini-3.5-flash', title = 'Workload Strategy Session') {
    const docId = userId ? `chat_${userId}` : 'chat_default';
    const payload = {
      id: docId,
      userId: userId || 'public',
      title,
      messages,
      model,
      updatedAt: Date.now()
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, CHAT_COLLECTION, docId), payload, { merge: true });
        return;
      } catch (err) {
        console.warn('Error saving chat history to Firestore:', err);
      }
    }

    // Local fallback
    try {
      localStorage.setItem(`cc-${docId}-messages`, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving local chat messages:', e);
    }
  },

  async clearChatHistory(userId) {
    const docId = userId ? `chat_${userId}` : 'chat_default';
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, CHAT_COLLECTION, docId), {
          id: docId,
          userId: userId || 'public',
          messages: [],
          updatedAt: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn('Error clearing chat history in Firestore:', err);
      }
    }
    try {
      localStorage.removeItem(`cc-${docId}-messages`);
    } catch (e) {
      // ignore
    }
  }
};
