import React from 'react';
import { useLanguage } from './i18n';

function LandingPage({ onNavigate }) {
  const { t } = useLanguage();

  return (
    <section className="landing-page" aria-labelledby="landing-title">
      <div className="landing-card">
        <h1 id="landing-title">{t('landingTitle')}</h1>
        <p className="landing-description">{t('appDescription')}</p>
        <div className="landing-actions">
          <a className="landing-search-link" href="/search" onClick={(event) => { event.preventDefault(); onNavigate('/search'); }}>{t('searchFlights')}</a>
          <a className="landing-search-link" href="/alerts" onClick={(event) => { event.preventDefault(); onNavigate('/alerts'); }}>{t('myPriceAlerts')}</a>
        </div>
      </div>
    </section>
  );
}

export default LandingPage;
