import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchAirlines, fetchAirports, searchFlights, deleteSubscription, fetchFlightById, fetchSubscriptions, updateCurrentUser } from './api';
import { isBefore, isAfter, isSameDay, addDays, format, differenceInDays, addMonths, startOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { enUS, ar, de } from 'date-fns/locale';
import FlightResultsDisplay from './FlightResultsDisplay';
import 'react-datepicker/dist/react-datepicker.css';
import './CustomDatePicker.css';
import FlightDetailModal from './FlightDetailModal';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useLanguage } from './i18n';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

const maghrebiArabicMonths = [
    '\u062c\u0627\u0646\u0641\u064a', '\u0641\u064a\u0641\u0631\u064a', '\u0645\u0627\u0631\u0633', '\u0623\u0641\u0631\u064a\u0644',
    '\u0645\u0627\u064a', '\u062c\u0648\u0627\u0646', '\u062c\u0648\u064a\u0644\u064a\u0629', '\u0623\u0648\u062a',
    '\u0633\u0628\u062a\u0645\u0628\u0631', '\u0623\u0643\u062a\u0648\u0628\u0631', '\u0646\u0648\u0641\u0645\u0628\u0631', '\u062f\u064a\u0633\u0645\u0628\u0631',
];

const getMonthName = (date, language) => (
    language === 'ar'
        ? maghrebiArabicMonths[date.getMonth()]
        : format(date, 'MMMM', { locale: { en: enUS, ar, de }[language] })
);

const FlightSearchForm = ({ theme, user, onUserUpdated, showToast, userSubscriptions, subscriptionsLoading, subscriptionsError, setUserSubscriptions }) => {
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allAirports, setAllAirports] = useState([]);
    const [allAirlines, setAllAirlines] = useState([]);
    const [isTunisiaDeparture, setIsTunisiaDeparture] = useState(true);
    const [tunisianAirports, setTunisianAirports] = useState([]);
    const [germanAirports, setGermanAirports] = useState([]);
    const [selectedDepartureAirportCodes, setSelectedDepartureAirportCodes] = useState([]);
    const [selectedArrivalAirportCodes, setSelectedArrivalAirportCodes] = useState([]);
    const minSelectableDate = useMemo(() => startOfDay(new Date()), []);
    const maxSelectableDate = useMemo(() => addMonths(minSelectableDate, 3), [minSelectableDate]);
    const initialStartDays = 0;
    const initialEndDays = differenceInDays(addMonths(minSelectableDate, 1), minSelectableDate);
    const [dateRangeSliderValues, setDateRangeSliderValues] = useState([initialStartDays, initialEndDays]);
    const [startDate, setStartDate] = useState(addDays(minSelectableDate, initialStartDays));
    const [endDate, setEndDate] = useState(addDays(minSelectableDate, initialEndDays));
    const dateRangePresets = useMemo(() => {
        const capAtMaximumDate = (date) => isAfter(date, maxSelectableDate) ? maxSelectableDate : date;
        const presets = [
            { label: t('next7Days'), start: minSelectableDate, end: capAtMaximumDate(addDays(minSelectableDate, 6)) },
            { label: t('restOfMonth', { month: getMonthName(minSelectableDate, language) }), start: minSelectableDate, end: capAtMaximumDate(endOfMonth(minSelectableDate)) },
        ];

        for (let monthOffset = 1; monthOffset <= 3; monthOffset += 1) {
            const monthStart = startOfMonth(addMonths(minSelectableDate, monthOffset));
            if (isAfter(monthStart, maxSelectableDate)) break;

            presets.push({
                label: getMonthName(monthStart, language),
                start: monthStart,
                end: capAtMaximumDate(endOfMonth(monthStart)),
            });
        }

        presets.push({ label: t('next3Months'), start: minSelectableDate, end: maxSelectableDate });
        return presets;
    }, [language, maxSelectableDate, minSelectableDate, t]);
    const [selectedAirlineCodes, setSelectedAirlineCodes] = useState([]);
    const [searchResults, setSearchResults] = useState(null);
    const resultsRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFlightFromSubscription, setSelectedFlightFromSubscription] = useState(null);
    const [displaySubscriptions, setDisplaySubscriptions] = useState([]);
    const [displaySubsLoading, setDisplaySubsLoading] = useState(false);
    const [userActionError, setUserActionError] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [notificationsSaving, setNotificationsSaving] = useState(false);
    // Kept temporarily while the legacy email controls are hidden during the OAuth migration.
    const userEmail = '';
    const userExists = false;
    const userCheckLoading = false;
    const enableEmailNotifications = true;
    const setUserEmail = () => {};
    const setUserExists = () => {};
    const setEnableEmailNotifications = () => {};
    const handleEmailBlur = () => {};
    const handleSaveUser = () => {};

    const handleNotificationToggle = async (enabled) => {
        setNotificationsSaving(true);
        setUserActionError(null);
        try {
            const updatedUser = await updateCurrentUser(enabled);
            onUserUpdated(updatedUser);
        } catch (error) {
            showToast(error.message || 'Could not update notification preferences.', 'error');
        } finally {
            setNotificationsSaving(false);
        }
    };

    const capitalizeWords = useCallback((str) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ').split('-').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join('-');
    }, []);

    const getAirportDisplayName = useCallback((code) => {
        const airport = allAirports.find(a => a.code === code);
        return airport ? `${capitalizeWords(airport.name)} (${code})` : code;
    }, [allAirports, capitalizeWords]);

    const getAirlineDisplayName = useCallback((code) => {
        const airline = allAirlines.find(a => a.code === code);
        return airline ? `${capitalizeWords(airline.name)} (${code})` : code;
    }, [allAirlines, capitalizeWords]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [airlines, airports] = await Promise.all([
                    fetchAirlines(),
                    fetchAirports()
                ]);
                setAllAirlines(airlines);
                setAllAirports(airports);
                const tnAirports = airports.filter(a => a.country === 'TN');
                const deAirports = airports.filter(a => a.country === 'DE');
                setTunisianAirports(tnAirports);
                setGermanAirports(deAirports);
                setSelectedDepartureAirportCodes(tnAirports.length > 0 ? [tnAirports[0].code] : []);
                setSelectedArrivalAirportCodes(deAirports.length > 0 ? [deAirports[0].code] : []);
            } catch (err) {
                setError("Failed to load initial data. " + err.message);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const loadAndEnrichSubscriptions = useCallback(async () => {
        if (!user) {
            setDisplaySubscriptions([]);
            setUserSubscriptions([]);
            return;
        }
        setDisplaySubsLoading(true);
        try {
            const rawSubs = await fetchSubscriptions();
            const enrichedSubsPromises = rawSubs.map(async (sub) => {
                try {
                    const flightDetails = await fetchFlightById(sub.flightId);
                    return {
                        ...sub,
                        flightDepartureAirportCode: flightDetails.departureAirportCode,
                        flightArrivalAirportCode: flightDetails.arrivalAirportCode,
                        flightDepartureDate: flightDetails.departureDate,
                        flightAirlineCode: flightDetails.airlineCode,
                        flightPrice: flightDetails.priceEur
                    };
                } catch (flightErr) {
                    console.warn(`Could not fetch details for flight ${sub.flightId}:`, flightErr);
                    return {
                        ...sub,
                        flightDepartureAirportCode: 'N/A',
                        flightArrivalAirportCode: 'N/A',
                        flightDepartureDate: null,
                        flightAirlineCode: 'N/A',
                        flightPrice: 'N/A'
                    };
                }
            });
            const enrichedSubs = await Promise.all(enrichedSubsPromises);
            setDisplaySubscriptions(enrichedSubs);
        } catch (err) {
            console.error("Failed to load and enrich subscriptions:", err);
        } finally {
            setDisplaySubsLoading(false);
        }
    }, [user, setUserSubscriptions]);

    useEffect(() => {
        if (user) {
            loadAndEnrichSubscriptions();
        }
    }, [user, loadAndEnrichSubscriptions]);

    useEffect(() => {
        setUserSubscriptions(displaySubscriptions);
    }, [displaySubscriptions, setUserSubscriptions]);

    useEffect(() => {
        if (!loading && searchResults && Object.keys(searchResults).length > 0) {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [loading, searchResults]);

    const handleDepartureAirportToggle = (airportCode) => {
        setSelectedDepartureAirportCodes(prev => {
            const newCodes = prev.includes(airportCode)
                ? prev.filter(code => code !== airportCode)
                : [...prev, airportCode];
            if (newCodes.length > 0) {
                setFormErrors(prev => ({ ...prev, selectedDepartureAirportCodes: null }));
            }
            return newCodes;
        });
    };

    const handleArrivalAirportToggle = (airportCode) => {
        setSelectedArrivalAirportCodes(prev => {
            const newCodes = prev.includes(airportCode)
                ? prev.filter(code => code !== airportCode)
                : [...prev, airportCode];
            if (newCodes.length > 0) {
                setFormErrors(prev => ({ ...prev, selectedArrivalAirportCodes: null }));
            }
            return newCodes;
        });
    };

    const handleDirectionSwitch = () => {
        setIsTunisiaDeparture(prev => !prev);
        setSelectedDepartureAirportCodes(selectedArrivalAirportCodes);
        setSelectedArrivalAirportCodes(selectedDepartureAirportCodes);
        setFormErrors(prev => ({ ...prev, selectedDepartureAirportCodes: null, selectedArrivalAirportCodes: null }));
    };

    const handleAirlineToggle = (airlineCode) => {
        setSelectedAirlineCodes(prev =>
            prev.includes(airlineCode)
                ? prev.filter(code => code !== airlineCode)
                : [...prev, airlineCode]
        );
    };

    const validateForm = useCallback(() => {
        const errors = {};
        if (selectedDepartureAirportCodes.length === 0) {
            errors.selectedDepartureAirportCodes = "Please select at least one departure airport.";
        }
        if (selectedArrivalAirportCodes.length === 0) {
            errors.selectedArrivalAirportCodes = "Please select at least one arrival airport.";
        }
        if (!startDate || !endDate) {
            errors.dateRange = "Please select a date range.";
        } else {
            const today = startOfDay(new Date());
            if (isBefore(endDate, startDate)) {
                errors.dateRange = "End date cannot be before start date.";
            }
            if (isBefore(startDate, today)) {
                errors.dateRange = "Start date cannot be before today's date.";
            }
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [selectedDepartureAirportCodes, selectedArrivalAirportCodes, startDate, endDate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        setLoading(true);
        setError(null);
        setSearchResults(null);
        try {
            const flights = await searchFlights({
                departureAirportCodes: selectedDepartureAirportCodes,
                arrivalAirportCodes: selectedArrivalAirportCodes,
                startDate: format(startDate, 'yyyy-MM-dd'),
                endDate: format(endDate, 'yyyy-MM-dd'),
                airlineCodes: selectedAirlineCodes
            });
            const groupedResults = flights.reduce((acc, flight) => {
                const route = `${flight.departureAirportCode}-${flight.arrivalAirportCode}`;
                if (!acc[route]) {
                    acc[route] = [];
                }
                acc[route].push(flight);
                return acc;
            }, {});
            setSearchResults(groupedResults);
        } catch (err) {
            setError("Failed to fetch flights. " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSubscription = async (subId, event) => {
        event.stopPropagation();
        if (window.confirm("Are you sure you want to delete this subscription?")) {
            try {
                await deleteSubscription(subId);
                setDisplaySubscriptions(prevSubs => prevSubs.filter(sub => sub.id !== subId));
                showToast('Subscription deleted successfully!');
            } catch (err) {
                showToast('Failed to delete subscription: ' + err.message, 'error');
                console.error("Delete subscription error:", err);
            }
        }
    };

    const handleSubscriptionClick = useCallback(async (subscription) => {
        setLoading(true);
        setError(null);
        try {
            let flightDetails = subscription;
            if (!flightDetails.priceEur || !flightDetails.airlineCode || !flightDetails.departureAirportCode) {
                const fetchedDetails = await fetchFlightById(subscription.flightId);
                flightDetails = { ...subscription, ...fetchedDetails };
            }
            setSelectedFlightFromSubscription(flightDetails);
            setIsModalOpen(true);
        } catch (err) {
            console.error("Error fetching flight details for subscription:", err);
            setError("Failed to load flight details for this subscription.");
        } finally {
            setLoading(false);
        }
    }, []);

    const onSliderChange = useCallback((values) => {
        const [startDays, endDays] = values;
        const newStartDate = addDays(minSelectableDate, startDays);
        const newEndDate = addDays(minSelectableDate, endDays);
        setStartDate(newStartDate);
        setEndDate(newEndDate);
        setDateRangeSliderValues(values);
        setFormErrors(prev => ({ ...prev, dateRange: null }));
    }, [minSelectableDate]);

    const handleDateRangePreset = useCallback((preset) => {
        setStartDate(preset.start);
        setEndDate(preset.end);
        setDateRangeSliderValues([
            differenceInDays(preset.start, minSelectableDate),
            differenceInDays(preset.end, minSelectableDate),
        ]);
        setFormErrors(prev => ({ ...prev, dateRange: null }));
    }, [minSelectableDate]);

    const generateMarks = useCallback(() => {
        const marks = {};
        const totalDays = differenceInDays(maxSelectableDate, minSelectableDate);
        const numIntervals = 4;
        const intervalDays = Math.ceil(totalDays / numIntervals);
        for (let i = 0; i <= totalDays; i += intervalDays) {
            const date = addDays(minSelectableDate, i);
            marks[i] = format(date, 'dd MMM yyyy');
        }
        if (!(totalDays in marks)) {
            marks[totalDays] = format(maxSelectableDate, 'dd MMM yyyy');
        }
        return marks;
    }, [minSelectableDate, maxSelectableDate]);

    const loadingMessage = loading && searchResults === null && error === null && (
        <div className="info-message">{t('searching')}</div>
    );
    const errorMessage = error && (!allAirports.length || !allAirlines.length) && (
        <div className="info-message">Error: {error}</div>
    );
    const noFlightsMessage = searchResults && Object.keys(searchResults).length === 0 && !loading && (
        <div className="info-message">{t('noFlights')}</div>
    );

    return (
        <div className="flight-search-container">
            <h1>{user ? t('welcomeTuniFly', { name: user.displayName || user.email.split('@')[0] }) : t('welcomeTuniFlyGuest')}</h1>
            <form onSubmit={handleSubmit} className="form-grid">
                <fieldset className="email-section full-span">
                    <legend>{t('subscription')}</legend>
                    {!user && (
                        <div className="save-user-section">
                            <p className="email-clarification-text">{t('signInToSaveAlerts')}</p>
                        </div>
                    )}
                    {user && (
                        <>
                            <div className="notification-checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={user.enableNotificationsSetting}
                                        disabled={notificationsSaving}
                                        onChange={(event) => handleNotificationToggle(event.target.checked)}
                                    />
                                    {t('enableNotifications')}
                                </label>
                            </div>
                            {notificationsSaving && <p className="loading-spinner">Saving notification preference...</p>}
                            {(displaySubsLoading || subscriptionsLoading) && <p className="loading-spinner">Loading your subscriptions...</p>}
                            {subscriptionsError && !displaySubsLoading && <p className="error-text-small">{subscriptionsError}</p>}
                            <div className="user-subscriptions-list">
                                <h3 className="subscriptions-header">
                                    {t('trackedFlights')}
                                    <button type="button" onClick={loadAndEnrichSubscriptions} className="refresh-button" title="Refresh Subscriptions">↻</button>
                                </h3>
                                {displaySubscriptions.length > 0 ? (
                                    <ul>
                                        {displaySubscriptions.map(sub => (
                                            <li key={sub.id} onClick={() => sub.flightDepartureDate && handleSubscriptionClick(sub)}>
                                                <span className="subscription-status-icon">{sub.isActive ? '🟢' : '⚫'}</span>
                                                <span className="subscription-details">
                                                    {getAirportDisplayName(sub.flightDepartureAirportCode)} → {getAirportDisplayName(sub.flightArrivalAirportCode)}
                                                    {sub.flightDepartureDate && <span className="sub-date"> on {format(new Date(sub.flightDepartureDate), 'dd MMM')}</span>}
                                                    <span className="sub-airline">{getAirlineDisplayName(sub.flightAirlineCode)}</span>
                                                </span>
                                                <span className="sub-price">{t('target')} {sub.targetPrice.toFixed(0)}€</span>
                                                <button type="button" className="delete-sub-button" onClick={(event) => handleDeleteSubscription(sub.id, event)} title="Delete Subscription">×</button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="no-subscriptions-message">{t('noTrackedFlights')}</p>
                                )}
                            </div>
                        </>
                    )}
                    {false && <>
                    <div className="input-group">
                        <label htmlFor="userEmail">{t('email')}</label>
                        <input
                            type="email"
                            id="userEmail"
                            value={userEmail}
                            onChange={(e) => {
                                setUserEmail(e.target.value);
                                setUserExists(false);
                                setUserActionError(null);
                                setFormErrors(prev => ({ ...prev, userEmail: null, userExists: null }));
                            }}
                            onBlur={handleEmailBlur}
                            placeholder={t('emailPlaceholder')}
                            className="text-input"
                        />
                    </div>
                    <p className="email-clarification-text">
                        {t('emailHelp')}
                    </p>
                    {formErrors.userEmail && <p className="error-message-inline">{formErrors.userEmail}</p>}
                    {userCheckLoading && <p className="loading-spinner">Checking user status...</p>}
                    {userActionError && <p className={`feedback-message ${userActionError.includes('success') ? 'success-message-inline' : 'error-message-inline'}`}>{userActionError}</p>}
                    {!userCheckLoading && !userExists && userEmail && userEmail.includes('@') && userEmail.includes('.') && (
                        <div className="save-user-section">
                            <button type="button" className="save-user-button" onClick={handleSaveUser}>
                                {t('saveEmail')}
                            </button>
                            <p className="save-user-info-text">{t('saveEmailHelp')}</p>
                        </div>
                    )}
                    {userExists && !userCheckLoading && (
                        <>
                            <div className="notification-checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={enableEmailNotifications}
                                        onChange={(e) => setEnableEmailNotifications(e.target.checked)}
                                    /> {t('notifications')}
                                </label>
                            </div>
                            <p className="subscription-info-text">
                                {t('subscriptionHelp')}
                            </p>
                            {displaySubsLoading && <p className="loading-spinner">Loading your subscriptions...</p>}
                            {subscriptionsError && !displaySubsLoading && <p className="error-text-small">{subscriptionsError}</p>}
                            <div className="user-subscriptions-list">
                                <h3 className="subscriptions-header">
                                    Your Subscribed Flights:
                                    <button type="button" onClick={loadAndEnrichSubscriptions} className="refresh-button" title="Refresh Subscriptions">
                                        ↻
                                    </button>
                                </h3>
                                {displaySubscriptions.length > 0 ? (
                                    <ul>
                                        {displaySubscriptions.map(sub => (
                                            <li key={sub.id} onClick={() => sub.flightDepartureDate && handleSubscriptionClick(sub)}>
                                                <span className="subscription-status-icon">
                                                    {sub.isActive ? '🟢' : '⚫'}
                                                </span>
                                                <span className="subscription-details">
                                                    {getAirportDisplayName(sub.flightDepartureAirportCode)} → {getAirportDisplayName(sub.flightArrivalAirportCode)}
                                                    {sub.flightDepartureDate && (
                                                        <span className="sub-date">
                                                            on {format(new Date(sub.flightDepartureDate), 'dd MMM')}
                                                        </span>
                                                    )}
                                                    <span className="sub-airline">{getAirlineDisplayName(sub.flightAirlineCode)}</span>
                                                </span>
                                                <span className="sub-price">Target: {sub.targetPrice.toFixed(0)}€</span>
                                                <button
                                                    type="button"
                                                    className="delete-sub-button"
                                                    onClick={(event) => handleDeleteSubscription(sub.id, event)}
                                                    title="Delete Subscription"
                                                >
                                                    ×
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="no-subscriptions-message">You have no active flight price subscriptions.</p>
                                )}
                            </div>
                        </>
                    )}
                    {formErrors.userExists && <p className="error-message-inline">{formErrors.userExists}</p>}
                    </>}
                </fieldset>
                <fieldset className="airport-selection-section full-span">
                    <legend>{t('airports')}</legend>
                    <div className="airport-selection-grid">
                        <div className="departure-airports-column">
                            <h3>{t('departure')} {t(isTunisiaDeparture ? 'tunisia' : 'germany')}</h3>
                            <div className="button-group-vertical">
                                {(isTunisiaDeparture ? tunisianAirports : germanAirports).map(airport => (
                                    <button
                                        key={airport.code}
                                        type="button"
                                        onClick={() => handleDepartureAirportToggle(airport.code)}
                                        className={`airport-button ${selectedDepartureAirportCodes.includes(airport.code) ? 'selected' : ''}`}
                                    >
                                        {getAirportDisplayName(airport.code)}
                                    </button>
                                ))}
                            </div>
                            {formErrors.selectedDepartureAirportCodes && <p className="error-message-inline">{formErrors.selectedDepartureAirportCodes}</p>}
                        </div>
                        <div className="direction-switch-column">
                            <button
                                type="button"
                                className="direction-switch-button"
                                onClick={handleDirectionSwitch}
                                title={t('switchDirection')}
                            >
                                ⇄
                            </button>
                        </div>
                        <div className="arrival-airports-column">
                            <h3>{t('arrival')} {t(isTunisiaDeparture ? 'germany' : 'tunisia')}</h3>
                            <div className="button-group-vertical">
                                {(isTunisiaDeparture ? germanAirports : tunisianAirports).map(airport => (
                                    <button
                                        key={airport.code}
                                        type="button"
                                        onClick={() => handleArrivalAirportToggle(airport.code)}
                                        className={`airport-button ${selectedArrivalAirportCodes.includes(airport.code) ? 'selected' : ''}`}
                                    >
                                        {getAirportDisplayName(airport.code)}
                                    </button>
                                ))}
                            </div>
                            {formErrors.selectedArrivalAirportCodes && <p className="error-message-inline">{formErrors.selectedArrivalAirportCodes}</p>}
                        </div>
                    </div>
                </fieldset>
                <fieldset className="date-range-section full-span">
                    <legend>{t('dateRange')}</legend>
                    <div className="date-range-presets" aria-label={t('datePresets')}>
                        {dateRangePresets.map((preset) => {
                            const isSelected = isSameDay(startDate, preset.start) && isSameDay(endDate, preset.end);
                            return (
                                <button
                                    key={preset.label}
                                    type="button"
                                    className={`date-preset-button ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleDateRangePreset(preset)}
                                >
                                    {preset.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="date-range-slider-container">
                        <div className="selected-date-display">
                            <span>{t('start')} {format(startDate, 'dd MMM yyyy')}</span>
                            <span>{t('end')} {format(endDate, 'dd MMM yyyy')}</span>
                        </div>
                        <Slider
                            range
                            min={0}
                            max={differenceInDays(maxSelectableDate, minSelectableDate)}
                            value={dateRangeSliderValues}
                            onChange={onSliderChange}
                            marks={generateMarks()}
                            step={1}
                            trackStyle={[{ backgroundColor: 'var(--primary-button-bg)' }]}
                            handleStyle={[
                                { backgroundColor: 'var(--primary-button-bg)', borderColor: 'var(--primary-button-bg)' },
                                { backgroundColor: 'var(--primary-button-bg)', borderColor: 'var(--primary-button-bg)' }
                            ]}
                            railStyle={{ backgroundColor: 'var(--border-color)' }}
                            dotStyle={{ borderColor: 'var(--border-color)' }}
                        />
                    </div>
                    {formErrors.dateRange && <p className="error-message-inline">{formErrors.dateRange}</p>}
                </fieldset>
                <fieldset className="airline-selection-section full-span">
                    <legend>{t('airlines')}</legend>
                    <div className="button-group">
                        {allAirlines.filter(a => a.code === 'BJ' || a.code === 'TU').map(airline => (
                            <button
                                key={airline.code}
                                type="button"
                                onClick={() => handleAirlineToggle(airline.code)}
                                className={`airline-button ${selectedAirlineCodes.includes(airline.code) ? 'selected' : ''}`}
                            >
                                {capitalizeWords(airline.name)} ({airline.code})
                            </button>
                        ))}
                    </div>
                </fieldset>
            </form>
            <button type="submit" className="submit-button" onClick={handleSubmit}>
                {t('showFlights')}
            </button>
            {loadingMessage}
            {errorMessage}
            {noFlightsMessage}
            <div ref={resultsRef} className="search-results-anchor">
                {searchResults && Object.keys(searchResults).length > 0 ? (
                    <FlightResultsDisplay
                        theme={theme}
                        groupedFlights={searchResults}
                        airlines={allAirlines}
                        isAuthenticated={Boolean(user)}
                        userSubscriptions={userSubscriptions}
                        setUserSubscriptions={setUserSubscriptions}
                        showToast={showToast}
                    />
                ) : null}
            </div>
            {isModalOpen && selectedFlightFromSubscription && (
                <FlightDetailModal
                    theme={theme}
                    flight={selectedFlightFromSubscription}
                    onClose={() => setIsModalOpen(false)}
                    airlines={allAirlines}
                    isAuthenticated={Boolean(user)}
                    userSubscriptions={userSubscriptions}
                    setUserSubscriptions={setUserSubscriptions}
                    showToast={showToast}
                />
            )}
        </div>
    );
};

export default FlightSearchForm;
