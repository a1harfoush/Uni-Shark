// src/lib/error-tracker.ts

export function initializeErrorTracker() {
  if (typeof window === 'undefined') {
    return;
  }

  const originalOnError = window.onerror;

  window.onerror = (message, source, lineno, colno, error) => {
    // Suppress Sentry-related errors
    if (typeof message === 'string' && message.includes('sentry')) {
      console.warn('Sentry error suppressed:', { message, source, lineno, colno, error });
      return true; // Prevents the default browser error handling
    }

    // Call the original error handler, if it exists
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }

    return false; // Allows the default browser error handling to continue
  };
}