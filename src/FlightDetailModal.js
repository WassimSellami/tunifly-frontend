import { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { createSubscription, fetchPriceHistory, updateSubscription } from './api';
import './FlightDetailModal.css';

import tuLogo from './assets/tu_logo.png';
import bjLogo from './assets/bj_logo.png';

import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Title, Tooltip, Legend, Filler
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import 'chartjs-adapter-date-fns';
import { parseISO, differenceInDays, format } from 'date-fns';
import { useLanguage } from './i18n';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Title, Tooltip, Legend, Filler, ChartDataLabels
);

const airlineLogos = {
    TU: tuLogo,
    BJ: bjLogo,
};

const AirlineDisplay = ({ code, name }) => {
    const logoSrc = airlineLogos[code];
    return (
        <div className="airline-display">
            {logoSrc ? (
                <img src={logoSrc} alt={`${name} logo`} className="airline-logo" />
            ) : (
                <span className="airline-name">{name}</span>
            )}
        </div>
    );
};

const PriceGauge = ({ current, analytics, t }) => {
    if (!analytics) return null;
    const { gaugeMin, gaugeMax, minPrice, maxPrice, lowThreshold, highThreshold, status } = analytics;
    const gaugeRange = gaugeMax - gaugeMin;

    if (gaugeRange <= 0) return null;

    const lowWidth = 25;
    const avgWidth = 50;
    const highWidth = 25;

    const position = ((current - gaugeMin) / gaugeRange) * 100;
    const clampedPosition = Math.max(3, Math.min(97, position));

    return (
        <div className="price-gauge-container">
            <div className="gauge-range-labels">
                <span className="gauge-min-label">{t('min')}</span>
                <span className="gauge-max-label">{t('max')}</span>
            </div>
            <div className="gauge-track">
                <div className="gauge-bar-low" style={{ width: `${lowWidth}%` }}></div>
                <div className="gauge-bar-avg" style={{ width: `${avgWidth}%` }}></div>
                <div className="gauge-bar-high" style={{ width: `${highWidth}%` }}></div>
            </div>
            <div className="gauge-handle" style={{ left: `${clampedPosition}%` }}>
                <div className="gauge-handle-label">€{current.toFixed(0)} is {status}</div>
                <div className="gauge-handle-dot"></div>
            </div>
            <div className="gauge-labels">
                <span className="gauge-min-price">€{minPrice.toFixed(0)}</span>
                <span className="gauge-usual-low-price">€{lowThreshold.toFixed(0)}</span>
                <span className="gauge-usual-high-price">€{highThreshold.toFixed(0)}</span>
                <span className="gauge-max-price">€{maxPrice.toFixed(0)}</span>
            </div>
        </div>
    );
};


const FlightDetailModal = ({ theme, flight, onClose, airlines, userEmail, userSubscriptions = [], setUserSubscriptions }) => {
    const { t } = useLanguage();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [targetPrice, setTargetPrice] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [subscriptionFeedback, setSubscriptionFeedback] = useState(null);
    const [isSmallScreen, setIsSmallScreen] = useState(() => window.innerWidth <= 640);
    const currentPriceTimestamp = useMemo(() => new Date(), [flight?.id, flight?.priceEur]);
    const currentSubscription = useMemo(
        () => userSubscriptions.find(subscription => subscription.flightId === flight?.id),
        [flight?.id, userSubscriptions]
    );
    const isDarkTheme = theme === 'dark';
    const chartTickColor = isDarkTheme ? '#909090' : '#666666';
    const chartGridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)';

    const priceAnalytics = useMemo(() => {
        if (history.length < 2) return null;
        const prices = history.map(h => h.priceEur);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const historicalRange = maxPrice - minPrice;

        if (historicalRange <= 0) return null;

        const padding = historicalRange / 4;
        const gaugeMin = minPrice - padding;
        const gaugeMax = maxPrice + padding;
        const gaugeRange = gaugeMax - gaugeMin;

        const lowThreshold = gaugeMin + (gaugeRange * 0.25);
        const highThreshold = gaugeMin + (gaugeRange * 0.75);

        let status = 'average';
        if (flight.priceEur < lowThreshold) status = 'low';
        else if (flight.priceEur > highThreshold) status = 'high';

        return {
            minPrice,
            maxPrice,
            gaugeMin,
            gaugeMax,
            lowThreshold,
            highThreshold,
            status
        };
    }, [history, flight.priceEur]);


    useEffect(() => {
        const loadModalData = async () => {
            if (!flight || !flight.id) return;
            setLoading(true);
            try {
                const historyData = await fetchPriceHistory(flight.id);
                setHistory(historyData);
            } catch (err) { console.error("Failed to load flight history:", err); }
            setLoading(false);
        };
        loadModalData();
    }, [flight]);

    useEffect(() => {
        setTargetPrice(currentSubscription ? currentSubscription.targetPrice.toFixed(0) : '');
    }, [flight?.id, currentSubscription]);

    useEffect(() => {
        const handleResize = () => setIsSmallScreen(window.innerWidth <= 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setSubscriptionFeedback(null);
    }, [flight?.id]);

    const handleSetAlert = async () => {
        const parsedTargetPrice = Number(targetPrice);
        if (!Number.isFinite(parsedTargetPrice) || parsedTargetPrice <= 0) {
            setSubscriptionFeedback({ type: 'error', text: 'Enter a target price greater than zero.' });
            return;
        }

        setSubmitting(true);
        setSubscriptionFeedback(null);
        try {
            const savedSubscription = currentSubscription
                ? await updateSubscription(currentSubscription.id, { targetPrice: parsedTargetPrice, isActive: true })
                : await createSubscription({ flightId: flight.id, email: userEmail, targetPrice: parsedTargetPrice, isActive: true });

            setUserSubscriptions?.(previousSubscriptions => {
                const withoutCurrentFlight = previousSubscriptions.filter(subscription => subscription.flightId !== flight.id);
                return [...withoutCurrentFlight, savedSubscription];
            });
        } catch (error) {
            console.error('Failed to save subscription:', error);
            setSubscriptionFeedback({ type: 'error', text: error.message || 'Could not save your price alert.' });
        } finally {
            setSubmitting(false);
        }
    };

    const chartOptions = useMemo(() => {
        if (!priceAnalytics || history.length === 0) return {};

        const timestamps = [...history.map(h => parseISO(h.timestamp).getTime()), currentPriceTimestamp.getTime()];
        const minTimestamp = Math.min(...timestamps);
        const maxTimestamp = Math.max(...timestamps);

        let totalRangeMs = maxTimestamp - minTimestamp;
        if (totalRangeMs === 0) {
            totalRangeMs = 5 * 24 * 60 * 60 * 1000;
        }

        const startPaddingMs = totalRangeMs * 0.05;
        const endPaddingMs = totalRangeMs * 0.10;

        const xMin = minTimestamp - startPaddingMs;
        const xMax = maxTimestamp + endPaddingMs;

        const { minPrice, maxPrice } = priceAnalytics;
        const chartMinPrice = Math.min(minPrice, flight.priceEur);
        const chartMaxPrice = Math.max(maxPrice, flight.priceEur);
        const range = chartMaxPrice - chartMinPrice;
        const stepSize = range > 100 ? 25 : (range > 50 ? 10 : 5);
        const yMin = Math.floor(chartMinPrice / stepSize) * stepSize - stepSize / 2;
        const yMax = Math.ceil(chartMaxPrice / stepSize) * stepSize + stepSize / 2;

        return {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false }, datalabels: { display: false },
                tooltip: {
                    enabled: true, backgroundColor: isDarkTheme ? '#5a8eec' : '#007bff', padding: 12, cornerRadius: 16,
                    displayColors: false, yAlign: 'bottom', caretPadding: 15,
                    xAlign: (context) => (context.tooltip.x + context.tooltip.width / 2 > context.chart.width) ? 'right' : 'left',
                    callbacks: {
                        title: () => '',
                        label: (context) => context.dataset.label === 'Current Price'
                            ? `Current price - €${context.parsed.y.toFixed(0)}`
                            : `${differenceInDays(new Date(), new Date(context.parsed.x))} days ago - €${context.parsed.y.toFixed(0)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'day' },
                    grid: { color: chartGridColor },
                    ticks: {
                        display: !isSmallScreen,
                        autoSkip: true,
                        maxTicksLimit: 6,
                        maxRotation: 45,
                        minRotation: 45,
                        color: chartTickColor,
                        callback: (val) => `${differenceInDays(new Date(), new Date(val))} days ago`,
                    },
                    min: xMin,
                    max: xMax,
                },
                y: {
                    grid: { color: chartGridColor },
                    ticks: { color: chartTickColor, stepSize: stepSize, callback: (val) => `€${val}` },
                    min: yMin,
                    max: yMax,
                }
            }
        };
    }, [priceAnalytics, history, isSmallScreen, flight.priceEur, currentPriceTimestamp, isDarkTheme, chartGridColor, chartTickColor]);

    if (!flight) return null;

    const airline = airlines.find(a => a.code === flight.airlineCode);
    const departureDateFormatted = format(parseISO(flight.departureDate), 'EEE, dd MMM yyyy');
    const chartData = {
        datasets: [{
            label: 'Price History', data: history.map(h => ({ x: parseISO(h.timestamp), y: h.priceEur })),
            borderColor: '#88aaff', backgroundColor: 'rgba(136, 170, 255, 0.15)',
            fill: true, tension: 0.1, pointRadius: 0, pointHoverRadius: 6,
            pointHoverBackgroundColor: '#88aaff', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2
        }, {
            label: 'Current Price', data: [{ x: currentPriceTimestamp, y: flight.priceEur }],
            showLine: false, pointRadius: 7, pointHoverRadius: 9,
            pointBackgroundColor: '#5a8eec', pointBorderColor: '#fff', pointBorderWidth: 3,
            datalabels: {
                display: true,
                align: 'top',
                anchor: 'end',
                backgroundColor: '#5a8eec',
                borderRadius: 10,
                color: '#fff',
                font: { weight: 'bold' },
                padding: { top: 4, right: 8, bottom: 4, left: 8 },
                formatter: (value) => `€${value.y.toFixed(0)}`
            }
        }]
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose} aria-label={t('closeDetails')}>&times;</button>
                <div className="modal-column-left">
                    <div className="price-history-section">
                        <h3>{t('history')}</h3>
                        <div className="modal-chart-container">
                            {!loading && chartData.datasets[0].data.length > 1 ? (<Line options={chartOptions} data={chartData} />) : (<p>{t('loadingChart')}</p>)}
                        </div>
                    </div>
                </div>

                <div className="modal-column-right">
                    <div className="modal-top-info">
                        <AirlineDisplay code={airline?.code} name={airline?.name || flight.airlineCode} />
                        <span className="flight-date">{departureDateFormatted}</span>
                    </div>

                    <div className="price-analysis-section">
                        <h2 className="price-analysis-header">Prices are currently <span className={`price-status ${priceAnalytics?.status || ''}`}>{priceAnalytics?.status || '...'}</span></h2>
                        <p className="price-range-info">
                            Similar trips usually cost between €{priceAnalytics?.lowThreshold.toFixed(0)}–€{priceAnalytics?.highThreshold.toFixed(0)}.
                        </p>
                    </div>

                    <div className="price-gauge-wrapper">
                        {!loading && <PriceGauge current={flight.priceEur} analytics={priceAnalytics} t={t} />}
                    </div>

                    <div className="modal-actions-panel">
                        <div className="subscription-form-container">
                            <h3>{t('trackFlight')}</h3>
                            <div className="form-group">
                                <input
                                    type="number"
                                    placeholder={currentSubscription ? `Current alert: €${currentSubscription.targetPrice.toFixed(0)}` : 'Target Price'}
                                    value={targetPrice}
                                    onChange={e => setTargetPrice(e.target.value)}
                                    className="target-price-input"
                                    disabled={submitting || !userEmail}
                                />
                                <button type="button" className="action-button" onClick={handleSetAlert} disabled={submitting || !userEmail}>
                                    {submitting ? t('saving') : currentSubscription ? t('updateAlert') : t('setAlert')}
                                </button>
                            </div>
                            {!userEmail && (
                                <p className="subscription-email-prompt">{t('emailFirst')}</p>
                            )}
                            {currentSubscription && (
                                <p className="subscription-feedback success">{t('alreadyTracking')}</p>
                            )}
                            {subscriptionFeedback && (
                                <p className={`subscription-feedback ${subscriptionFeedback.type}`}>{subscriptionFeedback.text}</p>
                            )}
                        </div>
                        <div className="book-now-container">
                            <h3>{t('readyToBook')}</h3>
                            <a href={flight.bookingUrl || '#'} target="_blank" rel="noopener noreferrer" className={`action-button book-now-button ${!flight.bookingUrl ? 'disabled' : ''}`}>Book Now ✈️</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FlightDetailModal;
