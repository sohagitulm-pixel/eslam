import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  ADMIN_EMAIL,
  syncUserProfile,
  updateUserProfileLang,
} from '../services/firestoreService';
import { BirthdayExperience, Language, UserProfile } from '../types/birthday';
import { getT } from '../i18n/translations';

export type AppRoute =
  | { name: 'home' }
  | { name: 'templates' }
  | { name: 'create'; templateId?: string }
  | { name: 'builder'; experienceId: string }
  | { name: 'experience'; experienceId: string }
  | { name: 'dashboard' }
  | { name: 'admin' };

function parseHashRoute(): AppRoute {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  if (raw === '/' || raw === '') return { name: 'home' };
  if (raw === '/templates') return { name: 'templates' };
  if (raw.startsWith('/create')) {
    const query = raw.split('?')[1] || '';
    const params = new URLSearchParams(query);
    return { name: 'create', templateId: params.get('template') || undefined };
  }
  if (raw.startsWith('/builder/')) {
    return { name: 'builder', experienceId: raw.slice('/builder/'.length) };
  }
  if (raw.startsWith('/b/')) {
    return { name: 'experience', experienceId: raw.slice('/b/'.length) };
  }
  if (raw === '/dashboard') return { name: 'dashboard' };
  if (raw === '/admin') return { name: 'admin' };
  return { name: 'home' };
}

interface AppContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: ReturnType<typeof getT>;
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  authReady: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  route: AppRoute;
  navigate: (hashPath: string) => void;
  activeDraft: BirthdayExperience | null;
  setActiveDraft: React.Dispatch<React.SetStateAction<BirthdayExperience | null>>;
  authError: string | null;
  clearAuthError: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('lm_lang');
    return saved === 'ar' ? 'ar' : 'en';
  });
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute());
  const [activeDraft, setActiveDraft] = useState<BirthdayExperience | null>(() => {
    try {
      const saved = localStorage.getItem('lm_active_draft');
      return saved ? (JSON.parse(saved) as BirthdayExperience) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('lm_lang', lang);
  }, [lang]);

  useEffect(() => {
    if (activeDraft) {
      try {
        localStorage.setItem('lm_active_draft', JSON.stringify(activeDraft));
      } catch {
        // Ignore storage quota overflow for local backup
      }
    }
  }, [activeDraft]);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHashRoute());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        try {
          const profile = await syncUserProfile(fbUser, lang);
          setUserProfile(profile);
        } catch {
          // Profile sync fallback
        }
      } else {
        setUserProfile(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const setLang = useCallback(
    (next: Language) => {
      setLangState(next);
      if (user) {
        updateUserProfileLang(user.uid, next).catch(() => {});
      }
    },
    [user]
  );

  const toggleLang = useCallback(() => {
    setLang(lang === 'en' ? 'ar' : 'en');
  }, [lang, setLang]);

  const navigate = useCallback((hashPath: string) => {
    const target = hashPath.startsWith('#') ? hashPath : `#${hashPath}`;
    if (window.location.hash === target) {
      setRoute(parseHashRoute());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.hash = target;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setAuthError(msg);
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
  }, []);

  const isAdmin = Boolean(
    user &&
      user.emailVerified &&
      (user.email === ADMIN_EMAIL || userProfile?.role === 'admin')
  );

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t: getT(lang),
        user,
        userProfile,
        authReady,
        isAdmin,
        signInWithGoogle,
        signOut,
        route,
        navigate,
        activeDraft,
        setActiveDraft,
        authError,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
