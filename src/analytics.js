import posthog from 'posthog-js';

const key = import.meta.env.VITE_POSTHOG_KEY;
let ready = false;

export function initAnalytics() {
  if (!key) return; // analytics disabled when no key is set
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only', // anonymous visitors only
    capture_pageview: true,
  });
  ready = true;
}

export function track(event, props = {}) {
  if (ready) posthog.capture(event, props);
}

export const analyticsEnabled = Boolean(key);
