import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { deleteSubscription, fetchAirlines, fetchAirports, fetchFlightById, updateCurrentUser } from './api';
import FlightDetailModal from './FlightDetailModal';
import { useLanguage } from './i18n';

const titleCase = (value) => value ? value.toLowerCase().split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : '';

export default function AlertsPage({ theme, user, onUserUpdated, showToast, userSubscriptions, setUserSubscriptions, subscriptionsLoading, subscriptionsError }) {
  const { t } = useLanguage();
  const [airports, setAirports] = useState([]); const [airlines, setAirlines] = useState([]);
  const [displaySubscriptions, setDisplaySubscriptions] = useState([]); const [loading, setLoading] = useState(false);
  const [notificationsSaving, setNotificationsSaving] = useState(false); const [selectedFlight, setSelectedFlight] = useState(null);
  const [showNotificationInfo, setShowNotificationInfo] = useState(false);
  useEffect(() => { Promise.all([fetchAirports(), fetchAirlines()]).then(([a, l]) => { setAirports(a); setAirlines(l); }).catch(console.error); }, []);
  const loadSubscriptions = useCallback(async () => {
    if (!user) return setDisplaySubscriptions([]);
    setLoading(true);
    try { setDisplaySubscriptions(await Promise.all(userSubscriptions.map(async (sub) => { try { return { ...sub, ...(await fetchFlightById(sub.flightId)) }; } catch { return sub; } }))); }
    finally { setLoading(false); }
  }, [user, userSubscriptions]);
  useEffect(() => { loadSubscriptions(); }, [loadSubscriptions]);
  const airport = (code) => { const item = airports.find((a) => a.code === code); return item ? `${titleCase(item.name)} (${code})` : code || '—'; };
  const airline = (code) => { const item = airlines.find((a) => a.code === code); return item ? `${titleCase(item.name)} (${code})` : code || ''; };
  const toggleNotifications = async (enabled) => { setNotificationsSaving(true); try { onUserUpdated(await updateCurrentUser(enabled)); } catch (error) { showToast(error.message || 'Could not update notification preferences.', 'error'); } finally { setNotificationsSaving(false); } };
  const removeAlert = async (id) => { if (!window.confirm(t('deleteAlertConfirmation'))) return; try { await deleteSubscription(id); setUserSubscriptions((current) => current.filter((sub) => sub.id !== id)); showToast(t('alertDeleted')); } catch (error) { showToast(error.message || 'Could not delete this alert.', 'error'); } };
  if (!user) return <section className="alerts-page empty-alerts"><h1>{t('priceAlerts')}</h1><p>{t('signInToManageAlerts')}</p></section>;
  return <section className="alerts-page" aria-label={t('priceAlerts')}>
    <header className="alerts-page-header">
      <p>{t('manageAlertsDescription')}</p>
    </header>
    <section className="alerts-settings">
      <label><input type="checkbox" checked={Boolean(user.enableNotificationsSetting)} disabled={notificationsSaving} onChange={(event) => toggleNotifications(event.target.checked)} /> {t('enableNotifications')}</label>
      <div className="notification-info-control">
        <button type="button" className="notification-info-button" onClick={() => setShowNotificationInfo((visible) => !visible)} aria-expanded={showNotificationInfo} aria-controls="notification-info" aria-label={t('notificationInfoLabel')}>i</button>
      {notificationsSaving && <span className="loading-spinner">{t('saving')}</span>}
      {showNotificationInfo && <div id="notification-info" className="notification-info-panel" role="region" aria-label={t('notificationInfoLabel')}>
          <strong>{t('notificationInfoLabel')}</strong>
          <button type="button" className="notification-info-close" onClick={() => setShowNotificationInfo(false)} aria-label={t('closeDetails')}>×</button>
          <p>{t('notificationInfo')}</p>
      </div>}
      </div>
    </section>
    {(loading || subscriptionsLoading) && <p className="info-message">{t('loadingAlerts')}</p>}{subscriptionsError && <p className="error-message-inline">{subscriptionsError}</p>}
    {!loading && !subscriptionsLoading && !displaySubscriptions.length && <div className="alerts-empty-state"><p>{t('noTrackedFlights')}</p><a className="alerts-search-link" href="/search">{t('searchFlights')}</a></div>}
    <ul className="alerts-list">{displaySubscriptions.map((sub) => <li key={sub.id} className="alert-card"><button type="button" className="alert-card-main" onClick={() => setSelectedFlight(sub)}><span className="subscription-status-icon">{sub.isActive ? '🟢' : '⚫'}</span><span><strong>{airport(sub.departureAirportCode)} → {airport(sub.arrivalAirportCode)}</strong><small>{sub.departureDate && format(new Date(sub.departureDate), 'dd MMM yyyy')} {airline(sub.airlineCode)}</small></span><span className="sub-price">{t('target')} {Number(sub.targetPrice).toFixed(0)}€</span></button><button type="button" className="delete-sub-button" onClick={() => removeAlert(sub.id)} title={t('deleteSubscription')} aria-label={t('deleteSubscription')}>×</button></li>)}</ul>
    {selectedFlight && <FlightDetailModal theme={theme} flight={selectedFlight} onClose={() => setSelectedFlight(null)} airlines={airlines} isAuthenticated userSubscriptions={userSubscriptions} setUserSubscriptions={setUserSubscriptions} showToast={showToast} />}
  </section>;
}
