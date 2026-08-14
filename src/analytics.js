import posthog from 'posthog-js';

const posthogKey = process.env.REACT_APP_POSTHOG_KEY;

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
  });
}

export const capture = (event, properties) => {
  if (posthogKey) posthog.capture(event, properties);
};

export const capturePageView = (path) => {
  capture('$pageview', { path });
};
