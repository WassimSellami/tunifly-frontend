import React, { useState, useEffect } from 'react';
import FlightSearchForm from './FlightSearchForm';
import { fetchSubscriptionsByEmail } from './api';
import { LanguageContext, languages, translate } from './i18n';
import './App.css';

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('userEmail') || '';
  });
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'en');
  const selectedLanguage = languages.find(({ code }) => code === language) || languages[0];
  const t = (key, values) => translate(language, key, values);

  useEffect(() => {
    localStorage.setItem('userEmail', userEmail);
  }, [userEmail]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = selectedLanguage.dir;
  }, [language, selectedLanguage.dir]);

  useEffect(() => {
    const loadSubscriptions = async () => {
      if (userEmail) {
        setSubscriptionsLoading(true);
        setSubscriptionsError(null);
        try {
          const subs = await fetchSubscriptionsByEmail(userEmail);
          setUserSubscriptions(subs);
        } catch (err) {
          setSubscriptionsError("Failed to load your subscriptions. Please check your network or try again later.");
          console.error("Subscription fetch error:", err);
        } finally {
          setSubscriptionsLoading(false);
        }
      } else {
        setUserSubscriptions([]);
      }
    };
    loadSubscriptions();
  }, [userEmail]);

  return (
    <LanguageContext.Provider value={{ language, t }}>
    <div className={`App ${theme}-theme`} dir={selectedLanguage.dir}>
      <div className="theme-controls">
        <div className="language-selector" aria-label={t('language')}>
          {languages.map(({ code, label, flag }) => (
            <button key={code} type="button" className={`language-button ${language === code ? 'active' : ''}`} onClick={() => setLanguage(code)} aria-pressed={language === code} aria-label={label} title={label}>
              <img className="language-flag" src={flag} alt="" aria-hidden="true" /><span className="language-label">{label}</span>
            </button>
          ))}
        </div>
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
      </div>
      <main className="main-content">
        <FlightSearchForm
          theme={theme}
          userEmail={userEmail}
          setUserEmail={setUserEmail}
          userSubscriptions={userSubscriptions}
          setUserSubscriptions={setUserSubscriptions}
          subscriptionsLoading={subscriptionsLoading}
          subscriptionsError={subscriptionsError}
        />
      </main>
    </div>
    </LanguageContext.Provider>
  );
}

export default App;
