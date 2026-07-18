import { memo, useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import FlightDetailModal from './FlightDetailModal';
import { fetchAirports } from './api';
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
import { format as dateFormatFns, parseISO } from 'date-fns';
import { useLanguage } from './i18n';

import tuLogo from './assets/tu_logo.png';
import bjLogo from './assets/bj_logo.png';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

const airlineIconSources = {
    TU: tuLogo,
    BJ: bjLogo,
};

const getFlightsPerPage = () => {
    if (window.innerWidth <= 640) return 4;
    if (window.innerWidth <= 900) return 6;
    return 9;
};

const FlightResultsDisplay = ({ theme, groupedFlights, airlines, isAuthenticated, userSubscriptions, setUserSubscriptions, showToast }) => {
    const { t, language } = useLanguage();
    const isRtl = language === 'ar';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [allAirports, setAllAirports] = useState([]);
    const [chartPages, setChartPages] = useState({});
    const [loadedIcons, setLoadedIcons] = useState({});
    const [flightsPerPage, setFlightsPerPage] = useState(getFlightsPerPage);
    const [isSmallScreen, setIsSmallScreen] = useState(() => window.innerWidth <= 640);
    const loadedIconCount = Object.keys(loadedIcons).length;

    const isDarkTheme = theme === 'dark';
    const chartTitleColor = isDarkTheme ? '#ffffff' : '#333333';
    const axisTitleColor = isDarkTheme ? '#b0b0b0' : '#555555';
    const axisTickColor = isDarkTheme ? '#909090' : '#777777';
    const gridLineColor = isDarkTheme ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';

    const lowPriceBarColor = '#28a745';
    const averagePriceBarColor = '#ffc107';
    const highPriceBarColor = '#dc3545';

    const getPriceBarColor = useCallback((flight) => {
        const { priceEur, minPrice, maxPrice } = flight;
        const priceRange = maxPrice - minPrice;

        if (minPrice == null || maxPrice == null || priceRange <= 0) {
            return averagePriceBarColor;
        }

        const lowThreshold = minPrice + (priceRange * 0.25);
        const highThreshold = minPrice + (priceRange * 0.75);

        if (priceEur < lowThreshold) {
            return lowPriceBarColor;
        }
        if (priceEur > highThreshold) {
            return highPriceBarColor;
        }
        return averagePriceBarColor;
    }, []);

    useEffect(() => {
        const imageObjects = {};
        const promises = Object.entries(airlineIconSources).map(([code, src]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    imageObjects[code] = img;
                    resolve();
                };
                img.onerror = () => resolve();
            });
        });

        Promise.all(promises).then(() => {
            setLoadedIcons(imageObjects);
        });
    }, []);

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

    useEffect(() => {
        const loadAirports = async () => {
            try {
                const airports = await fetchAirports();
                setAllAirports(airports);
            } catch (err) {
                console.error("Failed to load airports for chart titles:", err);
            }
        };
        loadAirports();
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setFlightsPerPage(getFlightsPerPage());
            setIsSmallScreen(window.innerWidth <= 640);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const initialPages = {};
        Object.keys(groupedFlights).forEach(route => {
            initialPages[route] = 0;
        });
        setChartPages(initialPages);
    }, [groupedFlights, flightsPerPage]);

    const handleFlightClick = (flight) => {
        setSelectedFlight(flight);
        setIsModalOpen(true);
    };

    const handlePageChange = (route, newPage) => {
        setChartPages(prevPages => ({
            ...prevPages,
            [route]: newPage,
        }));
    };

    return (
        <>
            <div className="flight-results-container">
                <h2>
                    {t('trends')}
                    <span className="click-details-text"> {t('clickDetails')}</span>
                </h2>
                <div className="results-grid">
                    {Object.keys(groupedFlights).sort().map(route => {
                        const flightsForRoute = groupedFlights[route];
                        const sortedFlights = [...flightsForRoute].sort((a, b) => new Date(a.departureDate) - new Date(b.departureDate));

                        const currentPage = chartPages[route] || 0;
                        const totalPages = Math.ceil(sortedFlights.length / flightsPerPage);
                        const startIndex = currentPage * flightsPerPage;
                        const paginatedFlights = sortedFlights.slice(startIndex, startIndex + flightsPerPage);

                        const labels = paginatedFlights.map(f => f.departureDate.split('T')[0]);
                        const prices = paginatedFlights.map(f => f.priceEur);
                        const priceBarColors = paginatedFlights.map(getPriceBarColor);

                        const [depCode, arrCode] = route.split('-');
                        const depName = getAirportDisplayName(depCode);
                        const arrName = getAirportDisplayName(arrCode);
                        const chartRouteTitle = `${depName} → ${arrName}`;

                        const logoHitAreas = [];
                        const iconPlugin = {
                            id: 'customIcons',
                            afterDatasetsDraw(chart, args, options) {
                                const { ctx } = chart;
                                logoHitAreas.length = 0;
                                ctx.save();
                                const meta = chart.getDatasetMeta(0);
                                meta.data.forEach((element, index) => {
                                    const flight = paginatedFlights[index];
                                    if (!flight) return;

                                    const code = flight.airlineCode?.toUpperCase();
                                    const icon = loadedIcons[code];

                                    if (icon) {
                                        const logoPadding = 4;
                                        const logoCardWidth = element.width * 0.9;
                                        const logoCardHeight = logoCardWidth * 0.55;
                                        const logoCardX = element.x - (logoCardWidth / 2);
                                        const logoCardY = Math.max(
                                            chart.chartArea.top + logoPadding,
                                            element.y - logoCardHeight - 4
                                        );
                                        const availableWidth = logoCardWidth - (logoPadding * 2);
                                        const availableHeight = logoCardHeight - (logoPadding * 2);
                                        const logoScale = Math.min(availableWidth / icon.width, availableHeight / icon.height);
                                        const logoWidth = icon.width * logoScale;
                                        const logoHeight = icon.height * logoScale;
                                        const x = element.x - (logoWidth / 2);
                                        const y = logoCardY + ((logoCardHeight - logoHeight) / 2);

                                        ctx.fillStyle = isDarkTheme ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.98)';
                                        ctx.beginPath();
                                        ctx.roundRect(
                                            logoCardX,
                                            logoCardY,
                                            logoCardWidth,
                                            logoCardHeight,
                                            4
                                        );
                                        ctx.fill();
                                        ctx.drawImage(icon, x, y, logoWidth, logoHeight);
                                        logoHitAreas.push({
                                            flight,
                                            left: logoCardX,
                                            right: logoCardX + logoCardWidth,
                                            top: logoCardY,
                                            bottom: logoCardY + logoCardHeight,
                                        });
                                    }
                                });
                                ctx.restore();
                            },
                            afterEvent(chart, args) {
                                if (args.event.type !== 'click') return;

                                const logoHitArea = logoHitAreas.find(({ left, right, top, bottom }) =>
                                    args.event.x >= left && args.event.x <= right &&
                                    args.event.y >= top && args.event.y <= bottom
                                );

                                if (logoHitArea) handleFlightClick(logoHitArea.flight);
                            }
                        };

                        const data = {
                            labels: labels,
                            datasets: [{
                                label: t('currentPrice'),
                                data: prices,
                                backgroundColor: priceBarColors,
                                borderColor: priceBarColors,
                                borderWidth: 1,
                                maxBarThickness: 100,
                                datalabels: {
                                    display: true,
                                    labels: {
                                        currentPrice: {
                                            display: true,
                                            anchor: 'center',
                                            align: 'center',
                                            offset: 0,
                                            color: 'white',
                                            font: { weight: 'bold', size: isSmallScreen ? 12 : 18 },
                                            formatter: (value, context) => {
                                                const flight = paginatedFlights[context.dataIndex];
                                                const isSubscribed = userSubscriptions.some(sub => sub.flightId === flight.id);
                                                if (isSmallScreen) {
                                                    return `€ ${value.toFixed(0)}${isSubscribed ? ' ★' : ''}`;
                                                }
                                                return `€${value.toFixed(0)} ${isSubscribed ? '★' : ''}`;
                                            }
                                        }
                                    }
                                }
                            }],
                        };

                        const options = {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: {
                                paddingTop: 70
                            },
                            onClick: (event, elements) => {
                                let clickedFlight;
                                if (elements.length > 0) {
                                    const clickedElement = elements[0];
                                    if (clickedElement.datasetIndex === 0) {
                                        clickedFlight = paginatedFlights[clickedElement.index];
                                    }
                                }

                                if (clickedFlight) handleFlightClick(clickedFlight);
                            },
                            plugins: {
                                title: {
                                    display: true,
                                    text: `${t('pricesForRoute')} ${chartRouteTitle}`,
                                    color: chartTitleColor,
                                    font: { size: 20, weight: 'bold' },
                                    padding: { top: 10, bottom: 40 }
                                },
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: (context) => {
                                            const flight = paginatedFlights[context.dataIndex];
                                            const isSubscribed = userSubscriptions.some(sub => sub.flightId === flight.id);
                                            let tooltipText = `Price: €${context.parsed.y.toFixed(0)}`;
                                            if (isSubscribed) tooltipText += ' ★';
                                            return tooltipText;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    type: 'category',
                                    title: { display: true, text: t('departureDate'), color: axisTitleColor, font: { size: 14 } },
                                    ticks: {
                                        color: axisTickColor, font: { size: 13 },
                                        callback: function (value) {
                                            const date = parseISO(this.getLabelForValue(value));
                                            return !isNaN(date.getTime()) ? dateFormatFns(date, 'dd MMM') : '';
                                        }
                                    },
                                    grid: { color: gridLineColor }
                                },
                                y: {
                                    title: { display: true, text: t('priceEur'), color: axisTitleColor, font: { size: 14 } },
                                    ticks: { color: axisTickColor, font: { size: 13 } },
                                    grid: { color: gridLineColor },
                                    beginAtZero: true,
                                },
                            },
                        };

                        return (
                            <div key={route} className="chart-card">
                                <div className="chart-plot" dir="ltr">
                                    {paginatedFlights.length > 0 ? (
                                        <Bar key={`${route}-${loadedIconCount}`} data={data} options={options} plugins={[iconPlugin, ChartDataLabels]} />
                                    ) : (
                                        <p className="info-message">{t('noRouteData')}</p>
                                    )}
                                </div>
                                {totalPages > 1 && (
                                    <div className={`chart-navigation ${isRtl ? 'chart-navigation-rtl' : ''}`} dir="ltr">
                                        <button onClick={() => handlePageChange(route, currentPage - 1)} disabled={currentPage === 0}>
                                            {isRtl ? '→' : '←'}
                                        </button>
                                        <span>{t('page', { current: currentPage + 1, total: totalPages })}</span>
                                        <button onClick={() => handlePageChange(route, currentPage + 1)} disabled={currentPage >= totalPages - 1}>
                                            {isRtl ? '←' : '→'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {isModalOpen && (
                <FlightDetailModal
                    theme={theme}
                    flight={selectedFlight}
                    onClose={() => setIsModalOpen(false)}
                    airlines={airlines}
                    isAuthenticated={isAuthenticated}
                    userSubscriptions={userSubscriptions}
                    setUserSubscriptions={setUserSubscriptions}
                    showToast={showToast}
                />
            )}
        </>
    );
};

export default memo(FlightResultsDisplay);
