import axios from 'axios';

export const API_BASE_URL =
  (process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function extractApiError(error, fallbackMessage = 'Something went wrong. Please try again.') {
  if (!error) {
    return fallbackMessage;
  }

  if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
    return 'The request timed out before the server responded. Please try again.';
  }

  if (!error.response) {
    return 'Unable to reach the TruthLens backend server. Confirm the Django API is running.';
  }

  const { status, data } = error.response;

  if (data && typeof data === 'object') {
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }
    if (typeof data.detail === 'string' && data.detail.trim()) {
      return data.detail;
    }
    for (const key of ['user_news', 'message', 'answer', 'id', 'non_field_errors']) {
      const val = data[key];
      if (Array.isArray(val) && val.length > 0) {
        return String(val[0]);
      }
      if (typeof val === 'string' && val.trim()) {
        return val;
      }
    }
  }

  if (status === 429) {
    return 'Rate limit or quota reached. Please wait a moment and try again.';
  }
  if (status >= 500) {
    return `Server error (HTTP ${status}). Please try again shortly.`;
  }

  return fallbackMessage;
}
