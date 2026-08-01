import { supabase } from './supabase';

const BASE_URL = process.env.API_BASE_URL;

const REFERENCE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 60 * 1000;
const FLIGHT_CACHE_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map();
const pendingRequests = new Map();

const readCache = (key) => {
    const cached = memoryCache.get(key);
    if (cached && Date.now() - cached.savedAt < cached.ttl) return cached.value;

    try {
        const stored = JSON.parse(window.localStorage.getItem(`tunifly:${key}`));
        if (stored && Date.now() - stored.savedAt < stored.ttl) {
            memoryCache.set(key, stored);
            return stored.value;
        }
    } catch {
        // Caching is an enhancement; a blocked or malformed localStorage entry
        // must never prevent the request from succeeding.
    }

    return null;
};

const writeCache = (key, value, ttl, persist = false) => {
    const entry = { value, savedAt: Date.now(), ttl };
    memoryCache.set(key, entry);
    if (!persist) return;

    try {
        window.localStorage.setItem(`tunifly:${key}`, JSON.stringify(entry));
    } catch {
        // Ignore unavailable or full localStorage and retain the memory cache.
    }
};

const fetchCached = async (key, ttl, request, persist = false) => {
    const cached = readCache(key);
    if (cached !== null) return cached;

    const pending = pendingRequests.get(key);
    if (pending) return pending;

    const requestPromise = request()
        .then((result) => {
            writeCache(key, result, ttl, persist);
            return result;
        })
        .finally(() => pendingRequests.delete(key));
    pendingRequests.set(key, requestPromise);
    return requestPromise;
};

const authenticatedHeaders = async (includeJson = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Please continue with Google to manage price alerts.');

    return {
        ...(includeJson && { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${session.access_token}`,
    };
};

export const ping = async () => {
    try {
        const response = await fetch(`${BASE_URL}/ping`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error pinging API:', error);
        throw error;
    }
};

export const fetchAirlines = async () => {
    try {
        return await fetchCached('airlines', REFERENCE_CACHE_TTL_MS, async () => {
            const response = await fetch(`${BASE_URL}/airlines/`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        }, true);
    } catch (error) {
        console.error("Error fetching airlines:", error);
        throw error;
    }
};

export const fetchAirports = async () => {
    try {
        return await fetchCached('airports', REFERENCE_CACHE_TTL_MS, async () => {
            const response = await fetch(`${BASE_URL}/airports/`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        }, true);
    } catch (error) {
        console.error("Error fetching airports:", error);
        throw error;
    }
};

export const searchFlights = async (searchParams) => {
    const params = new URLSearchParams();
    if (searchParams.departureAirportCodes && searchParams.departureAirportCodes.length > 0) {
        searchParams.departureAirportCodes.forEach(code => params.append('departureAirportCodes', code));
    }
    if (searchParams.arrivalAirportCodes && searchParams.arrivalAirportCodes.length > 0) {
        searchParams.arrivalAirportCodes.forEach(code => params.append('arrivalAirportCodes', code));
    }
    if (searchParams.startDate) {
        params.append('startDate', searchParams.startDate);
    }
    if (searchParams.endDate) {
        params.append('endDate', searchParams.endDate);
    }
    if (searchParams.airlineCodes && searchParams.airlineCodes.length > 0) {
        searchParams.airlineCodes.forEach(code => params.append('airlineCodes', code));
    }
    if (searchParams.limit !== undefined) {
        params.append('limit', searchParams.limit);
    }
    if (searchParams.offset !== undefined) {
        params.append('offset', searchParams.offset);
    }

    const queryString = params.toString();

    try {
        return await fetchCached(`flight-search:${queryString}`, SEARCH_CACHE_TTL_MS, async () => {
            const response = await fetch(`${BASE_URL}/flights/?${queryString}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
    } catch (error) {
        console.error("Error searching flights:", error);
        throw error;
    }
};

export const fetchFlightById = async (flightId) => {
    try {
        return await fetchCached(`flight:${flightId}`, FLIGHT_CACHE_TTL_MS, async () => {
            const response = await fetch(`${BASE_URL}/flights/${flightId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        });
    } catch (error) {
        console.error(`Error fetching flight ${flightId}:`, error);
        throw error;
    }
};

export const fetchPriceHistory = async (flightId) => {
    try {
        const response = await fetch(`${BASE_URL}/price-history/flight/${flightId}`);
        if (!response.ok) {
            if (response.status === 404) {
                return [];
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching price history for flight ${flightId}:`, error);
        throw error;
    }
};

export const fetchCurrentUser = async () => {
    try {
        const response = await fetch(`${BASE_URL}/users/me`, {
            headers: await authenticatedHeaders(),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching current user:', error);
        throw error;
    }
};

export const updateCurrentUser = async (enabled) => {
    try {
        const response = await fetch(`${BASE_URL}/users/me`, {
            method: 'PUT',
            headers: await authenticatedHeaders(true),
            body: JSON.stringify({ enableNotificationsSetting: enabled }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error updating current user notification setting:', error);
        throw error;
    }
};

export const fetchSubscriptions = async () => {
    try {
        const response = await fetch(`${BASE_URL}/subscriptions/`, {
            headers: await authenticatedHeaders(),
        });
        if (!response.ok) {
            if (response.status === 404) {
                return [];
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        throw error;
    }
};

export const fetchSubscriptionByFlight = async (flightId) => {
    if (!flightId) return null;
    try {
        const response = await fetch(`${BASE_URL}/subscriptions/flight/${flightId}`, {
            headers: await authenticatedHeaders(),
        });
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching subscription for flight ${flightId}:`, error);
        return null;
    }
};

export const createSubscription = async (subscriptionData) => {
    try {
        const payload = {
            flightId: subscriptionData.flightId,
            targetPrice: subscriptionData.targetPrice,
            ...(subscriptionData.isActive !== undefined && { isActive: subscriptionData.isActive }),
        };

        const response = await fetch(`${BASE_URL}/subscriptions/`, {
            method: 'POST',
            headers: await authenticatedHeaders(true),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error creating subscription:", error);
        throw error;
    }
};

export const updateSubscription = async (subscriptionId, subscriptionData) => {
    try {
        const payload = Object.fromEntries(
            Object.entries({
                flightId: subscriptionData.flightId,
                targetPrice: subscriptionData.targetPrice,
                isActive: subscriptionData.isActive,
                enableEmailNotifications: subscriptionData.enableEmailNotifications,
            }).filter(([, value]) => value !== undefined)
        );

        const response = await fetch(`${BASE_URL}/subscriptions/${subscriptionId}`, {
            method: 'PUT',
            headers: await authenticatedHeaders(true),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error updating subscription ${subscriptionId}:`, error);
        throw error;
    }
};

export const deleteSubscription = async (subscriptionId) => {
    try {
        const response = await fetch(`${BASE_URL}/subscriptions/${subscriptionId}`, {
            method: 'DELETE',
            headers: await authenticatedHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error deleting subscription ${subscriptionId}:`, error);
        throw error;
    }
};
