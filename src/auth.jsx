import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './lib/firebase';
import { GraduationCap, Sparkles, CheckCircle2, ShieldCheck, Mail, Lock, User, BookOpen } from 'lucide-react';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: false,
  configured: true,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  updateProfile: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          let userMeta = {
            display_name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Varun Chaubey',
            full_name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Varun Chaubey',
            branch: 'Computer Science & Engineering',
            year: 'Semester 6'
          };

          if (db) {
            try {
              const userRef = doc(db, 'users', fbUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const data = userSnap.data();
                userMeta = {
                  ...userMeta,
                  display_name: data.fullName || userMeta.display_name,
                  full_name: data.fullName || userMeta.full_name,
                  branch: data.branch || userMeta.branch,
                  year: data.year || userMeta.year
                };
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
          setUser(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const continueAsGuest = () => {
    setUser({
      id: 'demo_student_varun',
      uid: 'demo_student_varun',
      email: 'varunchaubey757@gmail.com',
      user_metadata: {
        display_name: 'Varun Chaubey',
        full_name: 'Varun Chaubey',
        branch: 'Computer Science & Engineering',
        year: 'Semester 6'
      }
    });
    setIsGuest(true);
  };

  const signUp = async (email, password, metadata = {}) => {
    const cleanEmail = email.trim().toLowerCase();
    const fullName = metadata.full_name || cleanEmail.split('@')[0];

    if (isFirebaseConfigured && auth) {
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
              year: metadata.year || 'Semester 6',
              createdAt: Date.now()
            });
          } catch (e) {
            console.warn('Error saving user doc in Firestore', e);
          }
        }
        setIsGuest(false);
        return res.user;
      }
    }
  };

  const signIn = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    if (isFirebaseConfigured && auth) {
      const res = await signInWithEmailAndPassword(auth, cleanEmail, password);
      setIsGuest(false);
      return res.user;
    }
  };

  const signOut = async () => {
    if (isFirebaseConfigured && auth) {
      await fbSignOut(auth);
    }
    setUser(null);
    setIsGuest(false);
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
        signUp,
        signIn,
        signOut
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

// Backward compatibility alias
export function SupabaseSetupBanner() {
  return null;
}

export function AuthScreen() {
  const { signIn, signUp } = useAuthSession();
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
                placeholder="e.g. Varun Chaubey"
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
              placeholder="e.g. varun@campus.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="••••••••"
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
