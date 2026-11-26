// src/services/api.js
// Client API for WVUSD SBAC Longitudinal Portal with verified Google id_token authentication

import { APPS_SCRIPT_URL } from '../config.js';

/**
 * Fetch SBAC dashboard data using a verified Google OAuth id_token via POST
 * @param {string} idToken
 * @param {string} fallbackName
 * @returns {Promise<{ user: object, students: Array }>}
 */
export async function fetchSbacData(idToken, fallbackName = '') {
  if (!APPS_SCRIPT_URL || !APPS_SCRIPT_URL.startsWith('http')) {
    throw new Error('Apps Script Web App URL is not configured.');
  }

  if (typeof idToken !== 'string' || idToken.trim().length <= 40 || idToken.includes('@')) {
    const error = new Error('Valid Google Sign-In id_token is required.');
    error.status = 'Forbidden';
    error.isForbidden = true;
    throw error;
  }

  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({
      id_token: idToken.trim()
    })
  });

  if (!response.ok) {
    throw new Error(`Server returned HTTP ${response.status}`);
  }

  const data = await response.json();

  // Handle explicit Forbidden / Unauthorized zero-trust response
  if (data && (data.status === 'Forbidden' || data.success === false)) {
    const error = new Error(data.message || data.error || 'Access Denied: Unauthorized request.');
    error.status = 'Forbidden';
    error.isForbidden = true;
    throw error;
  }

  if (data && data.error) {
    throw new Error(data.error);
  }

  if (!data || !data.user || !data.user.authorized) {
    const error = new Error('User is not authorized to access this portal.');
    error.status = 'Forbidden';
    error.isForbidden = true;
    throw error;
  }

  const verifiedUser = {
    ...data.user,
    name: data.user.name || fallbackName || (data.user.email ? data.user.email.split('@')[0] : 'Staff')
  };

  const fetchedStudents = Array.isArray(data.students) ? data.students : [];

  return {
    user: verifiedUser,
    students: fetchedStudents
  };
}
