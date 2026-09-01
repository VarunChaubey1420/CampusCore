import { useEffect, useState } from 'react';
import { ArrowRight, GraduationCap, KeyRound, Mail, UserRound } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

export function useAuthSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Unable to restore the session:', error.message);
      if (active) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, configured: isSupabaseConfigured };
}

export function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const signingUp = mode === 'signup';

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    const result = signingUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() } },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (signingUp && !result.data.session) {
      setMessage('Check your inbox to confirm your email, then return here to sign in.');
    }
  };

  return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><span><GraduationCap size={22}/></span><strong>Campus<span>Core</span></strong></div><div className="auth-copy"><p className="eyebrow">YOUR STUDY SPACE</p><h1>{signingUp ? 'Create your account' : 'Welcome back'}</h1><p>{signingUp ? 'Save your work, join the community and plan your semester.' : 'Sign in to access your CampusCore workspace.'}</p></div><div className="auth-mode-tabs"><button className={!signingUp ? 'selected' : ''} onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>Sign in</button><button className={signingUp ? 'selected' : ''} onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Create account</button></div><form className="auth-form" onSubmit={submit}>{signingUp && <label>Full name<span className="input-with-icon"><UserRound size={17}/><input autoComplete="name" required value={name} onChange={event => setName(event.target.value)} placeholder="Your name"/></span></label>}<label>Email<span className="input-with-icon"><Mail size={17}/><input autoComplete="email" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/></span></label><label>Password<span className="input-with-icon"><KeyRound size={17}/><input autoComplete={signingUp ? 'new-password' : 'current-password'} type="password" minLength="6" required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters"/></span></label>{error && <p className="auth-feedback error">{error}</p>}{message && <p className="auth-feedback success">{message}</p>}<button className="auth-submit" disabled={submitting}>{submitting ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in'}<ArrowRight size={17}/></button></form></section></main>;
}

export function SupabaseSetupBanner() {
  return <div className="setup-banner"><strong>Local preview</strong><span>Connect Supabase to turn on sign-in and cloud data.</span></div>;
}
