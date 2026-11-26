// src/utils/authStorage.js
// WVUSD SBAC Portal - Authentication Persistence & Storage Guard Utilities
import { jwtDecode } from 'jwt-decode';
import { isValidWvusdEmail } from '../config.js';

export const STORAGE_KEYS = {
  USER: 'wvusd_sbac_user',
  CREDENTIAL: 'wvusd_sbac_credential',
  STUDENTS: 'wvusd_sbac_students',
  SESSION_COOKIE: 'wvusd_sbac_session'
};

/**
 * Cookie retrieval helper
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Cookie setter helper
 */
export function setCookie(name, value, days = 7) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Cookie removal helper
 */
export function removeCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Persists user session in active sessionStorage
 */
export function saveUserSession(user, rawCredential = null) {
  if (!user || !user.email) return;

  const serialized = JSON.stringify(user);

  try {
    sessionStorage.setItem(STORAGE_KEYS.USER, serialized);
  } catch (err) {
    console.warn('Unable to persist user to sessionStorage:', err);
  }

  if (rawCredential) {
    try {
      sessionStorage.setItem(STORAGE_KEYS.CREDENTIAL, rawCredential);
    } catch (err) {
      console.warn('Unable to persist raw credential to sessionStorage:', err);
    }
  }
}

/**
 * Completely clears all stored session credentials, tokens, and cached datasets
 */
export function clearUserSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.CREDENTIAL);
    localStorage.removeItem(STORAGE_KEYS.STUDENTS);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.CREDENTIAL);
    sessionStorage.removeItem(STORAGE_KEYS.STUDENTS);
    removeCookie(STORAGE_KEYS.SESSION_COOKIE);
    removeCookie(STORAGE_KEYS.CREDENTIAL);
  } catch (err) {
    console.warn('Error clearing storage:', err);
  }
}

/**
 * Validates and extracts a stored session from active sessionStorage.
 * Strictly verifies active @wvusd.org session state.
 * Never auto-bypasses authentication from persistent localStorage or cookies.
 */
export function getStoredSession() {
  // Check for active user object in sessionStorage
  const checkUserJson = (jsonStr) => {
    if (!jsonStr) return null;
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.email && isValidWvusdEmail(parsed.email)) {
        if (parsed.authorized !== false) {
          return {
            user: parsed,
            email: parsed.email.toLowerCase().trim(),
            name: parsed.name || parsed.email.split('@')[0],
            source: 'sessionStorage'
          };
        }
      }
    } catch {
      return null;
    }
    return null;
  };

  try {
    const credSession = checkCredentialToken(sessionStorage.getItem(STORAGE_KEYS.CREDENTIAL));
    if (credSession) {
      const sessionUser = checkUserJson(sessionStorage.getItem(STORAGE_KEYS.USER));
      return {
        ...credSession,
        user: sessionUser ? sessionUser.user : null
      };
    }
  } catch (err) {
    console.warn('Error reading sessionStorage credential:', err);
  }

  // No active session in memory / sessionStorage -> return null to force Google Sign-In prompt
  return null;
}
