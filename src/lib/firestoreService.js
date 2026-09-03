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

const DEFAULT_INITIAL_DOUBTS = [
  {
    id: 'doubt_1',
    title: 'How does backpropagation update weights?',
    description: 'I understand the forward pass, but I am confused about calculating gradients layer by layer.',
    subject: 'Machine Learning',
    semester: 'Semester 6',
    author: 'Riya Sharma',
    initials: 'RS',
    time: '12 min ago',
    createdAt: Date.now() - 12 * 60 * 1000,
    votes: 12,
    voterIds: ['demo_voter_1', 'demo_voter_2'],
    answers: [
      {
        id: 'ans_11',
        author: 'Arjun Mehta',
        initials: 'AM',
        text: 'Think of it as applying the chain rule backwards. Each layer passes the gradient of the loss to the previous layer, which tells us how much every weight contributed to the error.',
        votes: 8,
        voterIds: ['demo_voter_1'],
        accepted: true,
        createdAt: Date.now() - 10 * 60 * 1000
      }
    ],
    resolved: false
  },
  {
    id: 'doubt_2',
    title: 'Difference between a process and a thread',
    description: 'Could someone explain this with a practical operating systems example?',
    subject: 'Operating Systems',
    semester: 'Semester 4',
    author: 'Kunal Shah',
    initials: 'KS',
    time: '38 min ago',
    createdAt: Date.now() - 38 * 60 * 1000,
    votes: 7,
    voterIds: ['demo_voter_3'],
    answers: [],
    resolved: false
  },
  {
    id: 'doubt_3',
    title: 'Normalisation forms — quick revision?',
    description: 'Looking for a clear way to remember 1NF, 2NF and 3NF before the quiz.',
    subject: 'Database Systems',
    semester: 'Semester 4',
    author: 'Meera Iyer',
    initials: 'MI',
    time: '1 hr ago',
    createdAt: Date.now() - 60 * 60 * 1000,
    votes: 19,
    voterIds: ['demo_voter_1', 'demo_voter_2', 'demo_voter_4'],
    answers: [
      {
        id: 'ans_31',
        author: 'Neha Kapoor',
        initials: 'NK',
        text: 'A simple mnemonic: atomic values, no partial dependency, no transitive dependency. Work through one sample table and it will click.',
        votes: 15,
        voterIds: ['demo_voter_1', 'demo_voter_2'],
        accepted: true,
        createdAt: Date.now() - 50 * 60 * 1000
      }
    ],
    resolved: true
  }
];

const DEFAULT_INITIAL_TASKS = [
  {
    id: 'task_1',
    title: 'Finish DBMS assignment',
    description: 'Complete SQL schema normalization and complex subqueries.',
    due: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    category: 'Assignment',
    priority: 'High',
    status: 'In progress',
    source: 'Manual',
    createdAt: Date.now() - 86400000
  },
  {
    id: 'task_2',
    title: 'Review neural networks notes',
    description: 'Review gradient descent and activation functions.',
    due: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    category: 'Study',
    priority: 'Medium',
    status: 'To do',
    source: 'Study Plan',
    createdAt: Date.now() - 172800000
  },
  {
    id: 'task_3',
    title: 'Submit lab record',
    description: 'Operating systems scheduling algorithms code and screenshots.',
    due: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    category: 'Practical',
    priority: 'Low',
    status: 'To do',
    source: 'Manual',
    createdAt: Date.now() - 259200000
  }
];

export const FirestoreService = {
  // TASKS MANAGEMENT
  subscribeTasks(userId, callback) {
    if (!isFirebaseConfigured || !db) {
      const localKey = userId ? `cc-${userId}-tasks` : 'cc-preview-tasks';
      try {
        const saved = JSON.parse(localStorage.getItem(localKey)) || DEFAULT_INITIAL_TASKS;
        callback(saved);
      } catch {
        callback(DEFAULT_INITIAL_TASKS);
      }
      return () => {};
    }

    try {
      const tasksCol = collection(db, TASKS_COLLECTION);
      const unsubscribe = onSnapshot(
        tasksCol,
        (snapshot) => {
          if (snapshot.empty) {
            // Seed initial tasks to Firestore so user sees starter data immediately
            DEFAULT_INITIAL_TASKS.forEach(async (t) => {
              try {
                await setDoc(doc(db, TASKS_COLLECTION, t.id), {
                  ...t,
                  userId: userId || 'public'
                });
              } catch (e) {
                console.warn('Seeding task error', e);
              }
            });
            callback(DEFAULT_INITIAL_TASKS);
            return;
          }

          const tasks = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // Include user specific tasks or public demo tasks
            if (!userId || data.userId === userId || data.userId === 'public' || !data.userId) {
              tasks.push({
                id: docSnap.id,
                ...data
              });
            }
          });

          // Sort by creation time desc
          tasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          callback(tasks.length > 0 ? tasks : DEFAULT_INITIAL_TASKS);
        },
        (error) => {
          console.warn('Firestore tasks snapshot error:', error);
          const localKey = userId ? `cc-${userId}-tasks` : 'cc-preview-tasks';
          try {
            const saved = JSON.parse(localStorage.getItem(localKey)) || DEFAULT_INITIAL_TASKS;
            callback(saved);
          } catch {
            callback(DEFAULT_INITIAL_TASKS);
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
      const existing = JSON.parse(localStorage.getItem(localKey)) || DEFAULT_INITIAL_TASKS;
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
    if (!isFirebaseConfigured || !db) {
      try {
        const saved = JSON.parse(localStorage.getItem('cc-preview-doubts')) || DEFAULT_INITIAL_DOUBTS;
        callback(saved);
      } catch {
        callback(DEFAULT_INITIAL_DOUBTS);
      }
      return () => {};
    }

    try {
      const doubtsCol = collection(db, DOUBTS_COLLECTION);
      const unsubscribe = onSnapshot(
        doubtsCol,
        (snapshot) => {
          if (snapshot.empty) {
            // Seed initial doubts to Firestore
            DEFAULT_INITIAL_DOUBTS.forEach(async (d) => {
              try {
                await setDoc(doc(db, DOUBTS_COLLECTION, d.id), d);
              } catch (e) {
                console.warn('Seeding doubt error', e);
              }
            });
            callback(DEFAULT_INITIAL_DOUBTS);
            return;
          }

          const doubts = [];
          snapshot.forEach((docSnap) => {
            doubts.push({
              id: docSnap.id,
              ...docSnap.data()
            });
          });

          // Sort by creation time desc
          doubts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          callback(doubts);
        },
        (error) => {
          console.warn('Firestore doubts snapshot error:', error);
          try {
            const saved = JSON.parse(localStorage.getItem('cc-preview-doubts')) || DEFAULT_INITIAL_DOUBTS;
            callback(saved);
          } catch {
            callback(DEFAULT_INITIAL_DOUBTS);
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
    const authorName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Varun Chaubey');
    const initials = authorName.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'VC';

    const newDoubt = {
      title: doubtData.title.trim(),
      description: doubtData.description.trim(),
      subject: doubtData.subject || 'Machine Learning',
      semester: doubtData.semester || 'Semester 6',
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
      const existing = JSON.parse(localStorage.getItem('cc-preview-doubts')) || DEFAULT_INITIAL_DOUBTS;
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
  }
};
