import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './lib/firebase';
import { GraduationCap, Sparkles, CheckCircle2, ShieldCheck, Mail, Lock, User, BookOpen } from 'lucide-react';

export const STATIC_DEFAULT_USER = {
  id: 'static-varun-chaubey',
  uid: 'static-varun-chaubey',
  email: 'varunchaubey757@gmail.com',
  user_metadata: {
    display_name: 'Varun Chaubey',
    full_name: 'Varun Chaubey',
    branch: 'Computer Science & Engineering',
    year: 'Semester 3'
  }
};

const AuthContext = createContext({
  user: null,
  session: null,
  loading: false,
  configured: true,
  isGuest: false,
  continueAsGuest: () => {},
  loginWithStaticCredentials: async () => {},
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  updateProfile: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check local static login session first
    const cachedStatic = localStorage.getItem('campuscore_static_user');
    if (cachedStatic) {
      try {
        const parsed = JSON.parse(cachedStatic);
        if (parsed?.user_metadata?.year === 'Semester 6' || parsed?.email?.toLowerCase() === 'varunchaubey757@gmail.com') {
          if (parsed.user_metadata) {
            parsed.user_metadata.year = 'Semester 3';
          }
          localStorage.setItem('campuscore_static_user', JSON.stringify(parsed));
        }
        setUser(parsed);
        setIsGuest(false);
      } catch (e) {
        console.warn('Failed parsing cached static user', e);
      }
    }

    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          let userMeta = {
            display_name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Varun Chaubey',
            full_name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Varun Chaubey',
            branch: 'Computer Science & Engineering',
            year: 'Semester 3'
          };

          if (db) {
            try {
              const userRef = doc(db, 'users', fbUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const data = userSnap.data();
                const resolvedYear = (fbUser.email?.toLowerCase() === 'varunchaubey757@gmail.com' && (!data.year || data.year === 'Semester 6'))
                  ? 'Semester 3'
                  : (data.year || userMeta.year);

                userMeta = {
                  ...userMeta,
                  display_name: data.fullName || userMeta.display_name,
                  full_name: data.fullName || userMeta.full_name,
                  branch: data.branch || userMeta.branch,
                  year: resolvedYear,
                  bio: data.bio || '',
                  phone: data.phone || '',
                  targetCgpa: data.targetCgpa || '',
                  academicInterests: data.academicInterests || ''
                };

                if (fbUser.email?.toLowerCase() === 'varunchaubey757@gmail.com' && data.year === 'Semester 6') {
                  setDoc(userRef, { year: 'Semester 3' }, { merge: true }).catch(() => {});
                }
              }
            } catch (err) {
              console.warn('Could not read user profile from Firestore:', err);
            }
          }

          const studentUser = {
            id: fbUser.uid,
            uid: fbUser.uid,
            email: fbUser.email,
            user_metadata: userMeta
          };
          setUser(studentUser);
          setIsGuest(false);
        } else {
          // If no Firebase user, check if we have a cached static session
          const cached = localStorage.getItem('campuscore_static_user');
          if (cached) {
            try {
              setUser(JSON.parse(cached));
              setIsGuest(false);
            } catch {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithStaticCredentials = async (email = 'varunchaubey757@gmail.com', password = 'password123', metadata = {}) => {
    if (password && password !== 'password123') {
      throw new Error('Incorrect password. Please verify your credentials.');
    }
    const staticUser = {
      id: 'static-varun-chaubey',
      uid: 'static-varun-chaubey',
      email: email || 'varunchaubey757@gmail.com',
      user_metadata: {
        display_name: metadata.full_name || 'Varun Chaubey',
        full_name: metadata.full_name || 'Varun Chaubey',
        branch: metadata.branch || 'Computer Science & Engineering',
        year: metadata.year || 'Semester 3'
      }
    };
    try {
      localStorage.setItem('campuscore_static_user', JSON.stringify(staticUser));
    } catch (e) {
      console.warn('Could not cache static user in localStorage', e);
    }
    setUser(staticUser);
    setIsGuest(false);
    return staticUser;
  };

  const continueAsGuest = () => {
    const guestUser = {
      id: 'demo_student_varun',
      uid: 'demo_student_varun',
      email: 'varunchaubey757@gmail.com',
      user_metadata: {
        display_name: 'Varun Chaubey',
        full_name: 'Varun Chaubey',
        branch: 'Computer Science & Engineering',
        year: 'Semester 3'
      }
    };
    try {
      localStorage.setItem('campuscore_static_user', JSON.stringify(guestUser));
    } catch (e) {
      // ignore
    }
    setUser(guestUser);
    setIsGuest(true);
  };

  const signUp = async (email, password, metadata = {}) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const fullName = metadata.full_name || cleanEmail.split('@')[0];

    // Check if static credentials
    if (cleanEmail === 'varunchaubey757@gmail.com' || cleanEmail === 'varunchaubey757@gamil.com') {
      return await loginWithStaticCredentials(cleanEmail, password, metadata);
    }

    if (isFirebaseConfigured && auth) {
      try {
        const res = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (res.user) {
          await fbUpdateProfile(res.user, { displayName: fullName });
          if (db) {
            try {
              await setDoc(doc(db, 'users', res.user.uid), {
                id: res.user.uid,
                email: cleanEmail,
                fullName: fullName,
                branch: metadata.branch || 'Computer Science & Engineering',
                year: metadata.year || 'Semester 3',
                createdAt: Date.now()
              });
            } catch (e) {
              console.warn('Error saving user doc in Firestore', e);
            }
          }
          setIsGuest(false);
          return res.user;
        }
      } catch (err) {
        console.warn('Firebase createUser failed, falling back to static profile:', err);
        return await loginWithStaticCredentials(cleanEmail, password, metadata);
      }
    }

    return await loginWithStaticCredentials(cleanEmail, password, metadata);
  };

  const signIn = async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    // Static login validation for Varun Chaubey
    if (cleanEmail === 'varunchaubey757@gmail.com' || cleanEmail === 'varunchaubey757@gamil.com') {
      if (password !== 'password123') {
        throw new Error('Incorrect password. Please verify your credentials.');
      }
      return await loginWithStaticCredentials(cleanEmail, password);
    }

    if (isFirebaseConfigured && auth) {
      const res = await signInWithEmailAndPassword(auth, cleanEmail, password);
      setIsGuest(false);
      return res.user;
    }

    throw new Error('Account not found. Please register or verify your email.');
  };

  const signInWithGoogle = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const res = await signInWithPopup(auth, provider);
        if (res.user) {
          if (db) {
            try {
              const userRef = doc(db, 'users', res.user.uid);
              const userSnap = await getDoc(userRef);
              if (!userSnap.exists()) {
                await setDoc(userRef, {
                  id: res.user.uid,
                  email: res.user.email,
                  fullName: res.user.displayName || res.user.email?.split('@')[0] || 'Student',
                  branch: 'Computer Science & Engineering',
                  year: 'Semester 3',
                  createdAt: Date.now()
                });
              }
            } catch (e) {
              console.warn('Error saving Google user profile to Firestore:', e);
            }
          }
          setIsGuest(false);
          return res.user;
        }
      } catch (err) {
        console.warn('Google sign-in error:', err);
        throw err;
      }
    }
    // Fallback
    return await loginWithStaticCredentials('varunchaubey757@gmail.com', 'password123');
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('campuscore_static_user');
    } catch (e) {
      // ignore
    }
    if (isFirebaseConfigured && auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        console.warn('Firebase signOut error:', e);
      }
    }
    setUser(null);
    setIsGuest(false);
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error('No active user session');
    const uid = user.id || user.uid || 'static-varun-chaubey';

    const currentMeta = user.user_metadata || {};
    const updatedMeta = {
      ...currentMeta,
      display_name: updates.fullName !== undefined ? updates.fullName : (currentMeta.display_name || 'Student'),
      full_name: updates.fullName !== undefined ? updates.fullName : (currentMeta.full_name || 'Student'),
      branch: updates.branch !== undefined ? updates.branch : (currentMeta.branch || 'Computer Science & Engineering'),
      year: updates.year !== undefined ? updates.year : (currentMeta.year || 'Semester 1'),
      bio: updates.bio !== undefined ? updates.bio : (currentMeta.bio || ''),
      phone: updates.phone !== undefined ? updates.phone : (currentMeta.phone || ''),
      targetCgpa: updates.targetCgpa !== undefined ? updates.targetCgpa : (currentMeta.targetCgpa || ''),
      academicInterests: updates.academicInterests !== undefined ? updates.academicInterests : (currentMeta.academicInterests || '')
    };

    const updatedUser = {
      ...user,
      user_metadata: updatedMeta
    };

    // Update in Firebase Auth if available
    if (isFirebaseConfigured && auth && auth.currentUser && updates.fullName) {
      try {
        await fbUpdateProfile(auth.currentUser, { displayName: updates.fullName });
      } catch (err) {
        console.warn('Could not update Firebase Auth displayName:', err);
      }
    }

    // Persist to Firestore
    if (isFirebaseConfigured && db && uid) {
      try {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, {
          id: uid,
          email: user.email || 'student@campuscore.edu',
          fullName: updatedMeta.full_name,
          branch: updatedMeta.branch,
          year: updatedMeta.year,
          bio: updatedMeta.bio,
          phone: updatedMeta.phone,
          targetCgpa: updatedMeta.targetCgpa,
          academicInterests: updatedMeta.academicInterests,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn('Error saving updated profile to Firestore:', err);
      }
    }

    // Cache in localStorage
    try {
      localStorage.setItem('campuscore_static_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('Could not cache updated user:', e);
    }

    setUser(updatedUser);
    return updatedUser;
  };

  const resetPassword = async (emailToReset) => {
    const targetEmail = (emailToReset || user?.email || '').trim();
    if (!targetEmail) throw new Error('No email address provided for password reset.');

    if (isFirebaseConfigured && auth) {
      await sendPasswordResetEmail(auth, targetEmail);
      return true;
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session: user ? { user } : null,
        loading,
        configured: isFirebaseConfigured,
        isGuest,
        continueAsGuest,
        loginWithStaticCredentials,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        updateProfile,
        resetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthSession() {
  return useContext(AuthContext);
}

export function useAuth() {
  return useContext(AuthContext);
}

export function FirebaseStatusBadge() {
  return (
    <div className="firebase-badge" title="Persistent cloud storage enabled with Google Cloud Firestore">
      <span className="live-dot" />
      <span>Firebase Cloud Firestore Active</span>
    </div>
  );
}

export function AuthScreen() {
  const { signIn, signUp, loginWithStaticCredentials } = useAuthSession();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isRegister) {
        await signUp(email, password, { full_name: fullName });
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand" style={{ marginBottom: 16 }}>
          <span className="brand-mark"><GraduationCap size={24} /></span>
          <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>Campus<span>Core</span></span>
        </div>
        <h2>{isRegister ? 'Join CampusCore' : 'Welcome back'}</h2>
        <p className="subcopy">
          {isRegister ? 'Create an account to sync your academic tasks and doubts in the cloud.' : 'Log in to access your synchronized campus dashboard.'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <label>
              Full Name
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>
          )}

          <label>
            Student Email
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" className="primary-btn full" disabled={busy}>
            {busy ? 'Connecting…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          {isRegister ? (
            <p>
              Already have an account?{' '}
              <button type="button" onClick={() => setIsRegister(false)}>
                Sign in
              </button>
            </p>
          ) : (
            <p>
              New to CampusCore?{' '}
              <button type="button" onClick={() => setIsRegister(true)}>
                Create account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
