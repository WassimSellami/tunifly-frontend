import React, { useState, useEffect } from 'react';
import FlightSearchForm from './FlightSearchForm';
import { fetchSubscriptionsByEmail } from './api';
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

  useEffect(() => {
    localStorage.setItem('userEmail', userEmail);
  }, [userEmail]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

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
    <div className={`App ${theme}-theme`}>
      <div className="theme-controls">
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark')}
          aria-pressed={theme === 'dark'}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
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
  );
}

export default App;
