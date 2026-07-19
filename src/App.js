import React, { useState, useEffect, useCallback, useRef } from 'react';
import FlightSearchForm from './FlightSearchForm';
import { fetchCurrentUser, fetchSubscriptions } from './api';
import { supabase } from './supabase';
import googleLogo from './assets/google-g.svg';
import Toast from './Toast';
import { LanguageContext, languages, translate } from './i18n';
import PrivacyPage from './PrivacyPage';
import './App.css';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const [user, setUser] = useState(null);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState(null);
  const [authActionError, setAuthActionError] = useState(null);
  const [toast, setToast] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'en');
  const authLoadIdRef = useRef(0);
  const selectedLanguage = languages.find(({ code }) => code === language) || languages[0];
  const t = (key, values) => translate(language, key, values);

  const loadAuthenticatedUser = useCallback(async (session) => {
    const loadId = ++authLoadIdRef.current;
    if (!session) {
      setUser(null);
      setUserSubscriptions([]);
      setSubscriptionsLoading(false);
      return;
    }

    const sessionUser = session.user;
    const displayName = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'TuniFly user';

    // Supabase session state is authoritative for sign-in. Do not make the UI
    // appear logged out merely because the optional backend profile calls fail.
    setUser((currentUser) => ({
      ...currentUser,
      id: sessionUser.id,
      email: sessionUser.email,
      displayName,
    }));
    setSubscriptionsLoading(true);
    setSubscriptionsError(null);

    const [currentUserResult, subscriptionsResult] = await Promise.allSettled([fetchCurrentUser(), fetchSubscriptions()]);
    if (loadId !== authLoadIdRef.current) return;

    if (currentUserResult.status === 'fulfilled') {
      setUser((currentUser) => ({
        ...currentUser,
        ...currentUserResult.value,
        displayName,
      }));
    }

    if (subscriptionsResult.status === 'fulfilled') {
      setUserSubscriptions(subscriptionsResult.value);
    } else {
      setSubscriptionsError('Failed to load your account. Please try signing in again.');
      console.error('Authenticated subscription load error:', subscriptionsResult.reason);
    }

    setSubscriptionsLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => loadAuthenticatedUser(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => loadAuthenticatedUser(session));
    return () => subscription.unsubscribe();
  }, [loadAuthenticatedUser]);

  const handleGoogleSignIn = async () => {
    setAuthActionError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  };

  const handleLogout = async () => {
    setAuthActionError(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const handleAccountAction = async () => {
    try {
      await (user ? handleLogout() : handleGoogleSignIn());
    } catch (error) {
      setAuthActionError(error.message || 'Could not update your sign-in session.');
    }
  };

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = selectedLanguage.dir;
  }, [language, selectedLanguage.dir]);

  const isPrivacyPage = window.location.pathname.replace(/\/+$/, '') === '/privacy';

  return (
    <LanguageContext.Provider value={{ language, t }}>
      <div className={`App ${theme}-theme`} dir={selectedLanguage.dir}>
        {isPrivacyPage ? <PrivacyPage /> : <>
          <div className="theme-controls">
          <div className="language-selector" aria-label={t('language')}>
            {languages.map(({ code, label, flag }) => (
              <button key={code} type="button" className={`language-button ${language === code ? 'active' : ''}`} onClick={() => setLanguage(code)} aria-pressed={language === code} aria-label={label} title={label}>
                <img className="language-flag" src={flag} alt="" aria-hidden="true" /><span className="language-label">{label}</span>
              </button>
            ))}
          </div>
          <div className="account-controls">
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark')}
              aria-pressed={theme === 'dark'}
              aria-label={t('switchMode', { mode: t(theme === 'dark' ? 'lightMode' : 'darkMode') })}
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
              {theme === 'dark' ? t('lightMode') : t('darkMode')}
            </button>
            <button type="button" className="account-auth-button" onClick={handleAccountAction}>
              {!user && <img src={googleLogo} alt="" className="google-logo" />}
              {user ? t('logOut') : t('logInWithGoogle')}
            </button>
            {authActionError && <p className="account-auth-error">{authActionError}</p>}
          </div>
        </div>
        <main className="main-content">
          <FlightSearchForm
            theme={theme}
            user={user}
            onUserUpdated={setUser}
            showToast={showToast}
            userSubscriptions={userSubscriptions}
            setUserSubscriptions={setUserSubscriptions}
            subscriptionsLoading={subscriptionsLoading}
            subscriptionsError={subscriptionsError}
          />
        </main>
        <footer className="site-footer">
          <div className="footer-content">
            <p className="footer-brand">TuniFly</p>
            <nav className="footer-links" aria-label={t('footerNavigation')}>
              <a href="/privacy">{t('privacyPolicy')}</a>
              <a href={`mailto:wassimsellami20@gmail.com?subject=${encodeURIComponent(t('supportRequestSubject'))}`}>{t('contactUs')}</a>
            </nav>
            <p className="footer-copyright">{t('footerCopyright', { year: new Date().getFullYear() })}</p>
          </div>
        </footer>
          <Toast toast={toast} />
        </>}
      </div>
    </LanguageContext.Provider>
  );
}

export default App;
