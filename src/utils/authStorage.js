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
 * Persists user session across localStorage, sessionStorage, and cookies
 */
export function saveUserSession(user, rawCredential = null) {
  if (!user || !user.email) return;

  const serialized = JSON.stringify(user);

  try {
    localStorage.setItem(STORAGE_KEYS.USER, serialized);
    sessionStorage.setItem(STORAGE_KEYS.USER, serialized);
    setCookie(STORAGE_KEYS.SESSION_COOKIE, serialized, 7);
  } catch (err) {
    console.warn('Unable to persist user session:', err);
  }

  if (rawCredential) {
    try {
      localStorage.setItem(STORAGE_KEYS.CREDENTIAL, rawCredential);
      sessionStorage.setItem(STORAGE_KEYS.CREDENTIAL, rawCredential);
      setCookie(STORAGE_KEYS.CREDENTIAL, rawCredential, 7);
    } catch (err) {
      console.warn('Unable to persist raw credential:', err);
    }
  }
}

/**
 * Persists cached students in storage with quota safety
 */
export function saveCachedStudents(students) {
  if (!Array.isArray(students) || students.length === 0) return;
  try {
    const serialized = JSON.stringify(students);
    try {
      sessionStorage.setItem(STORAGE_KEYS.STUDENTS, serialized);
    } catch {
      // Session storage quota might be hit
    }
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, serialized);
    } catch {
      console.warn('LocalStorage quota exceeded for student dataset');
    }
  } catch (err) {
    console.warn('Failed to serialize cached students:', err);
  }
}

/**
 * Retrieves cached students from storage
 */
export function getCachedStudents() {
  try {
    const fromSession = sessionStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (fromSession) {
      const parsed = JSON.parse(fromSession);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }

  try {
    const fromLocal = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (fromLocal) {
      const parsed = JSON.parse(fromLocal);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }

  return [];
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
 * Validates and extracts a stored session from localStorage, sessionStorage, or session cookies.
 * Verifies validity, token expiry, and domain restrictions.
 */
export function getStoredSession() {
  // 1. Check for stored user object in sessionStorage or localStorage
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
            source: 'stored_user'
          };
        }
      }
    } catch {
      return null;
    }
    return null;
  };

  try {
    const sessionUser = checkUserJson(sessionStorage.getItem(STORAGE_KEYS.USER));
    if (sessionUser) return sessionUser;
  } catch {
    // ignore
  }

  try {
    const localUser = checkUserJson(localStorage.getItem(STORAGE_KEYS.USER));
    if (localUser) return localUser;
  } catch {
    // ignore
  }

  // 2. Check for cookie session
  try {
    const cookieUser = checkUserJson(getCookie(STORAGE_KEYS.SESSION_COOKIE));
    if (cookieUser) return cookieUser;
  } catch {
    // ignore
  }

  // 3. Check for raw Google ID token (JWT) in sessionStorage, localStorage, or cookie
  const checkCredentialToken = (token) => {
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      if (!decoded || !decoded.email) return null;

      // Check token expiration (exp is in seconds)
      if (decoded.exp && (decoded.exp * 1000) <= Date.now()) {
        console.warn('Stored Google credential has expired');
        return null;
      }

      const email = decoded.email.toLowerCase().trim();
      if (!isValidWvusdEmail(email)) {
        console.warn('Stored Google credential domain is not authorized');
        return null;
      }

      return {
        email,
        name: decoded.name || email.split('@')[0],
        credential: token,
        source: 'credential_token'
      };
    } catch {
      return null;
    }
  };

  try {
    const credSession = checkCredentialToken(sessionStorage.getItem(STORAGE_KEYS.CREDENTIAL));
    if (credSession) return credSession;
  } catch {
    // ignore
  }

  try {
    const credLocal = checkCredentialToken(localStorage.getItem(STORAGE_KEYS.CREDENTIAL));
    if (credLocal) return credLocal;
  } catch {
    // ignore
  }

  try {
    const credCookie = checkCredentialToken(getCookie(STORAGE_KEYS.CREDENTIAL));
    if (credCookie) return credCookie;
  } catch {
    // ignore
  }

  return null;
}
