import React from 'react';
import { useLanguage } from './i18n';

function LandingPage() {
  const { t } = useLanguage();

  return (
    <section className="landing-page" aria-labelledby="landing-title">
      <div className="landing-card">
        <h1 id="landing-title">TuniFly</h1>
        <p className="landing-description">{t('appDescription')}</p>
        <p className="landing-sign-in-purpose">{t('googleDataUse')}</p>
        <div className="landing-actions">
          <a className="landing-search-link" href="/search">{t('searchFlights')}</a>
        </div>
      </div>
    </section>
  );
}

export default LandingPage;
