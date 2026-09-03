import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

const LOCAL_STORAGE_KEY = 'campuscore_db_v2';

const SEED_DOUBTS = [
  {
    id: 'd1',
    authorId: 'u_ananya',
    author: 'Ananya S.',
    avatar: 'AS',
    time: '12m ago',
    createdAt: Date.now() - 12 * 60 * 1000,
    subject: 'Operating Systems',
    code: 'CS302',
    title: 'Can someone explain the Bankers algorithm with a 3-process example?',
    body: 'I understand the theoretical concept of safe and unsafe states, but struggling to trace allocation and need matrices when multiple resource types are requested simultaneously.',
    tags: ['Deadlock', 'Resource Allocation', 'Process Sync'],
    upvotes: 14,
    voterIds: ['u_sample1', 'u_sample2'],
    answersCount: 2,
    solved: false,
    acceptedAnswerId: null
  },
  {
    id: 'd2',
    authorId: 'u_rohan',
    author: 'Rohan K.',
    avatar: 'RK',
    time: '45m ago',
    createdAt: Date.now() - 45 * 60 * 1000,
    subject: 'Discrete Math',
    code: 'MA201',
    title: 'Graph coloring chromatic number proof step question',
    body: 'On page 142 of Kenneth Rosen, lemma 4.2 states that every planar graph is 6-colorable before moving to the 5-color theorem. Why does induction on vertices ensure delta(G) <= 5?',
    tags: ['Planar Graphs', 'Induction', 'Chromatic Number'],
    upvotes: 9,
    voterIds: ['u_sample3'],
    answersCount: 1,
    solved: true,
    acceptedAnswerId: 'a3'
  },
  {
    id: 'd3',
    authorId: 'u_meera',
    author: 'Meera P.',
    avatar: 'MP',
    time: '2h ago',
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
    subject: 'Computer Networks',
    code: 'CS401',
    title: 'Subnetting: /26 CIDR block allocation for 3 departments',
    body: 'Given 192.168.10.0/24, need subnets for Sales (55 hosts), Dev (28 hosts), QA (14 hosts). What are the exact network IDs and broadcast addresses?',
    tags: ['Subnetting', 'CIDR', 'IPv4 Addressing'],
    upvotes: 22,
    voterIds: ['u_sample1', 'u_sample2', 'u_sample4'],
    answersCount: 1,
    solved: true,
    acceptedAnswerId: 'a4'
  }
];

const SEED_ANSWERS = {
  d1: [
    {
      id: 'a1',
      doubtId: 'd1',
      authorId: 'u_sharma',
      author: 'Prof. Sharma (TA)',
      avatar: 'PS',
      time: '8m ago',
      createdAt: Date.now() - 8 * 60 * 1000,
      body: "Here is the key rule: Need[i][j] = Max[i][j] - Allocation[i][j]. You test if Need <= Work (where Work is initialized to Available). If satisfied, process finishes and releases resources: Work = Work + Allocation[i].",
      upvotes: 8,
      voterIds: ['u_sample1'],
      isSolution: false
    },
    {
      id: 'a2',
      doubtId: 'd1',
      authorId: 'u_kavya',
      author: 'Kavya V.',
      avatar: 'KV',
      time: '4m ago',
      createdAt: Date.now() - 4 * 60 * 1000,
      body: "I recommend writing out a 3x3 table with columns: Allocation | Max | Need | Available. Step through one row at a time. It makes it super easy!",
      upvotes: 3,
      voterIds: [],
      isSolution: false
    }
  ],
  d2: [
    {
      id: 'a3',
      doubtId: 'd2',
      authorId: 'u_dev',
      author: 'Dev R.',
      avatar: 'DR',
      time: '30m ago',
      createdAt: Date.now() - 30 * 60 * 1000,
      body: 'Euler formula: V - E + F = 2. For planar graphs with V >= 3, 3F <= 2E, which gives E <= 3V - 6. Sum of degrees = 2E <= 6V - 12, so average degree < 6. Hence at least one vertex has degree <= 5.',
      upvotes: 12,
      voterIds: ['u_sample1', 'u_sample2'],
      isSolution: true
    }
  ],
  d3: [
    {
      id: 'a4',
      doubtId: 'd3',
      authorId: 'u_aditya',
      author: 'Aditya S.',
      avatar: 'AS',
      time: '1h ago',
      createdAt: Date.now() - 60 * 60 * 1000,
      body: 'Sales (55 hosts) needs /26 (64 IPs: 192.168.10.0 - .63). Dev (28 hosts) needs /27 (32 IPs: 192.168.10.64 - .95). QA (14 hosts) needs /28 (16 IPs: 192.168.10.96 - .111).',
      upvotes: 18,
      voterIds: ['u_sample1', 'u_sample2', 'u_sample3'],
      isSolution: true
    }
  ]
};

const DEFAULT_STATE = {
  doubts: SEED_DOUBTS,
  answers: SEED_ANSWERS,
  tasksByUser: {},
  studyPlansByUser: {}
};

function getLocalState() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_STATE));
      return DEFAULT_STATE;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading localStorage', err);
    return DEFAULT_STATE;
  }
}

function saveLocalState(state) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error writing localStorage', err);
  }
}

export const DataService = {
  // TASKS
  async getTasks(userId) {
    if (isFirebaseConfigured && db) {
      try {
        const tasksCol = collection(db, 'tasks');
        const q = userId
          ? query(tasksCol, where('userId', 'in', [userId, 'default_sample']))
          : query(tasksCol);
        const snap = await getDocs(q);

        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          return list;
        }

        // If collection is empty for this user, seed default starter tasks
        const defaultTasks = [
          {
            userId: userId || 'default_sample',
            title: 'Complete OS Lab 4: Semaphore Implementation',
            subject: 'Operating Systems',
            deadline: 'Tonight, 11:59 PM',
            priority: 'High',
            duration: '2.5 hrs',
            completed: false,
            createdAt: Date.now() - 3600000
          },
          {
            userId: userId || 'default_sample',
            title: 'Solve Discrete Math Assignment 3 (Q1 - Q8)',
            subject: 'Discrete Math',
            deadline: 'Tomorrow, 5:00 PM',
            priority: 'High',
            duration: '1.5 hrs',
            completed: false,
            createdAt: Date.now() - 7200000
          },
          {
            userId: userId || 'default_sample',
            title: 'Review CN Module 2: Transport Layer UDP/TCP',
            subject: 'Computer Networks',
            deadline: 'In 2 days',
            priority: 'Medium',
            duration: '45 mins',
            completed: true,
            createdAt: Date.now() - 10800000
          },
          {
            userId: userId || 'default_sample',
            title: 'Prepare Microservices Presentation Deck',
            subject: 'Software Engg',
            deadline: 'This Friday',
            priority: 'Low',
            duration: '1.0 hr',
            completed: false,
            createdAt: Date.now() - 14400000
          }
        ];

        const createdList = [];
        for (const t of defaultTasks) {
          const newDocRef = await addDoc(tasksCol, t);
          createdList.push({ id: newDocRef.id, ...t });
        }
        return createdList;
      } catch (err) {
        console.warn('Firestore tasks fetch failed, falling back to local storage:', err);
      }
    }

    const state = getLocalState();
    const userKey = userId || 'anonymous_user';
    if (!state.tasksByUser[userKey]) {
      state.tasksByUser[userKey] = [
        {
          id: 't1',
          title: 'Complete OS Lab 4: Semaphore Implementation',
          subject: 'Operating Systems',
          deadline: 'Tonight, 11:59 PM',
          priority: 'High',
          duration: '2.5 hrs',
          completed: false,
          userId: userKey,
          createdAt: Date.now()
        },
        {
          id: 't2',
          title: 'Solve Discrete Math Assignment 3 (Q1 - Q8)',
          subject: 'Discrete Math',
          deadline: 'Tomorrow, 5:00 PM',
          priority: 'High',
          duration: '1.5 hrs',
          completed: false,
          userId: userKey,
          createdAt: Date.now()
        },
        {
          id: 't3',
          title: 'Review CN Module 2: Transport Layer UDP/TCP',
          subject: 'Computer Networks',
          deadline: 'In 2 days',
          priority: 'Medium',
          duration: '45 mins',
          completed: true,
          userId: userKey,
          createdAt: Date.now()
        },
        {
          id: 't4',
          title: 'Prepare Microservices Presentation Deck',
          subject: 'Software Engg',
          deadline: 'This Friday',
          priority: 'Low',
          duration: '1.0 hr',
          completed: false,
          userId: userKey,
          createdAt: Date.now()
        }
      ];
      saveLocalState(state);
    }
    return state.tasksByUser[userKey];
  },

  async createTask(userId, taskData) {
    const newTaskObj = {
      userId: userId || 'anonymous_user',
      title: taskData.title,
      subject: taskData.subject || 'Operating Systems',
      deadline: taskData.deadline || 'This week',
      priority: taskData.priority || 'Medium',
      duration: taskData.duration || '1 hr',
      completed: false,
      createdAt: Date.now()
    };

    if (isFirebaseConfigured && db) {
      try {
        const docRef = await addDoc(collection(db, 'tasks'), newTaskObj);
        return { id: docRef.id, ...newTaskObj };
      } catch (err) {
        console.warn('Firestore task creation failed, saving locally:', err);
      }
    }

    const state = getLocalState();
    const userKey = userId || 'anonymous_user';
    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      ...newTaskObj
    };
    if (!state.tasksByUser[userKey]) {
      state.tasksByUser[userKey] = [];
    }
    state.tasksByUser[userKey].unshift(newTask);
    saveLocalState(state);
    return newTask;
  },

  async toggleTask(userId, taskId, currentStatus) {
    const nextStatus = !currentStatus;
    if (isFirebaseConfigured && db) {
      try {
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, { completed: nextStatus, updatedAt: Date.now() });
        return nextStatus;
      } catch (err) {
        console.warn('Firestore toggleTask update failed:', err);
      }
    }

    const state = getLocalState();
    const userKey = userId || 'anonymous_user';
    if (state.tasksByUser[userKey]) {
      state.tasksByUser[userKey] = state.tasksByUser[userKey].map(t =>
        t.id === taskId ? { ...t, completed: nextStatus } : t
      );
      saveLocalState(state);
    }
    return nextStatus;
  },

  async deleteTask(userId, taskId) {
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
      } catch (err) {
        console.warn('Firestore deleteTask failed:', err);
      }
    }

    const state = getLocalState();
    const userKey = userId || 'anonymous_user';
    if (state.tasksByUser[userKey]) {
      state.tasksByUser[userKey] = state.tasksByUser[userKey].filter(t => t.id !== taskId);
      saveLocalState(state);
    }
  },

  // DOUBTS COMMUNITY
  async getDoubts() {
    if (isFirebaseConfigured && db) {
      try {
        const doubtsCol = collection(db, 'doubts');
        const snap = await getDocs(doubtsCol);
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          return list;
        }

        // Seed default doubts into Firestore
        const seeded = [];
        for (const item of SEED_DOUBTS) {
          const { id, ...rest } = item;
          const ref = doc(db, 'doubts', id);
          await setDoc(ref, { id, ...rest });
          seeded.push(item);
        }

        // Also seed corresponding answers
        for (const [doubtId, ansList] of Object.entries(SEED_ANSWERS)) {
          for (const ans of ansList) {
            const { id, ...aRest } = ans;
            await setDoc(doc(db, 'answers', id), { id, ...aRest });
          }
        }

        return seeded;
      } catch (err) {
        console.warn('Firestore getDoubts failed, using local store:', err);
      }
    }

    const state = getLocalState();
    return state.doubts;
  },

  async createDoubt(user, doubtData) {
    const userId = user?.id || user?.uid || 'anonymous';
    const authorName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Student');
    const avatar = authorName.slice(0, 2).toUpperCase();

    const newDoubtDoc = {
      authorId: userId,
      author: authorName,
      avatar: avatar,
      time: 'Just now',
      createdAt: Date.now(),
      subject: doubtData.subject,
      code: doubtData.code || 'GEN101',
      title: doubtData.title,
      body: doubtData.body,
      tags: doubtData.tags || ['General'],
      upvotes: 0,
      voterIds: [],
      answersCount: 0,
      solved: false,
      acceptedAnswerId: null
    };

    if (isFirebaseConfigured && db) {
      try {
        const docRef = await addDoc(collection(db, 'doubts'), newDoubtDoc);
        return { id: docRef.id, ...newDoubtDoc };
      } catch (err) {
        console.warn('Firestore createDoubt failed, saving locally:', err);
      }
    }

    const state = getLocalState();
    const newDoubt = {
      id: 'd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      ...newDoubtDoc
    };
    state.doubts.unshift(newDoubt);
    state.answers[newDoubt.id] = [];
    saveLocalState(state);
    return newDoubt;
  },

  async voteDoubt(doubtId, userId) {
    const voterId = userId || 'anonymous_user';

    if (isFirebaseConfigured && db) {
      try {
        const doubtRef = doc(db, 'doubts', doubtId);
        const doubtSnap = await getDoc(doubtRef);
        if (doubtSnap.exists()) {
          const data = doubtSnap.data();
          const voterSet = new Set(data.voterIds || []);
          let newUpvotes = data.upvotes || 0;

          if (voterSet.has(voterId)) {
            voterSet.delete(voterId);
            newUpvotes = Math.max(0, newUpvotes - 1);
          } else {
            voterSet.add(voterId);
            newUpvotes = newUpvotes + 1;
          }

          const voterIds = Array.from(voterSet);
          await updateDoc(doubtRef, {
            upvotes: newUpvotes,
            voterIds: voterIds,
            updatedAt: Date.now()
          });

          return { upvotes: newUpvotes, voterIds };
        }
      } catch (err) {
        console.warn('Firestore voteDoubt failed:', err);
      }
    }

    const state = getLocalState();
    const doubt = state.doubts.find(d => d.id === doubtId);
    if (!doubt) return null;

    const voterSet = new Set(doubt.voterIds || []);
    let newUpvotes = doubt.upvotes || 0;

    if (voterSet.has(voterId)) {
      voterSet.delete(voterId);
      newUpvotes = Math.max(0, newUpvotes - 1);
    } else {
      voterSet.add(voterId);
      newUpvotes = newUpvotes + 1;
    }

    doubt.voterIds = Array.from(voterSet);
    doubt.upvotes = newUpvotes;
    saveLocalState(state);

    return { upvotes: newUpvotes, voterIds: doubt.voterIds };
  },

  // ANSWERS
  async getAnswers(doubtId) {
    if (isFirebaseConfigured && db) {
      try {
        const answersCol = collection(db, 'answers');
        const q = query(answersCol, where('doubtId', '==', doubtId));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          list.sort((a, b) => {
            if (a.isSolution !== b.isSolution) return a.isSolution ? -1 : 1;
            return (b.upvotes || 0) - (a.upvotes || 0);
          });
          return list;
        }
      } catch (err) {
        console.warn('Firestore getAnswers failed, checking local:', err);
      }
    }

    const state = getLocalState();
    return state.answers[doubtId] || [];
  },

  async createAnswer(doubtId, user, body) {
    const userId = user?.id || user?.uid || 'anonymous';
    const authorName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Student');
    const avatar = authorName.slice(0, 2).toUpperCase();

    const newAnswerDoc = {
      doubtId: doubtId,
      authorId: userId,
      author: authorName,
      avatar: avatar,
      time: 'Just now',
      createdAt: Date.now(),
      body: body,
      upvotes: 0,
      voterIds: [],
      isSolution: false
    };

    if (isFirebaseConfigured && db) {
      try {
        const ansRef = await addDoc(collection(db, 'answers'), newAnswerDoc);

        // Update doubt answersCount
        const doubtRef = doc(db, 'doubts', doubtId);
        const doubtSnap = await getDoc(doubtRef);
        if (doubtSnap.exists()) {
          const currentCount = doubtSnap.data().answersCount || 0;
          await updateDoc(doubtRef, { answersCount: currentCount + 1 });
        }

        return { id: ansRef.id, ...newAnswerDoc };
      } catch (err) {
        console.warn('Firestore createAnswer failed, saving locally:', err);
      }
    }

    const state = getLocalState();
    if (!state.answers[doubtId]) {
      state.answers[doubtId] = [];
    }
    const newAnswer = {
      id: 'ans_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      ...newAnswerDoc
    };
    state.answers[doubtId].push(newAnswer);
    const doubt = state.doubts.find(d => d.id === doubtId);
    if (doubt) {
      doubt.answersCount = (doubt.answersCount || 0) + 1;
    }
    saveLocalState(state);
    return newAnswer;
  },

  async voteAnswer(doubtId, answerId, userId) {
    const voterId = userId || 'anonymous_user';

    if (isFirebaseConfigured && db) {
      try {
        const ansRef = doc(db, 'answers', answerId);
        const ansSnap = await getDoc(ansRef);
        if (ansSnap.exists()) {
          const data = ansSnap.data();
          const voterSet = new Set(data.voterIds || []);
          let newUpvotes = data.upvotes || 0;

          if (voterSet.has(voterId)) {
            voterSet.delete(voterId);
            newUpvotes = Math.max(0, newUpvotes - 1);
          } else {
            voterSet.add(voterId);
            newUpvotes = newUpvotes + 1;
          }

          const voterIds = Array.from(voterSet);
          await updateDoc(ansRef, {
            upvotes: newUpvotes,
            voterIds: voterIds,
            updatedAt: Date.now()
          });

          return { upvotes: newUpvotes, voterIds };
        }
      } catch (err) {
        console.warn('Firestore voteAnswer failed:', err);
      }
    }

    const state = getLocalState();
    const answerList = state.answers[doubtId] || [];
    const ans = answerList.find(a => a.id === answerId);
    if (!ans) return null;

    const voterSet = new Set(ans.voterIds || []);
    let newUpvotes = ans.upvotes || 0;

    if (voterSet.has(voterId)) {
      voterSet.delete(voterId);
      newUpvotes = Math.max(0, newUpvotes - 1);
    } else {
      voterSet.add(voterId);
      newUpvotes = newUpvotes + 1;
    }

    ans.voterIds = Array.from(voterSet);
    ans.upvotes = newUpvotes;
    saveLocalState(state);

    return { upvotes: newUpvotes, voterIds: ans.voterIds };
  },

  async acceptAnswer(doubtId, answerId, isAccepted) {
    if (isFirebaseConfigured && db) {
      try {
        // Query all answers for this doubt to reset other solutions
        const answersCol = collection(db, 'answers');
        const q = query(answersCol, where('doubtId', '==', doubtId));
        const snap = await getDocs(q);

        for (const docSnap of snap.docs) {
          if (docSnap.id === answerId) {
            await updateDoc(docSnap.ref, { isSolution: isAccepted });
          } else if (docSnap.data().isSolution) {
            await updateDoc(docSnap.ref, { isSolution: false });
          }
        }

        const doubtRef = doc(db, 'doubts', doubtId);
        await updateDoc(doubtRef, {
          solved: isAccepted,
          acceptedAnswerId: isAccepted ? answerId : null,
          updatedAt: Date.now()
        });
      } catch (err) {
        console.warn('Firestore acceptAnswer failed:', err);
      }
    }

    const state = getLocalState();
    const answerList = state.answers[doubtId] || [];
    answerList.forEach(a => {
      a.isSolution = a.id === answerId ? isAccepted : false;
    });
    const doubt = state.doubts.find(d => d.id === doubtId);
    if (doubt) {
      doubt.solved = isAccepted;
      doubt.acceptedAnswerId = isAccepted ? answerId : null;
    }
    saveLocalState(state);
  },

  // STUDY PLANS
  async getStudyPlan(userId) {
    if (isFirebaseConfigured && db) {
      try {
        const plansCol = collection(db, 'study_plans');
        const docId = userId || 'default_study_plan';
        const planRef = doc(db, 'study_plans', docId);
        const snap = await getDoc(planRef);

        if (snap.exists()) {
          return snap.data();
        }
      } catch (err) {
        console.warn('Firestore getStudyPlan failed:', err);
      }
    }

    const state = getLocalState();
    const userKey = userId || 'anonymous_user';
    if (!state.studyPlansByUser[userKey]) {
      state.studyPlansByUser[userKey] = {
        targetExam: 'Mid-term Exams (12 days left)',
        items: [
          {
            id: 'p1',
            time: '08:00 AM - 09:30 AM',
            subject: 'Operating Systems',
            topic: 'Deadlock Detection & Recovery Strategies',
            duration: '90m',
            type: 'Deep Focus',
            priority: 'High',
            completed: false,
            rationale: 'High cognitive energy window dedicated to mastering foundational weaknesses.'
          },
          {
            id: 'p2',
            time: '10:00 AM - 11:15 AM',
            subject: 'Discrete Math',
            topic: 'Generating Functions & Recurrence Relations',
            duration: '75m',
            type: 'Problem Set',
            priority: 'Medium',
            completed: false,
            rationale: 'Applying theoretical mechanics to past exam question patterns.'
          },
          {
            id: 'p3',
            time: '02:00 PM - 03:00 PM',
            subject: 'Computer Networks',
            topic: 'BGP Routing Protocols & Autonomous Systems',
            duration: '60m',
            type: 'Revision',
            priority: 'Medium',
            completed: true,
            rationale: 'Low-friction reinforcement of protocols and definitions.'
          },
          {
            id: 'p4',
            time: '04:30 PM - 05:30 PM',
            subject: 'Software Engg',
            topic: 'CI/CD Pipeline Architecture & Docker Basics',
            duration: '60m',
            type: 'Lab Practical',
            priority: 'Low',
            completed: false,
            rationale: 'Hands-on practical check.'
          }
        ]
      };
      saveLocalState(state);
    }
    return state.studyPlansByUser[userKey];
  },

  async saveStudyPlan(userId, plan) {
    const docId = userId || 'default_study_plan';
    const planDoc = {
      userId: userId || 'anonymous_user',
      targetExam: plan.targetExam || 'Personalized Exam Sprint',
      items: plan.items || [],
      config: plan.config || {},
      updatedAt: Date.now()
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'study_plans', docId), planDoc, { merge: true });
      } catch (err) {
        console.warn('Firestore saveStudyPlan failed:', err);
      }
    }

    const state = getLocalState();
    const userKey = userId || 'anonymous_user';
    state.studyPlansByUser[userKey] = plan;
    saveLocalState(state);
    return plan;
  }
};
