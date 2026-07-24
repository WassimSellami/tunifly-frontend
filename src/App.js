import React, { useState, useEffect, useCallback, useRef } from 'react';
import FlightSearchForm from './FlightSearchForm';
import { fetchCurrentUser, fetchSubscriptions } from './api';
import { supabase } from './supabase';
import googleLogo from './assets/google-g.svg';
import Toast from './Toast';
import { LanguageContext, languages, translate } from './i18n';
import LandingPage from './LandingPage';
import PrivacyPage from './PrivacyPage';
import TermsPage from './TermsPage';
import AlertsPage from './AlertsPage';
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
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname.replace(/\/+$/, ''));
  const authLoadIdRef = useRef(0);
  const selectedLanguage = languages.find(({ code }) => code === language) || languages[0];
  const t = (key, values) => translate(language, key, values);

  const navigate = useCallback((path) => {
    if (window.location.pathname === path) return;
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleInternalNavigation = useCallback((event) => {
    if (event.defaultPrevented) return;
    const link = event.target.closest('a[href]');
    const path = link?.getAttribute('href');
    if (!path || !path.startsWith('/')) return;
    event.preventDefault();
    navigate(path);
  }, [navigate]);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname.replace(/\/+$/, ''));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    // Supabase emits INITIAL_SESSION as soon as this listener is registered, so
    // it is the single source of truth for the initial session and later auth
    // changes. Calling getSession() here as well caused duplicate API loads.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => loadAuthenticatedUser(session));
    return () => subscription.unsubscribe();
  }, [loadAuthenticatedUser]);

  const handleGoogleSignIn = async () => {
    setAuthActionError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${isAlertsPage ? '/alerts' : '/search'}` },
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

  const isPrivacyPage = currentPath === '/privacy';
  const isTermsPage = currentPath === '/terms';
  const isSearchPage = ['/search', '/auth/callback'].includes(currentPath);
  const isAlertsPage = currentPath === '/alerts';

  return (
    <LanguageContext.Provider value={{ language, t }}>
      <div className={`App ${theme}-theme`} dir={selectedLanguage.dir} onClick={handleInternalNavigation}>
        <div className="theme-controls">
          <a className="home-link" href="/" onClick={(event) => { event.preventDefault(); navigate('/'); }} aria-label={t('home')} title={t('home')}><img src="/logo120.png" alt="" /></a>
          <nav className="top-navigation" aria-label={t('appNavigation')}>
            <a className={isSearchPage ? 'active' : ''} href="/search" onClick={(event) => { event.preventDefault(); navigate('/search'); }}>{t('searchFlights')}</a>
            <a className={isAlertsPage ? 'active' : ''} href="/alerts" onClick={(event) => { event.preventDefault(); navigate('/alerts'); }}>{t('myPriceAlerts')}</a>
          </nav>
          <div className="language-selector" aria-label={t('language')}>
            {languages.map(({ code, label }) => (
              <button key={code} type="button" className={`language-button ${language === code ? 'active' : ''}`} onClick={() => setLanguage(code)} aria-pressed={language === code} aria-label={label} title={label}>
                <span className="language-label">{code.toUpperCase()}</span>
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
          {isPrivacyPage ? <PrivacyPage /> : isTermsPage ? <TermsPage /> : isSearchPage ? <FlightSearchForm
            theme={theme}
            user={user}
            onUserUpdated={setUser}
            showToast={showToast}
            userSubscriptions={userSubscriptions}
            setUserSubscriptions={setUserSubscriptions}
            subscriptionsLoading={subscriptionsLoading}
            subscriptionsError={subscriptionsError}
          /> : isAlertsPage ? <AlertsPage
            theme={theme}
            user={user}
            onUserUpdated={setUser}
            showToast={showToast}
            userSubscriptions={userSubscriptions}
            setUserSubscriptions={setUserSubscriptions}
            subscriptionsLoading={subscriptionsLoading}
            subscriptionsError={subscriptionsError}
          /> : <LandingPage onNavigate={navigate} />}
        </main>
        <footer className="site-footer">
          <div className="footer-content">
            <p className="footer-brand">TuniFly</p>
            <nav className="footer-links" aria-label={t('footerNavigation')}>
              <a href="/privacy">{t('privacyPolicy')}</a>
              <a href="/terms">{t('termsOfService')}</a>
              <a href={`mailto:wassimsellami20@gmail.com?subject=${encodeURIComponent(t('supportRequestSubject'))}`}>{t('contactUs')}</a>
            </nav>
            <p className="footer-copyright">{t('footerCopyright', { year: new Date().getFullYear() })}</p>
          </div>
        </footer>
        <Toast toast={toast} />
      </div>
    </LanguageContext.Provider>
  );
}

export default App;
